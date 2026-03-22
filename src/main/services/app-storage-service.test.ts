import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../../shared/app-state.js';
import { seedState, updateConversationActionPreviewReview } from '../../shared/app-state.js';
import type { AiObservabilitySnapshot, AiProviderHealthCheckResult, AiRequest, AiResult, AiRuntimeSummaryItem } from '../../shared/ai-service.js';
import { createPlanSnapshot } from '../../shared/plan-draft.js';
import { createDatabase } from '../db/client.js';
import { appSnapshots } from '../db/schema.js';
import { AiRequestLogRepository } from '../repositories/ai-request-log-repository.js';
import { AppStateRepository } from '../repositories/app-state-repository.js';
import { EntitiesRepository } from '../repositories/entities-repository.js';
import { ProviderSecretRepository } from '../repositories/provider-secret-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import { AppStorageService } from './app-storage-service.js';

function cloneState(overrides?: Partial<AppState>): AppState {
  return {
    ...JSON.parse(JSON.stringify(seedState)) as AppState,
    ...overrides,
  };
}

function createRuntimeSummary(settings: AppState['settings']): AiRuntimeSummaryItem[] {
  const routes: Array<AiRuntimeSummaryItem['capability']> = [
    'profile_extraction',
    'plan_generation',
    'plan_adjustment',
    'reflection_summary',
    'chat_general',
  ];

  const routeKeyByCapability = {
    profile_extraction: 'profileExtraction',
    plan_generation: 'planGeneration',
    plan_adjustment: 'planAdjustment',
    reflection_summary: 'reflectionSummary',
    chat_general: 'generalChat',
  } as const;

  return routes.map((capability) => {
    const routeKey = routeKeyByCapability[capability];
    const providerId = settings.routing[routeKey];
    const provider = settings.providers.find((item) => item.id === providerId);
    const ready = Boolean(
      provider
      && provider.enabled
      && provider.capabilityTags.includes(capability)
      && (provider.authMode === 'none' || provider.hasSecret),
    );

    return {
      capability,
      providerId,
      providerLabel: provider?.label ?? providerId,
      model: provider?.model ?? 'unknown',
      ready,
      healthStatus: provider?.healthStatus ?? 'unknown',
      blockedReason: ready
        ? undefined
        : (!provider
          ? '缺少 Provider 配置'
          : (!provider.enabled
            ? 'Provider 未启用'
            : (!provider.capabilityTags.includes(capability)
              ? 'Provider 未声明该 capability'
              : '缺少 Secret'))),
    } satisfies AiRuntimeSummaryItem;
  });
}

function createHarness(options: {
  snapshotState?: AppState;
  bootstrapSeedState?: boolean;
  aiExecute?: (settings: AppState['settings'], request: AiRequest) => Promise<AiResult>;
  aiCheckHealth?: (settings: AppState['settings'], providerId: AppState['settings']['providers'][number]['id']) => Promise<AiProviderHealthCheckResult>;
} = {}) {
  const { snapshotState, bootstrapSeedState = true, aiExecute, aiCheckHealth } = options;
  const { db } = createDatabase(':memory:');
  const appStateRepository = new AppStateRepository(db);
  const entitiesRepository = new EntitiesRepository(db);
  const providerSecretRepository = new ProviderSecretRepository(db);
  const settingsRepository = new SettingsRepository(db);

  const initialSnapshot = snapshotState ?? (bootstrapSeedState ? cloneState() : undefined);
  if (initialSnapshot) {
    appStateRepository.saveRaw(initialSnapshot);
  }

  const service = new AppStorageService(
    appStateRepository,
    entitiesRepository,
    settingsRepository,
    providerSecretRepository,
    new AiRequestLogRepository(db),
    {
      getRuntimeSummary: (settings) => createRuntimeSummary(settings),
      checkProviderHealth: aiCheckHealth ?? (async (_settings, providerId) => ({
        providerId,
        providerLabel: providerId,
        healthStatus: 'unknown',
        message: 'not used in this test',
        checkedAt: new Date().toISOString(),
      })),
      execute: aiExecute ?? (async () => {
        throw new Error('execute is not used in this test');
      }),
    },
  );

  return {
    db,
    service,
    entitiesRepository,
    settingsRepository,
  };
}

class FailingSettingsRepository extends SettingsRepository {
  override saveSettings(settings: AppState['settings']) {
    super.saveSettings(settings);
    throw new Error('模拟 settings 持久化失败');
  }
}

class ArmableFailingAppStateRepository extends AppStateRepository {
  private savesBeforeFailure: number | null = null;

  armFailureAfterSuccessfulSaves(count: number) {
    this.savesBeforeFailure = count;
  }

  override save(state: AppState) {
    const saved = super.save(state);

    if (this.savesBeforeFailure === null) {
      return saved;
    }

    if (this.savesBeforeFailure === 0) {
      this.savesBeforeFailure = null;
      throw new Error('模拟快照持久化失败');
    }

    this.savesBeforeFailure -= 1;
    return saved;
  }
}

function createPersistenceFailureHarness(options: {
  snapshotState?: AppState;
  aiExecute?: (settings: AppState['settings'], request: AiRequest) => Promise<AiResult>;
  aiCheckHealth?: (settings: AppState['settings'], providerId: AppState['settings']['providers'][number]['id']) => Promise<AiProviderHealthCheckResult>;
  failOn: 'settings' | 'snapshot';
}): {
  service: AppStorageService;
  failingAppStateRepository: ArmableFailingAppStateRepository;
} {
  const { snapshotState, aiExecute, aiCheckHealth, failOn } = options;
  const { db } = createDatabase(':memory:');
  const seedAppStateRepository = new AppStateRepository(db);
  const providerSecretRepository = new ProviderSecretRepository(db);
  const aiService = {
    getRuntimeSummary: (settings: AppState['settings']) => createRuntimeSummary(settings),
    checkProviderHealth: aiCheckHealth ?? (async (_settings, providerId: AppState['settings']['providers'][number]['id']) => ({
      providerId,
      providerLabel: providerId,
      healthStatus: 'unknown' as const,
      message: 'not used in this test',
      checkedAt: new Date().toISOString(),
    })),
    execute: aiExecute ?? (async () => {
      throw new Error('execute is not used in this test');
    }),
  };

  const initialSnapshot = snapshotState ?? cloneState();
  if (initialSnapshot) {
    seedAppStateRepository.saveRaw(initialSnapshot);
  }

  const bootstrapService = new AppStorageService(
    seedAppStateRepository,
    new EntitiesRepository(db),
    new SettingsRepository(db),
    providerSecretRepository,
    new AiRequestLogRepository(db),
    aiService,
  );
  bootstrapService.initialize();

  const failingAppStateRepository = new ArmableFailingAppStateRepository(db);
  const service = new AppStorageService(
    failingAppStateRepository,
    new EntitiesRepository(db),
    failOn === 'settings' ? new FailingSettingsRepository(db) : new SettingsRepository(db),
    new ProviderSecretRepository(db),
    new AiRequestLogRepository(db),
    aiService,
  );

  return {
    service,
    failingAppStateRepository,
  };
}

function getPersistedSnapshotPayload(db: ReturnType<typeof createDatabase>['db']) {
  const row = db.select().from(appSnapshots).get();
  assert.ok(row);
  return JSON.parse(row.payload) as Record<string, unknown>;
}

function toPersistedJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

test('initialize migrates snapshot settings into structured settings tables', () => {
  const snapshot = cloneState({
    settings: {
      ...seedState.settings,
      theme: '浅色主题',
      startPage: '计划页',
      providers: seedState.settings.providers.map((provider) => (
        provider.id === 'openai'
          ? { ...provider, label: 'OpenAI / GPT 备用', model: 'gpt-4.1', enabled: false }
          : provider
      )),
      routing: {
        ...seedState.settings.routing,
        planGeneration: 'glm',
      },
    },
  });
  const { service, settingsRepository } = createHarness({ snapshotState: snapshot });

  service.initialize();

  const persistedSettings = settingsRepository.loadSettings();
  assert.ok(persistedSettings);
  assert.equal(persistedSettings.theme, '浅色主题');
  assert.equal(persistedSettings.startPage, '计划页');
  assert.equal(persistedSettings.routing.planGeneration, 'glm');
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'openai')?.label, 'OpenAI / GPT 备用');
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'openai')?.enabled, false);
});

test('initialize rewrites legacy full snapshots into a reduced conversation snapshot payload', () => {
  const snapshot = cloneState({
    conversation: {
      ...seedState.conversation,
      title: 'Phase 5 数据边界收敛',
      suggestions: ['采纳：先明确 snapshot 与结构化表的最终边界'],
    },
  });
  const { service, db } = createHarness({ snapshotState: snapshot });

  const initializedState = service.initialize();

  const payload = getPersistedSnapshotPayload(db);
  const persistedConversation = payload.conversation as AppState['conversation'];
  assert.equal(payload.version, 2);
  assert.deepEqual(persistedConversation, toPersistedJson(initializedState.conversation));
  assert.equal('profile' in payload, false);
  assert.equal('goals' in payload, false);
  assert.equal('plan' in payload, false);
  assert.equal('settings' in payload, false);
  assert.equal('reflection' in payload, false);
  assert.equal('dashboard' in payload, false);
});

test('initialize uses a real empty first-run state when no persisted data exists', () => {
  const { service, entitiesRepository } = createHarness({ bootstrapSeedState: false });

  const initializedState = service.initialize();

  assert.equal(initializedState.profile.identity, '');
  assert.equal(initializedState.goals.length, 0);
  assert.equal(initializedState.plan.activeGoalId, '');
  assert.equal(initializedState.plan.drafts.length, 0);
  assert.equal(initializedState.plan.snapshots.length, 0);
  assert.equal(initializedState.conversation.messages.length, 0);
  assert.equal(initializedState.conversation.relatedGoal, '暂未设置目标');
  assert.equal(initializedState.conversation.relatedPlan, '暂无计划草案');
  assert.equal((initializedState.dashboard as AppState['dashboard'] & { onboarding?: { active?: boolean } }).onboarding?.active, true);

  const persistedProfile = entitiesRepository.loadUserProfile();
  assert.ok(persistedProfile);
  assert.equal(persistedProfile.identity, '');
});

test('saveAppState persists provider configs and routing into structured settings', () => {
  const { service, settingsRepository } = createHarness();
  service.initialize();

  const nextState = cloneState({
    settings: {
      ...seedState.settings,
      theme: '纸感主题',
      startPage: '设置页',
      providers: seedState.settings.providers.map((provider) => (
        provider.id === 'deepseek'
          ? { ...provider, enabled: true, model: 'deepseek-reasoner', healthStatus: 'ready' }
          : provider
      )),
      routing: {
        ...seedState.settings.routing,
        planGeneration: 'deepseek',
        reflectionSummary: 'openai',
      },
    },
  });

  service.saveAppState(nextState);

  const persistedSettings = settingsRepository.loadSettings();
  assert.ok(persistedSettings);
  assert.equal(persistedSettings.theme, '纸感主题');
  assert.equal(persistedSettings.startPage, '设置页');
  assert.equal(persistedSettings.routing.planGeneration, 'deepseek');
  assert.equal(persistedSettings.routing.reflectionSummary, 'openai');
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'deepseek')?.enabled, true);
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'deepseek')?.model, 'deepseek-reasoner');
});

test('saveAppState stores only conversation state in app_snapshots payload', () => {
  const { service, db } = createHarness();
  const initialState = service.initialize();

  const nextState = cloneState({
    ...initialState,
    conversation: {
      ...initialState.conversation,
      title: '继续收敛 Phase 5 / Task 1',
      tags: ['数据层', 'snapshot'],
      messages: [
        ...initialState.conversation.messages,
        { id: 'm4', role: 'assistant', content: '下一步开始把 snapshot 收缩到只保存对话会话态。' },
      ],
      suggestions: ['采纳：保留对话态，其余字段以结构化表为真源'],
    },
  });

  const persistedState = service.saveAppState(nextState);

  const payload = getPersistedSnapshotPayload(db);
  const persistedConversation = payload.conversation as AppState['conversation'];
  assert.equal(payload.version, 2);
  assert.deepEqual(persistedConversation, toPersistedJson(persistedState.conversation));
  assert.equal('profile' in payload, false);
  assert.equal('goals' in payload, false);
  assert.equal('plan' in payload, false);
  assert.equal('settings' in payload, false);
  assert.equal('reflection' in payload, false);
  assert.equal('dashboard' in payload, false);
});

test('removeLearningGoal rolls back goal and plan deletion when persistence fails mid-flight', () => {
  const { service } = createPersistenceFailureHarness({ failOn: 'settings' });
  const initialState = service.loadAppState();
  const goalId = initialState.plan.activeGoalId;

  assert.ok(goalId);
  assert.equal(initialState.goals.length > 1, true);

  assert.throws(
    () => service.removeLearningGoal(goalId),
    /模拟 settings 持久化失败/,
  );

  const persistedState = service.loadAppState();
  assert.deepEqual(
    persistedState.goals.map((goal) => goal.id),
    initialState.goals.map((goal) => goal.id),
  );
  assert.deepEqual(
    persistedState.plan.drafts.map((draft) => draft.goalId),
    initialState.plan.drafts.map((draft) => draft.goalId),
  );
  assert.deepEqual(
    persistedState.plan.snapshots.map((snapshot) => snapshot.goalId),
    initialState.plan.snapshots.map((snapshot) => snapshot.goalId),
  );
  assert.equal(persistedState.plan.activeGoalId, initialState.plan.activeGoalId);
});

test('saveLearningPlanDraft rolls back reordered tasks when snapshot persistence fails', () => {
  const { service, failingAppStateRepository } = createPersistenceFailureHarness({ failOn: 'snapshot' });
  const initialState = service.loadAppState();
  const draft = initialState.plan.drafts.find((item) => item.goalId === initialState.plan.activeGoalId);

  assert.ok(draft);
  assert.equal(draft.tasks.length > 1, true);

  failingAppStateRepository.armFailureAfterSuccessfulSaves(1);

  const reorderedDraft = {
    ...draft,
    tasks: [...draft.tasks].reverse(),
  };

  assert.throws(
    () => service.saveLearningPlanDraft(reorderedDraft),
    /模拟快照持久化失败/,
  );

  const persistedState = service.loadAppState();
  const persistedDraft = persistedState.plan.drafts.find((item) => item.id === draft.id);

  assert.ok(persistedDraft);
  assert.deepEqual(
    persistedDraft.tasks.map((task) => task.id),
    draft.tasks.map((task) => task.id),
  );
});

test('initialize repairs stale structured plan snapshot references before returning app state', () => {
  const { service, entitiesRepository, settingsRepository } = createHarness();
  const primaryGoal = seedState.goals[0];
  assert.ok(primaryGoal);
  const primaryDraft = seedState.plan.drafts.find((draft) => draft.goalId === primaryGoal.id);
  const orphanDraft = seedState.plan.drafts.find((draft) => draft.goalId !== primaryGoal.id);
  assert.ok(primaryDraft);
  assert.ok(orphanDraft);

  entitiesRepository.saveUserProfile(seedState.profile);
  entitiesRepository.replaceLearningGoals([primaryGoal]);
  entitiesRepository.saveLearningPlanState({
    activeGoalId: 'missing-goal',
    drafts: [{ ...primaryDraft }],
    snapshots: [
      {
        ...createPlanSnapshot(primaryDraft, 1, '2026-03-22T08:00:00.000Z'),
        draftId: 'stale-draft-id',
      },
      {
        ...createPlanSnapshot(orphanDraft, 1, '2026-03-22T08:30:00.000Z'),
        goalId: 'missing-goal',
        draftId: 'plan-missing-goal',
      },
    ],
  });
  settingsRepository.saveSettings(seedState.settings);

  const initialized = service.initialize();

  assert.equal(initialized.plan.activeGoalId, primaryGoal.id);
  assert.equal(initialized.plan.drafts.length, 1);
  assert.equal(initialized.plan.snapshots.length, 1);
  assert.equal(initialized.plan.snapshots[0]?.draftId, initialized.plan.drafts[0]?.id);

  const reloaded = service.loadAppState();
  assert.equal(reloaded.plan.snapshots.length, 1);
  assert.equal(reloaded.plan.snapshots[0]?.draftId, reloaded.plan.drafts[0]?.id);
});

test('saveAppState repairs invalid provider routing before persisting settings', () => {
  const { service, settingsRepository } = createHarness();
  const initialState = service.initialize();

  const persistedState = service.saveAppState({
    ...initialState,
    settings: {
      ...initialState.settings,
      routing: {
        ...initialState.settings.routing,
        generalChat: 'custom',
        planAdjustment: 'custom',
      },
    },
  });

  assert.equal(persistedState.settings.routing.generalChat, 'openai');
  assert.equal(persistedState.settings.routing.planAdjustment, 'glm');

  const persistedSettings = settingsRepository.loadSettings();
  assert.ok(persistedSettings);
  assert.equal(persistedSettings.routing.generalChat, 'openai');
  assert.equal(persistedSettings.routing.planAdjustment, 'glm');
});

test('runProfileExtraction writes AI suggestions into conversation preview flow', async () => {
  const executeCalls: AiRequest[] = [];
  const { service } = createHarness({
    aiExecute: async (_settings, request) => {
      executeCalls.push(request);
      return {
        capability: 'profile_extraction',
        providerId: 'openai',
        providerLabel: 'OpenAI / GPT',
        model: 'gpt-4.1-mini',
        suggestions: [
          '采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
          '采纳：把当前主目标周期改为 6 周，并把成功标准调整为完成一个可演示的本地优先 AI MVP',
          '采纳：把计划标题改成「AI 强化学习冲刺草案」，并新增任务「拆解本周 MVP 功能清单」',
        ],
      };
    },
  });

  service.initialize();

  const nextState = await service.runProfileExtraction();

  assert.equal(executeCalls.length, 1);
  assert.equal(executeCalls[0]?.capability, 'profile_extraction');
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'profile_extraction' }>).reflection.entries.length, seedState.reflection.entries.length);
  assert.equal(
    (executeCalls[0] as Extract<AiRequest, { capability: 'profile_extraction' }>).reflection.entries.find((entry) => entry.period === 'weekly')?.obstacle,
    seedState.reflection.entries.find((entry) => entry.period === 'weekly')?.obstacle,
  );
  assert.deepEqual(nextState.conversation.suggestions, [
    '采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
    '采纳：把当前主目标周期改为 6 周，并把成功标准调整为完成一个可演示的本地优先 AI MVP',
    '采纳：把计划标题改成「AI 强化学习冲刺草案」，并新增任务「拆解本周 MVP 功能清单」',
  ]);
  assert.equal(nextState.conversation.actionPreviews.length, 3);
  assert.equal(nextState.conversation.actionPreviews.some((preview) => preview.execution?.type === 'profile_update'), true);
  assert.equal(nextState.conversation.actionPreviews.some((preview) => preview.execution?.type === 'goal_update'), true);
  assert.equal(nextState.conversation.actionPreviews.some((preview) => preview.execution?.type === 'plan_update'), true);
});

test('accepted profile extraction previews persist profile, goal, and plan changes after reload', async () => {
  const { service } = createHarness({
    aiExecute: async () => ({
      capability: 'profile_extraction',
      providerId: 'openai',
      providerLabel: 'OpenAI / GPT',
      model: 'gpt-4.1-mini',
      suggestions: [
        '采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
        '采纳：把当前主目标周期改为 6 周，并把成功标准调整为完成一个可演示的本地优先 AI MVP',
        '采纳：把计划标题改成「AI 强化学习冲刺草案」，并新增任务「拆解本周 MVP 功能清单」',
      ],
    }),
  });

  const initialState = service.initialize();
  const extractedState = await service.runProfileExtraction();
  const acceptedConversation = extractedState.conversation.actionPreviews.reduce(
    (conversation, preview) => updateConversationActionPreviewReview(conversation, {
      actionId: preview.id,
      reviewStatus: 'accepted',
      reviewedAt: '2026-03-22T21:30:00.000Z',
    }),
    extractedState.conversation,
  );

  service.saveAppState({
    ...extractedState,
    conversation: acceptedConversation,
  });

  const applyResult = service.applyAcceptedConversationActionPreviews();
  const appliedGoal = applyResult.state.goals.find((goal) => goal.id === applyResult.state.plan.activeGoalId);
  const appliedDraft = applyResult.state.plan.drafts.find((draft) => draft.goalId === applyResult.state.plan.activeGoalId);

  assert.deepEqual(applyResult.skippedActionIds, []);
  assert.equal(applyResult.appliedActionIds.length, 3);
  assert.equal(applyResult.state.profile.bestStudyWindow, '工作日晚间 20:30 - 21:15');
  assert.equal(
    applyResult.state.profile.planImpact.some((item) => item.includes('工作日晚间 20:30 - 21:15')),
    true,
  );
  assert.equal(appliedGoal?.cycle, '6 周');
  assert.equal(appliedGoal?.successMetric, '完成一个可演示的本地优先 AI MVP');
  assert.equal(appliedDraft?.title, 'AI 强化学习冲刺草案');
  assert.equal(appliedDraft?.tasks.some((task) => task.title === '拆解本周 MVP 功能清单'), true);
  assert.equal(
    applyResult.state.conversation.actionPreviews
      .filter((preview) => applyResult.appliedActionIds.includes(preview.id))
      .every((preview) => preview.status === 'applied' && preview.reviewStatus === 'accepted' && Boolean(preview.appliedAt)),
    true,
  );

  const reloaded = service.loadAppState();
  const reloadedGoal = reloaded.goals.find((goal) => goal.id === initialState.plan.activeGoalId);
  const reloadedDraft = reloaded.plan.drafts.find((draft) => draft.goalId === initialState.plan.activeGoalId);

  assert.equal(reloaded.profile.bestStudyWindow, '工作日晚间 20:30 - 21:15');
  assert.equal(reloadedGoal?.cycle, '6 周');
  assert.equal(reloadedGoal?.successMetric, '完成一个可演示的本地优先 AI MVP');
  assert.equal(reloadedDraft?.title, 'AI 强化学习冲刺草案');
  assert.equal(reloadedDraft?.tasks.some((task) => task.title === '拆解本周 MVP 功能清单'), true);
});

test('regenerateLearningPlanDraft archives the current draft and replaces it with AI-generated content', async () => {
  const executeCalls: AiRequest[] = [];
  const { service } = createHarness({
    aiExecute: async (_settings, request) => {
      executeCalls.push(request);
      return {
        capability: 'plan_generation',
        providerId: 'deepseek',
        providerLabel: 'DeepSeek',
        model: 'deepseek-chat',
        draft: {
          title: 'AI 生成的冲刺草案',
          summary: '由真实 Provider 返回的计划草案。',
          basis: ['统一 runtime 已接入真实计划生成'],
          stages: [
            { title: '阶段 1', outcome: '梳理能力边界', progress: '未开始' },
            { title: '阶段 2', outcome: '接入主进程入口', progress: '未开始' },
          ],
          tasks: [
            { title: '补 capability bridge', duration: '30 分钟', note: '先打通 bridge', status: 'todo' },
            { title: '验证 AI 输出落库', duration: '45 分钟', note: '覆盖草案和快照', status: 'todo' },
          ],
        },
      };
    },
  });

  const initialState = service.initialize();
  const goalId = initialState.plan.activeGoalId;
  const previousDraft = initialState.plan.drafts.find((draft) => draft.goalId === goalId);
  assert.ok(previousDraft);

  const nextState = await service.regenerateLearningPlanDraft(goalId, previousDraft);
  const nextDraft = nextState.plan.drafts.find((draft) => draft.goalId === goalId);

  assert.equal(executeCalls.length, 1);
  assert.equal(executeCalls[0]?.capability, 'plan_generation');
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'plan_generation' }>).goal.id, goalId);
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'plan_generation' }>).currentDraft?.id, previousDraft.id);
  assert.ok(nextDraft);
  assert.equal(nextDraft.title, 'AI 生成的冲刺草案');
  assert.equal(nextDraft.summary, '由真实 Provider 返回的计划草案。');
  assert.equal(nextState.plan.snapshots[0]?.title, previousDraft.title);
});

test('regenerateLearningPlanDraft rolls back archived snapshot and draft replacement when snapshot persistence fails', async () => {
  const { service, failingAppStateRepository } = createPersistenceFailureHarness({
    failOn: 'snapshot',
    aiExecute: async () => ({
      capability: 'plan_generation',
      providerId: 'deepseek',
      providerLabel: 'DeepSeek',
      model: 'deepseek-chat',
      draft: {
        title: '失败后不应落库的新草案',
        summary: '如果事务缺失，这版草案会留下半完成状态。',
        basis: ['验证事务回滚'],
        stages: [{ title: '阶段 1', outcome: '验证回滚', progress: '未开始' }],
        tasks: [{ title: '检查回滚', duration: '20 分钟', note: '确认旧草案仍保留', status: 'todo' }],
      },
    }),
  });
  const initialState = service.loadAppState();
  const goalId = initialState.plan.activeGoalId;
  const previousDraft = initialState.plan.drafts.find((draft) => draft.goalId === goalId);

  assert.ok(previousDraft);

  failingAppStateRepository.armFailureAfterSuccessfulSaves(1);

  await assert.rejects(
    () => service.regenerateLearningPlanDraft(goalId, previousDraft),
    /模拟快照持久化失败/,
  );

  const persistedState = service.loadAppState();
  const persistedDraft = persistedState.plan.drafts.find((draft) => draft.goalId === goalId);
  const initialProviderHealth = initialState.settings.providers.find((provider) => provider.id === 'deepseek')?.healthStatus;

  assert.ok(persistedDraft);
  assert.equal(persistedState.plan.snapshots.length, initialState.plan.snapshots.length);
  assert.equal(persistedDraft.title, previousDraft.title);
  assert.deepEqual(persistedDraft.tasks, previousDraft.tasks);
  assert.equal(
    persistedState.settings.providers.find((provider) => provider.id === 'deepseek')?.healthStatus,
    initialProviderHealth,
  );
});

test('generatePlanAdjustmentSuggestions merges AI suggestions back into the conversation preview flow', async () => {
  const executeCalls: AiRequest[] = [];
  const snapshot = cloneState({
    conversation: {
      ...seedState.conversation,
      suggestions: ['采纳：把学习窗口调整为工作日晚间 20:30 - 21:15'],
    },
  });
  const { service } = createHarness({
    snapshotState: snapshot,
    aiExecute: async (_settings, request) => {
      executeCalls.push(request);
      return {
        capability: 'plan_adjustment',
        providerId: 'deepseek',
        providerLabel: 'DeepSeek',
        model: 'deepseek-chat',
        text: [
          '采纳：把计划标题改成「AI 调整版草案」，并新增任务「安排一次 30 分钟复盘」',
          '采纳：把计划标题改成「AI 调整版草案」，并新增任务「安排一次 30 分钟复盘」',
          '进行中：把真实 AI Provider 的计划调整建议接入当前预览链路',
        ].join('\n'),
      };
    },
  });

  const initialState = service.initialize();
  const goalId = initialState.plan.activeGoalId;
  const nextState = await service.generatePlanAdjustmentSuggestions(goalId);

  assert.equal(executeCalls.length, 1);
  assert.equal(executeCalls[0]?.capability, 'plan_adjustment');
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'plan_adjustment' }>).goal.id, goalId);
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'plan_adjustment' }>).reflection.entries.length, seedState.reflection.entries.length);
  assert.equal(
    (executeCalls[0] as Extract<AiRequest, { capability: 'plan_adjustment' }>).reflection.entries.find((entry) => entry.period === 'stage')?.insight,
    seedState.reflection.entries.find((entry) => entry.period === 'stage')?.insight,
  );
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'plan_adjustment' }>).feedback.includes(seedState.reflection.deviation), true);
  assert.deepEqual(nextState.conversation.suggestions, [
    '采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
    '采纳：把计划标题改成「AI 调整版草案」，并新增任务「安排一次 30 分钟复盘」',
    '进行中：把真实 AI Provider 的计划调整建议接入当前预览链路',
  ]);
  assert.equal(nextState.conversation.actionPreviews.some((preview) => preview.title === '计划调整预览'), true);
});

test('generatePlanAdjustmentSuggestions consumes the latest task execution and reflection feedback', async () => {
  const executeCalls: AiRequest[] = [];
  const { service } = createHarness({
    aiExecute: async (_settings, request) => {
      executeCalls.push(request);
      return {
        capability: 'plan_adjustment',
        providerId: 'glm',
        providerLabel: '智谱 GLM',
        model: 'glm-4-flash',
        text: '采纳：把计划标题改成「复盘驱动调整版」，并新增任务「安排一次 30 分钟复盘」',
      };
    },
  });

  const initialState = service.initialize();
  const activeDraft = initialState.plan.drafts.find((draft) => draft.goalId === initialState.plan.activeGoalId);
  assert.ok(activeDraft);
  const targetTask = activeDraft.tasks[0];
  assert.ok(targetTask);

  service.updatePlanTaskStatus({
    draftId: activeDraft.id,
    taskId: targetTask.id,
    status: 'delayed',
    statusNote: '本周先补集成级验证，计划调整顺延。',
  });

  service.saveReflectionEntry({
    period: 'weekly',
    obstacle: '本周在补关键链路集成验证，连续时间块被切碎。',
    difficultyFit: 'matched',
    timeFit: 'insufficient',
    moodScore: 3,
    confidenceScore: 4,
    accomplishmentScore: 3,
    insight: '先把每条闭环都变成自动测试，再进入打包阶段。',
    followUpActions: ['把任务拆成可以一次验证一条闭环', '先收口关键链路，再补安装体验'],
  });

  const nextState = await service.generatePlanAdjustmentSuggestions(initialState.plan.activeGoalId);
  const request = executeCalls[0] as Extract<AiRequest, { capability: 'plan_adjustment' }>;
  const requestTask = request.currentDraft.tasks.find((task) => task.id === targetTask.id);
  const weeklyEntry = request.reflection.entries.find((entry) => entry.period === 'weekly');

  assert.equal(executeCalls.length, 1);
  assert.ok(requestTask);
  assert.equal(requestTask.status, 'delayed');
  assert.equal(requestTask.statusNote, '本周先补集成级验证，计划调整顺延。');
  assert.equal(weeklyEntry?.obstacle, '本周在补关键链路集成验证，连续时间块被切碎。');
  assert.equal(weeklyEntry?.insight, '先把每条闭环都变成自动测试，再进入打包阶段。');
  assert.deepEqual(weeklyEntry?.followUpActions, ['把任务拆成可以一次验证一条闭环', '先收口关键链路，再补安装体验']);
  assert.equal(
    request.feedback.some((item) => item.includes('本周先补集成级验证，计划调整顺延。')),
    true,
  );
  assert.equal(
    request.feedback.some((item) => item.includes('本周在补关键链路集成验证，连续时间块被切碎。')),
    true,
  );
  assert.equal(
    request.feedback.some((item) => item.includes('把任务拆成可以一次验证一条闭环')),
    true,
  );
  assert.equal(nextState.conversation.suggestions.some((item) => item.includes('复盘驱动调整版')), true);
  assert.equal(nextState.conversation.actionPreviews.some((preview) => preview.title === '计划调整预览'), true);
});

test('getAiRuntimeSummary reflects structured route changes and secret readiness', () => {
  const { service } = createHarness();
  service.initialize();

  const initialSummary = service.getAiRuntimeSummary();
  const initialPlanGeneration = initialSummary.find((item) => item.capability === 'plan_generation');
  assert.ok(initialPlanGeneration);
  assert.equal(initialPlanGeneration.providerId, 'deepseek');
  assert.equal(initialPlanGeneration.ready, false);

  void service.upsertProviderConfig({
    config: {
      id: 'deepseek',
      label: 'DeepSeek',
      enabled: true,
      endpoint: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      authMode: 'apiKey',
      capabilityTags: ['plan_generation', 'plan_adjustment'],
      healthStatus: 'ready',
    },
    secret: 'sk-deepseek',
  });

  const readySummary = service.getAiRuntimeSummary();
  const readyPlanGeneration = readySummary.find((item) => item.capability === 'plan_generation');
  assert.ok(readyPlanGeneration);
  assert.equal(readyPlanGeneration.providerId, 'deepseek');
  assert.equal(readyPlanGeneration.ready, true);

  const currentState = service.loadAppState();
  service.saveAppState({
    ...currentState,
    settings: {
      ...currentState.settings,
      routing: {
        ...currentState.settings.routing,
        planGeneration: 'openai',
      },
    },
  });

  const reroutedSummary = service.getAiRuntimeSummary();
  const reroutedPlanGeneration = reroutedSummary.find((item) => item.capability === 'plan_generation');
  assert.ok(reroutedPlanGeneration);
  assert.equal(reroutedPlanGeneration.providerId, 'openai');
});

test('runProviderHealthCheck persists the returned health status', async () => {
  const { service } = createHarness({
    aiCheckHealth: async (_settings, providerId) => ({
      providerId,
      providerLabel: 'DeepSeek',
      healthStatus: 'ready',
      message: '模型列表接口可访问。',
      checkedAt: '2026-03-22T20:50:00.000Z',
    }),
  });
  service.initialize();

  const response = await service.runProviderHealthCheck('deepseek');

  assert.equal(response.result.providerId, 'deepseek');
  assert.equal(response.result.healthStatus, 'ready');
  assert.equal(response.providers.find((provider) => provider.id === 'deepseek')?.healthStatus, 'ready');
  assert.equal(response.aiRuntimeSummary.find((item) => item.capability === 'plan_generation')?.healthStatus, 'ready');
});

test('updatePlanTaskStatus persists execution metadata and refreshes dashboard/reflection inputs', () => {
  const { service } = createHarness();
  const initialState = service.initialize();
  const activeDraft = initialState.plan.drafts.find((draft) => draft.goalId === initialState.plan.activeGoalId);
  assert.ok(activeDraft);

  const nextState = service.updatePlanTaskStatus({
    draftId: activeDraft.id,
    taskId: 'task-python-ai-3',
    status: 'delayed',
    statusNote: '本周先完成任务日志与最小可观测性收尾。',
  });

  const updatedDraft = nextState.plan.drafts.find((draft) => draft.id === activeDraft.id);
  const updatedTask = updatedDraft?.tasks.find((task) => task.id === 'task-python-ai-3');
  assert.ok(updatedTask);
  assert.equal(updatedTask.status, 'delayed');
  assert.equal(updatedTask.statusNote, '本周先完成任务日志与最小可观测性收尾。');
  assert.match(updatedTask.statusUpdatedAt ?? '', /\d{4}-\d{2}-\d{2}T/);
  assert.match(nextState.dashboard.reflectionSummary, /延后 1 项/);
  assert.equal(nextState.reflection.completedTasks, 1);
  assert.equal(
    nextState.reflection.recentTaskExecutions.some((item) => item.taskId === 'task-python-ai-3' && item.status === 'delayed'),
    true,
  );

  const reloaded = service.loadAppState();
  const persistedDraft = reloaded.plan.drafts.find((draft) => draft.id === activeDraft.id);
  const persistedTask = persistedDraft?.tasks.find((task) => task.id === 'task-python-ai-3');
  assert.ok(persistedTask);
  assert.equal(persistedTask.statusNote, '本周先完成任务日志与最小可观测性收尾。');
});

test('saveReflectionEntry persists structured reflection input and reloads it from storage', () => {
  const { service } = createHarness();
  service.initialize();

  const nextState = service.saveReflectionEntry({
    period: 'weekly',
    obstacle: '本周的连续时间块不足，切换成本偏高。',
    difficultyFit: 'matched',
    timeFit: 'insufficient',
    moodScore: 3,
    confidenceScore: 4,
    accomplishmentScore: 3,
    insight: '需要继续保持项目驱动，但先把每次目标压缩到更小的交付物。',
    followUpActions: ['把周内任务压缩到 30 分钟内', '周末先补最卡的基础链路'],
  });

  const weeklyEntry = nextState.reflection.entries.find((entry) => entry.period === 'weekly');
  assert.ok(weeklyEntry);
  assert.equal(weeklyEntry.obstacle, '本周的连续时间块不足，切换成本偏高。');
  assert.equal(weeklyEntry.difficultyFit, 'matched');
  assert.equal(weeklyEntry.timeFit, 'insufficient');
  assert.equal(weeklyEntry.moodScore, 3);
  assert.equal(weeklyEntry.confidenceScore, 4);
  assert.equal(weeklyEntry.accomplishmentScore, 3);
  assert.deepEqual(weeklyEntry.followUpActions, ['把周内任务压缩到 30 分钟内', '周末先补最卡的基础链路']);

  const reloaded = service.loadAppState();
  const persistedWeeklyEntry = reloaded.reflection.entries.find((entry) => entry.period === 'weekly');
  assert.ok(persistedWeeklyEntry);
  assert.equal(persistedWeeklyEntry.insight, '需要继续保持项目驱动，但先把每次目标压缩到更小的交付物。');
  assert.equal(persistedWeeklyEntry.timeFit, 'insufficient');
  assert.deepEqual(persistedWeeklyEntry.followUpActions, ['把周内任务压缩到 30 分钟内', '周末先补最卡的基础链路']);
});

test('regenerateLearningPlanDraft marks the routed provider as warning when AI execution fails', async () => {
  const snapshot = cloneState({
    settings: {
      ...seedState.settings,
      providers: seedState.settings.providers.map((provider) => (
        provider.id === 'deepseek'
          ? { ...provider, enabled: true, healthStatus: 'ready' }
          : provider
      )),
    },
  });
  const { service } = createHarness({
    snapshotState: snapshot,
    aiExecute: async () => {
      throw new Error('无法连接到 Provider，请检查 Endpoint 或网络。');
    },
  });

  const initialState = service.initialize();

  await assert.rejects(
    () => service.regenerateLearningPlanDraft(initialState.plan.activeGoalId),
    /无法连接到 Provider/,
  );

  const persistedState = service.loadAppState();
  assert.equal(persistedState.settings.providers.find((provider) => provider.id === 'deepseek')?.healthStatus, 'warning');
});

test('regenerateLearningPlanDraft marks the routed provider as ready after a successful AI response', async () => {
  const snapshot = cloneState({
    settings: {
      ...seedState.settings,
      providers: seedState.settings.providers.map((provider) => (
        provider.id === 'deepseek'
          ? { ...provider, enabled: true, healthStatus: 'warning' }
          : provider
      )),
    },
  });
  const { service } = createHarness({
    snapshotState: snapshot,
    aiExecute: async () => ({
      capability: 'plan_generation',
      providerId: 'deepseek',
      providerLabel: 'DeepSeek',
      model: 'deepseek-chat',
      draft: {
        title: '恢复健康后的计划草案',
        summary: 'Provider 调用成功后回写 ready。',
        basis: ['健康状态应更新'],
        stages: [{ title: '阶段 1', outcome: '验证回写', progress: '未开始' }],
        tasks: [{ title: '执行一次成功调用', duration: '20 分钟', note: '检查 healthStatus', status: 'todo' }],
      },
    }),
  });

  const initialState = service.initialize();
  const nextState = await service.regenerateLearningPlanDraft(initialState.plan.activeGoalId);

  assert.equal(nextState.settings.providers.find((provider) => provider.id === 'deepseek')?.healthStatus, 'ready');
});

test('regenerateLearningPlanDraft records a success request log in observability snapshot', async () => {
  const { service } = createHarness({
    aiExecute: async () => ({
      capability: 'plan_generation',
      providerId: 'deepseek',
      providerLabel: 'DeepSeek',
      model: 'deepseek-chat',
      draft: {
        title: '带请求日志的计划草案',
        summary: '验证成功日志会写入 observability。',
        basis: ['记录 capability 调用元数据'],
        stages: [{ title: '阶段 1', outcome: '写入 success 日志', progress: '未开始' }],
        tasks: [{ title: '查看 observability', duration: '15 分钟', note: '检查最近请求列表', status: 'todo' }],
      },
    }),
  });

  const initialState = service.initialize();
  await service.regenerateLearningPlanDraft(initialState.plan.activeGoalId);

  const snapshot: AiObservabilitySnapshot = service.getAiObservability();
  const planGeneration = snapshot.capabilitySummaries.find((item) => item.capability === 'plan_generation');

  assert.equal(snapshot.totalRequests, 1);
  assert.equal(snapshot.successCount, 1);
  assert.equal(snapshot.failureCount, 0);
  assert.equal(snapshot.recentRequests.length, 1);
  assert.equal(snapshot.recentRequests[0]?.capability, 'plan_generation');
  assert.equal(snapshot.recentRequests[0]?.status, 'success');
  assert.equal(snapshot.recentRequests[0]?.providerId, 'deepseek');
  assert.equal(snapshot.recentRequests[0]?.errorMessage, undefined);
  assert.ok((snapshot.recentRequests[0]?.durationMs ?? -1) >= 0);
  assert.ok(planGeneration);
  assert.equal(planGeneration.totalRequests, 1);
  assert.equal(planGeneration.successCount, 1);
  assert.equal(planGeneration.failureCount, 0);
  assert.equal(planGeneration.lastStatus, 'success');
});

test('regenerateLearningPlanDraft records a failure request log in observability snapshot', async () => {
  const { service } = createHarness({
    aiExecute: async () => {
      throw new Error('Provider 请求失败（429 Too Many Requests）。');
    },
  });

  const initialState = service.initialize();

  await assert.rejects(
    () => service.regenerateLearningPlanDraft(initialState.plan.activeGoalId),
    /429/,
  );

  const snapshot: AiObservabilitySnapshot = service.getAiObservability();
  const planGeneration = snapshot.capabilitySummaries.find((item) => item.capability === 'plan_generation');

  assert.equal(snapshot.totalRequests, 1);
  assert.equal(snapshot.successCount, 0);
  assert.equal(snapshot.failureCount, 1);
  assert.equal(snapshot.recentRequests.length, 1);
  assert.equal(snapshot.recentRequests[0]?.capability, 'plan_generation');
  assert.equal(snapshot.recentRequests[0]?.status, 'error');
  assert.match(snapshot.recentRequests[0]?.errorMessage ?? '', /429 Too Many Requests/);
  assert.ok(planGeneration);
  assert.equal(planGeneration.totalRequests, 1);
  assert.equal(planGeneration.successCount, 0);
  assert.equal(planGeneration.failureCount, 1);
  assert.equal(planGeneration.lastStatus, 'error');
  assert.match(planGeneration.lastErrorMessage ?? '', /429 Too Many Requests/);
});

test('getAiObservability returns zeroed summary before any capability request runs', () => {
  const { service } = createHarness();
  service.initialize();

  const snapshot: AiObservabilitySnapshot = service.getAiObservability();

  assert.equal(snapshot.totalRequests, 0);
  assert.equal(snapshot.successCount, 0);
  assert.equal(snapshot.failureCount, 0);
  assert.equal(snapshot.recentRequests.length, 0);
  assert.equal(snapshot.capabilitySummaries.length, 5);
  assert.equal(snapshot.capabilitySummaries.every((item) => item.totalRequests === 0), true);
});
