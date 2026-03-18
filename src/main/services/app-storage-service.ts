import type { AppState, LearningGoal, LearningPlanDraft, LearningPlanState, ProviderConfig, ProviderId, ProviderSecretInput, UserProfile } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import type { LearningGoalInput } from '../../shared/goal.js';
import type { ProviderConfigInput } from '../../shared/provider-config.js';
import { normalizeSecretInput, toSafeProviderConfig } from '../../shared/provider-config.js';
import { AppStateRepository } from '../repositories/app-state-repository.js';
import { EntitiesRepository } from '../repositories/entities-repository.js';
import { ProviderSecretRepository } from '../repositories/provider-secret-repository.js';

function buildDraftId(goalId: string) {
  return `plan-${goalId}`;
}

function buildTaskId(goalId: string, index: number) {
  return `${goalId}-task-${index + 1}`;
}

function createPlanDraft(goal: LearningGoal, profile: UserProfile): LearningPlanDraft {
  const intensityHint = profile.timeBudget.includes('2 小时') ? '周末安排一个完整学习块' : '继续保持轻量频次';
  const firstStrength = profile.strengths[0] ?? '已有经验可迁移';
  const firstBlocker = profile.blockers[0] ?? '需要控制任务摩擦';
  const firstPlanImpact = profile.planImpact[0] ?? '计划保持低摩擦、可持续';
  const focusTag = goal.priority === 'P1' ? '主线目标' : '并行目标';

  return {
    id: buildDraftId(goal.id),
    goalId: goal.id,
    title: `${goal.title} · 首版计划草案`,
    summary: `${focusTag}「${goal.title}」会基于当前基础“${goal.baseline}”先生成一份可执行草案：先拆出低门槛起步动作，再逐步走向“${goal.successMetric}”。`,
    basis: [
      `学习动机：${goal.motivation}`,
      `当前基础：${goal.baseline}`,
      `画像优势：${firstStrength}`,
      `风险提醒：${firstBlocker}`,
      `节奏策略：${firstPlanImpact}；${intensityHint}`,
    ],
    stages: [
      { title: '阶段 1：校准起点', outcome: `明确「${goal.title}」的当前起点与最小可执行动作`, progress: '进行中' },
      { title: '阶段 2：稳定推进', outcome: `围绕 ${goal.cycle} 周期保持稳定任务节奏`, progress: '未开始' },
      { title: '阶段 3：验证达成', outcome: `用“${goal.successMetric}”检验目标结果`, progress: '未开始' },
    ],
    tasks: [
      { id: buildTaskId(goal.id, 0), title: `拆解「${goal.title}」的最小行动`, duration: '20 分钟', status: 'todo', note: '把目标变成一周内可以直接开始的动作。' },
      { id: buildTaskId(goal.id, 1), title: '安排本周第一次执行窗口', duration: '10 分钟', status: 'todo', note: `优先利用 ${profile.bestStudyWindow}。` },
      { id: buildTaskId(goal.id, 2), title: '完成一次真实练习并记录反馈', duration: '30-45 分钟', status: 'todo', note: '先形成执行闭环，再考虑进一步精细化。' },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function ensurePlanDrafts(goals: LearningGoal[], planState: LearningPlanState, profile: UserProfile): LearningPlanState {
  const drafts = goals.map((goal) => {
    const existingDraft = planState.drafts.find((draft) => draft.goalId === goal.id);
    if (!existingDraft) {
      return createPlanDraft(goal, profile);
    }

    const nextTitle = existingDraft.title.trim() || `${goal.title} · 首版计划草案`;
    return {
      ...existingDraft,
      goalId: goal.id,
      title: nextTitle,
    };
  });

  const activeGoalId = goals.some((goal) => goal.id === planState.activeGoalId)
    ? planState.activeGoalId
    : goals[0]?.id ?? '';

  return {
    activeGoalId,
    drafts,
  };
}

function getActiveDraft(planState: LearningPlanState): LearningPlanDraft | null {
  return planState.drafts.find((draft) => draft.goalId === planState.activeGoalId) ?? planState.drafts[0] ?? null;
}

export class AppStorageService {
  constructor(
    private readonly appStateRepository: AppStateRepository,
    private readonly entitiesRepository: EntitiesRepository,
    private readonly providerSecretRepository: ProviderSecretRepository,
  ) {}

  initialize() {
    const structured = this.loadStructuredState();
    if (structured) {
      const merged = this.withProviderSecrets(structured);
      this.appStateRepository.save(merged);
      return merged;
    }

    const snapshot = this.appStateRepository.load();
    if (snapshot) {
      const hydratedFromSnapshot = this.hydratePlanState(snapshot);
      const merged = this.withProviderSecrets(hydratedFromSnapshot);
      this.persistStructuredState(merged);
      this.appStateRepository.save(merged);
      return merged;
    }

    const initialState = this.withProviderSecrets(this.hydratePlanState(seedState));
    this.persistStructuredState(initialState);
    this.appStateRepository.save(initialState);
    return initialState;
  }

  loadAppState() {
    const structured = this.loadStructuredState();
    if (structured) {
      const merged = this.withProviderSecrets(structured);
      this.appStateRepository.save(merged);
      return merged;
    }

    const snapshot = this.appStateRepository.load() ?? seedState;
    const hydratedFromSnapshot = this.hydratePlanState(snapshot);
    const merged = this.withProviderSecrets(hydratedFromSnapshot);
    this.persistStructuredState(merged);
    this.appStateRepository.save(merged);
    return merged;
  }

  saveAppState(state: AppState) {
    const hydrated = this.hydratePlanState(state);
    const sanitized = this.sanitizeState(hydrated);
    this.persistStructuredState(sanitized);
    this.appStateRepository.save(sanitized);
    return this.withProviderSecrets(sanitized);
  }

  loadUserProfile() {
    const profile = this.entitiesRepository.loadUserProfile();
    if (profile) return profile;

    const snapshot = this.loadAppState();
    this.entitiesRepository.saveUserProfile(snapshot.profile);
    return snapshot.profile;
  }

  saveUserProfile(profile: UserProfile) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.hydratePlanState({
      ...snapshot,
      profile,
    }));

    this.entitiesRepository.saveUserProfile(profile);
    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
    return this.loadUserProfile();
  }

  upsertLearningGoal(goal: LearningGoalInput) {
    const snapshot = this.loadAppState();
    const goalId = goal.id?.trim() || `goal-${Date.now()}`;
    const persistedGoals = this.entitiesRepository.upsertLearningGoal({
      ...goal,
      id: goalId,
    });

    const nextPlanState = ensurePlanDrafts(persistedGoals, snapshot.plan, snapshot.profile);
    const nextActiveDraft = getActiveDraft(nextPlanState);
    const nextState = this.sanitizeState({
      ...snapshot,
      goals: persistedGoals,
      plan: nextPlanState,
      conversation: {
        ...snapshot.conversation,
        relatedGoal: persistedGoals.find((item) => item.id === nextPlanState.activeGoalId)?.title ?? snapshot.conversation.relatedGoal,
        relatedPlan: nextActiveDraft?.title ?? snapshot.conversation.relatedPlan,
      },
    });

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
    return this.loadAppState().goals;
  }

  setActiveGoal(goalId: string) {
    const snapshot = this.loadAppState();
    const targetGoal = snapshot.goals.find((goal) => goal.id === goalId);
    if (!targetGoal) {
      throw new Error('目标不存在，无法设为当前目标。');
    }

    const ensuredPlanState = ensurePlanDrafts(snapshot.goals, { ...snapshot.plan, activeGoalId: goalId }, snapshot.profile);
    const activeDraft = getActiveDraft(ensuredPlanState);
    const nextState = this.sanitizeState({
      ...snapshot,
      plan: ensuredPlanState,
      conversation: {
        ...snapshot.conversation,
        relatedGoal: targetGoal.title,
        relatedPlan: activeDraft?.title ?? snapshot.conversation.relatedPlan,
      },
    });

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
    return this.loadAppState();
  }

  saveLearningPlanDraft(draft: LearningPlanDraft) {
    const snapshot = this.loadAppState();
    const previousDraft = snapshot.plan.drafts.find((item) => item.id === draft.id || item.goalId === draft.goalId);
    if (!previousDraft) {
      throw new Error('计划草案不存在，无法保存。');
    }

    const normalizedDraft = this.normalizeLearningPlanDraft(draft, previousDraft);
    const nextState = this.sanitizeState(this.hydratePlanState({
      ...snapshot,
      plan: {
        ...snapshot.plan,
        drafts: snapshot.plan.drafts.map((item) => (item.id === previousDraft.id ? normalizedDraft : item)),
      },
    }));

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
    return this.loadAppState();
  }

  listProviderConfigs() {
    const snapshot = this.loadAppState();
    return snapshot.settings.providers;
  }

  upsertProviderConfig(input: { config: ProviderConfigInput; secret?: string | null }) {
    const snapshot = this.loadAppState();
    const nextProviders = snapshot.settings.providers.map((provider) => {
      if (provider.id !== input.config.id) return provider;
      return {
        ...provider,
        ...input.config,
        keyPreview: provider.keyPreview,
        hasSecret: provider.hasSecret,
      };
    });

    const nextState = this.sanitizeState({
      ...snapshot,
      settings: {
        ...snapshot.settings,
        providers: nextProviders,
      },
    });

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);

    if (input.secret !== undefined) {
      const normalized = normalizeSecretInput({ providerId: input.config.id, secret: input.secret });
      if (normalized.secret) {
        this.providerSecretRepository.upsert(normalized.providerId, normalized.secret);
      } else {
        this.providerSecretRepository.clear(normalized.providerId);
      }
    }

    return this.listProviderConfigs();
  }

  saveProviderSecret(input: ProviderSecretInput) {
    const normalized = normalizeSecretInput(input);
    if (normalized.secret) {
      this.providerSecretRepository.upsert(normalized.providerId, normalized.secret);
    } else {
      this.providerSecretRepository.clear(normalized.providerId);
    }
    return this.listProviderConfigs();
  }

  clearProviderSecret(providerId: ProviderId) {
    this.providerSecretRepository.clear(providerId);
    return this.listProviderConfigs();
  }

  private loadStructuredState(): AppState | null {
    const profile = this.entitiesRepository.loadUserProfile();
    const goals = this.entitiesRepository.loadLearningGoals();
    const plan = this.entitiesRepository.loadLearningPlanState();

    if (!profile || !plan || !goals.length) {
      return null;
    }

    const snapshot = this.appStateRepository.load() ?? seedState;
    const hydrated = this.hydratePlanState({
      ...snapshot,
      profile,
      goals,
      plan,
    });

    const activeGoal = hydrated.goals.find((goal) => goal.id === hydrated.plan.activeGoalId) ?? hydrated.goals[0] ?? null;
    const activeDraft = getActiveDraft(hydrated.plan);

    return {
      ...hydrated,
      conversation: {
        ...hydrated.conversation,
        relatedGoal: activeGoal?.title ?? hydrated.conversation.relatedGoal,
        relatedPlan: activeDraft?.title ?? hydrated.conversation.relatedPlan,
      },
    };
  }

  private persistStructuredState(state: AppState) {
    this.entitiesRepository.saveUserProfile(state.profile);
    this.entitiesRepository.replaceLearningGoals(state.goals);
    this.entitiesRepository.saveLearningPlanState(state.plan);
  }

  private hydratePlanState(state: AppState): AppState {
    const nextPlanState = ensurePlanDrafts(state.goals, state.plan, state.profile);
    const activeGoal = state.goals.find((goal) => goal.id === nextPlanState.activeGoalId) ?? state.goals[0] ?? null;
    const activeDraft = getActiveDraft(nextPlanState);

    return {
      ...state,
      plan: nextPlanState,
      conversation: {
        ...state.conversation,
        relatedGoal: activeGoal?.title ?? state.conversation.relatedGoal,
        relatedPlan: activeDraft?.title ?? state.conversation.relatedPlan,
      },
    };
  }

  private sanitizeState(state: AppState): AppState {
    return {
      ...state,
      settings: {
        ...state.settings,
        providers: state.settings.providers.map((provider) => ({
          ...provider,
          keyPreview: '未配置',
          hasSecret: false,
        })),
      },
    };
  }

  private withProviderSecrets(state: AppState): AppState {
    return {
      ...state,
      settings: {
        ...state.settings,
        providers: state.settings.providers.map((provider) => this.attachProviderSecret(provider)),
      },
    };
  }

  private attachProviderSecret(provider: ProviderConfig): ProviderConfig {
    const secretRow = this.providerSecretRepository.get(provider.id);
    return toSafeProviderConfig(
      {
        id: provider.id,
        label: provider.label,
        enabled: provider.enabled,
        endpoint: provider.endpoint,
        model: provider.model,
        authMode: provider.authMode,
        capabilityTags: provider.capabilityTags,
        healthStatus: provider.healthStatus,
      },
      secretRow?.secret ?? null,
      secretRow?.updatedAt?.toISOString(),
    );
  }

  private normalizeLearningPlanDraft(draft: LearningPlanDraft, fallback: LearningPlanDraft): LearningPlanDraft {
    return {
      ...fallback,
      ...draft,
      title: draft.title.trim() || fallback.title,
      summary: draft.summary.trim() || fallback.summary,
      basis: draft.basis.map((item) => item.trim()).filter(Boolean),
      stages: draft.stages
        .map((stage) => ({
          title: stage.title.trim(),
          outcome: stage.outcome.trim(),
          progress: stage.progress.trim() || '未开始',
        }))
        .filter((stage) => stage.title || stage.outcome),
      tasks: draft.tasks
        .map((task, index) => ({
          ...task,
          id: task.id?.trim() || `${fallback.id}-task-${Date.now()}-${index + 1}`,
          title: task.title.trim(),
          duration: task.duration.trim(),
          note: task.note.trim(),
        }))
        .filter((task) => task.title || task.note),
      updatedAt: new Date().toISOString(),
    };
  }
}
