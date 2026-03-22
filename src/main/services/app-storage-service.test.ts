import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import type { AiObservabilitySnapshot, AiProviderHealthCheckResult, AiRequest, AiResult, AiRuntimeSummaryItem } from '../../shared/ai-service.js';
import { createDatabase } from '../db/client.js';
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
  aiExecute?: (settings: AppState['settings'], request: AiRequest) => Promise<AiResult>;
  aiCheckHealth?: (settings: AppState['settings'], providerId: AppState['settings']['providers'][number]['id']) => Promise<AiProviderHealthCheckResult>;
} = {}) {
  const { snapshotState, aiExecute, aiCheckHealth } = options;
  const { db } = createDatabase(':memory:');
  const appStateRepository = new AppStateRepository(db);
  const entitiesRepository = new EntitiesRepository(db);
  const providerSecretRepository = new ProviderSecretRepository(db);
  const settingsRepository = new SettingsRepository(db);

  if (snapshotState) {
    appStateRepository.save(snapshotState);
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
    service,
    settingsRepository,
  };
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
  assert.equal((executeCalls[0] as Extract<AiRequest, { capability: 'plan_adjustment' }>).feedback.includes(seedState.reflection.deviation), true);
  assert.deepEqual(nextState.conversation.suggestions, [
    '采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
    '采纳：把计划标题改成「AI 调整版草案」，并新增任务「安排一次 30 分钟复盘」',
    '进行中：把真实 AI Provider 的计划调整建议接入当前预览链路',
  ]);
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
