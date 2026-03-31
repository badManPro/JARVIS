import { create } from 'zustand';
import type {
  AppState,
  ApplyConversationActionPreviewsResult,
  ConversationMessage,
  ConversationActionReviewStatus,
  GenerateTodayPlanInput,
  LearningPlanDraft,
  ProviderConfig,
  ProviderId,
  ProviderSecretInput,
  SaveTodayPlanningContextInput,
  SaveReflectionEntryInput,
  UpdatePlanTaskStatusInput,
  UpdateTodayPlanStepStatusInput,
  UserProfile,
} from '@shared/app-state';
import type { AiObservabilitySnapshot, AiProviderHealthCheckResult, AiRuntimeSummaryItem } from '@shared/ai-service';
import type { CodexAuthStatus } from '@shared/codex-auth';
import {
  applyAcceptedConversationActionPreviews,
  appendConversationMessage as applyConversationMessageAppend,
  createEmptyAppState,
  resolveConversationState,
  saveReflectionEntry as applyReflectionEntrySave,
  syncExecutionDerivedState,
  updateConversationActionPreviewReview,
  updatePlanTaskStatus as applyPlanTaskStatusUpdate,
  updateTodayPlanStepStatus as applyTodayPlanStepStatusUpdate,
} from '@shared/app-state';
import { createDefaultCodexAuthStatus } from '@shared/codex-auth';
import type { LearningGoalInput } from '@shared/goal';
import {
  DEFAULT_MAIN_GOAL_WEIGHT,
  inferLearningGoalDomain,
  normalizeGoalScheduleWeight,
  resolveGoalScheduling,
} from '@shared/goal';
import {
  buildPlanningConfirmationHighlights,
  derivePlanningConfirmation,
} from '@shared/onboarding';
import type { CompleteInitialOnboardingPayload, CompleteInitialOnboardingResult } from '@shared/onboarding';
import { createPlanDraft, createPlanSnapshot, getNextSnapshotVersion } from '@shared/plan-draft';
import type { ProviderConfigInput } from '@shared/provider-config';
import { getCachedStorageBridge } from '@shared/storage-bridge-cache';

type AppStore = AppState & {
  codexAuth: CodexAuthStatus;
  aiRuntimeSummary: AiRuntimeSummaryItem[];
  aiObservability: AiObservabilitySnapshot;
  hydrated: boolean;
  hydrationError: string | null;
  hydrateFromStorage: () => Promise<void>;
  saveAppState: (nextState: AppState) => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  completeInitialOnboarding: (payload: CompleteInitialOnboardingPayload) => Promise<CompleteInitialOnboardingResult>;
  upsertLearningGoal: (goal: LearningGoalInput) => Promise<void>;
  removeLearningGoal: (goalId: string) => Promise<void>;
  setActiveGoal: (goalId: string) => Promise<void>;
  saveLearningPlanDraft: (draft: LearningPlanDraft) => Promise<void>;
  updatePlanTaskStatus: (payload: UpdatePlanTaskStatusInput) => Promise<AppState>;
  updateTodayPlanStepStatus: (payload: UpdateTodayPlanStepStatusInput) => Promise<AppState>;
  saveReflectionEntry: (payload: SaveReflectionEntryInput) => Promise<void>;
  saveTodayPlanningContext: (payload: SaveTodayPlanningContextInput) => Promise<AppState>;
  generateTodayPlan: (payload: GenerateTodayPlanInput) => Promise<AppState>;
  regenerateLearningPlanDraft: (payload: { goalId: string; snapshotDraft?: LearningPlanDraft | null }) => Promise<void>;
  runProfileExtraction: () => Promise<AppState>;
  generatePlanAdjustmentSuggestions: (payload: { goalId: string }) => Promise<AppState>;
  reviewConversationActionPreview: (payload: { actionId: string; reviewStatus: ConversationActionReviewStatus }) => Promise<void>;
  appendConversationMessage: (payload: { role?: ConversationMessage['role']; content: string }) => Promise<void>;
  applyAcceptedConversationActionPreviews: () => Promise<ApplyConversationActionPreviewsResult>;
  refreshProviderConfigs: () => Promise<void>;
  upsertProviderConfig: (payload: { config: ProviderConfigInput; secret?: string | null }) => Promise<void>;
  saveProviderSecret: (payload: ProviderSecretInput) => Promise<void>;
  clearProviderSecret: (providerId: ProviderId) => Promise<void>;
  runProviderHealthCheck: (providerId: ProviderId) => Promise<AiProviderHealthCheckResult>;
  refreshAdvancedSettingsData: () => Promise<void>;
  refreshCodexAuthStatus: () => Promise<void>;
  startCodexLogin: () => Promise<void>;
  startCodexDeviceLogin: () => Promise<void>;
  logoutCodex: () => Promise<void>;
  refreshAiRuntimeSummary: () => Promise<void>;
  refreshAiObservability: () => Promise<void>;
};

function getBridge() {
  return getCachedStorageBridge(window);
}

function mergeProviders(state: AppState, providers: ProviderConfig[]): AppState {
  return {
    ...state,
    settings: {
      ...state.settings,
      providers,
    },
  };
}

function findDraftByGoalId(drafts: LearningPlanDraft[], goalId: string) {
  return drafts.find((draft) => draft.goalId === goalId) ?? drafts[0] ?? null;
}

const EMPTY_RELATED_GOAL_LABEL = '暂未设置目标';
const EMPTY_RELATED_PLAN_LABEL = '暂无计划草案';
const observableCapabilities: AiObservabilitySnapshot['capabilitySummaries'][number]['capability'][] = [
  'profile_extraction',
  'plan_generation',
  'daily_plan_generation',
  'plan_adjustment',
  'reflection_summary',
  'chat_general',
];

function createEmptyAiObservability(): AiObservabilitySnapshot {
  return {
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    capabilitySummaries: observableCapabilities.map((capability) => ({
      capability,
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
    })),
    recentRequests: [],
  };
}

async function loadRuntimeDiagnostics(bridge: NonNullable<ReturnType<typeof getBridge>>) {
  const [aiRuntimeSummary, aiObservability, codexAuth] = await Promise.all([
    bridge.getAiRuntimeSummary(),
    bridge.getAiObservability(),
    bridge.getCodexAuthStatus(),
  ]);

  return {
    codexAuth,
    aiRuntimeSummary,
    aiObservability,
  };
}

function extractAppState(state: AppStore): AppState {
  return {
    profile: state.profile,
    dashboard: state.dashboard,
    goals: state.goals,
    plan: state.plan,
    conversation: state.conversation,
    reflection: state.reflection,
    settings: state.settings,
  };
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...createEmptyAppState(),
  codexAuth: createDefaultCodexAuthStatus(),
  aiRuntimeSummary: [],
  aiObservability: createEmptyAiObservability(),
  hydrated: false,
  hydrationError: null,
  hydrateFromStorage: async () => {
    const bridge = getBridge();
    if (!bridge) {
      set({ hydrated: true, hydrationError: 'learningCompanion bridge 不可用，已退回 seed state。', aiObservability: createEmptyAiObservability() });
      return;
    }

    try {
      const [persistedState, diagnostics] = await Promise.all([
        bridge.loadAppState(),
        loadRuntimeDiagnostics(bridge),
      ]);
      set({ ...persistedState, ...diagnostics, hydrated: true, hydrationError: null });
    } catch (error) {
      set({ hydrated: true, hydrationError: error instanceof Error ? error.message : '加载本地状态失败' });
    }
  },
  saveAppState: async (nextState) => {
    const bridge = getBridge();
    if (!bridge) {
      set({ ...nextState, hydrated: true, hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。' });
      return;
    }

    const persistedState = await bridge.saveAppState(nextState);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set({ ...persistedState, ...diagnostics, hydrated: true, hydrationError: null });
  },
  saveUserProfile: async (profile) => {
    const bridge = getBridge();
    if (!bridge) {
      set((state) => ({ ...state, profile, hydrated: true, hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。' }));
      return;
    }

    const persistedProfile = await bridge.saveUserProfile(profile);
    set((state) => ({ ...state, profile: persistedProfile, hydrated: true, hydrationError: null }));
  },
  completeInitialOnboarding: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      const currentState = extractAppState(get());
      const goalId = currentState.plan.activeGoalId || currentState.goals[0]?.id || `goal-${Date.now()}`;
      const nextGoal = {
        id: goalId,
        title: payload.goalTitle.trim(),
        motivation: `希望系统化推进 ${payload.goalTitle.trim()}。`,
        baseline: payload.baseline.trim(),
        cycle: payload.cycle.trim() || '6 周',
        successMetric: `完成一个能证明「${payload.goalTitle.trim()}」学习结果的真实成果。`,
        priority: 'P1' as const,
        status: 'active' as const,
        domain: inferLearningGoalDomain({
          title: payload.goalTitle.trim(),
          baseline: payload.baseline.trim(),
          successMetric: `完成一个能证明「${payload.goalTitle.trim()}」学习结果的真实成果。`,
        }),
        role: 'main' as const,
        scheduleWeight: DEFAULT_MAIN_GOAL_WEIGHT,
      };
      const planningConfirmation = derivePlanningConfirmation({
        pacePreference: payload.pacePreference,
        personalityTraits: payload.personalityTraits,
        mbti: payload.mbti,
        motivationStyle: payload.motivationStyle,
        stressResponse: payload.stressResponse,
        feedbackPreference: payload.feedbackPreference,
      });
      const nextProfile = {
        ...currentState.profile,
        identity: payload.baseline.trim(),
        timeBudget: payload.timeBudget.trim(),
        bestStudyWindow: payload.bestStudyWindow.trim(),
        pacePreference: payload.pacePreference.trim(),
        ageBracket: payload.ageBracket.trim(),
        gender: payload.gender.trim(),
        personalityTraits: payload.personalityTraits,
        mbti: payload.mbti.trim().toUpperCase(),
        motivationStyle: payload.motivationStyle.trim(),
        stressResponse: payload.stressResponse.trim(),
        feedbackPreference: payload.feedbackPreference.trim(),
        planningStyle: planningConfirmation.planningStyle,
        decisionSupportLevel: planningConfirmation.decisionSupportLevel,
        feedbackTone: planningConfirmation.feedbackTone,
        autonomyPreference: planningConfirmation.autonomyPreference,
      };
      const nextDraft = createPlanDraft(nextGoal, nextProfile);
      const scheduledGoals = resolveGoalScheduling(
        currentState.goals.some((goal) => goal.id === goalId)
          ? currentState.goals.map((goal) => (goal.id === goalId ? nextGoal : goal))
          : [...currentState.goals, nextGoal],
        goalId,
      );
      const nextState: AppState = {
        ...currentState,
        profile: nextProfile,
        goals: scheduledGoals.goals,
        plan: {
          ...currentState.plan,
          activeGoalId: scheduledGoals.activeGoalId,
          drafts: currentState.plan.drafts.some((draft) => draft.goalId === goalId)
            ? currentState.plan.drafts.map((draft) => (draft.goalId === goalId ? nextDraft : draft))
            : [...currentState.plan.drafts, nextDraft],
        },
      };
      set({
        ...nextState,
        hydrated: true,
        hydrationError: 'learningCompanion bridge 不可用，已降级为模板版路径。',
      });
      return {
        state: nextState,
        planSource: 'template_fallback',
        providerLabel: undefined,
        fallbackReason: 'learningCompanion bridge 不可用，已降级为模板版路径。',
        summary: {
          personaHighlights: [`时间预算：${nextProfile.timeBudget}`],
          planningHighlights: buildPlanningConfirmationHighlights(planningConfirmation),
          goalTitle: nextGoal.title,
          planTitle: nextDraft.title,
          planSummary: nextDraft.summary,
          firstTaskTitle: nextDraft.tasks[0]?.title ?? '确认第一步任务',
          firstTaskDuration: nextDraft.tasks[0]?.duration ?? '20 分钟',
          firstTaskNote: nextDraft.tasks[0]?.note ?? '先从最小动作开始。',
        },
      };
    }

    const persistedState = await bridge.completeInitialOnboarding(payload);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set({ ...persistedState.state, ...diagnostics, hydrated: true, hydrationError: null });
    return persistedState;
  },
  upsertLearningGoal: async (goal) => {
    const bridge = getBridge();
    if (!bridge) {
      const goalId = goal.id ?? `goal-${Date.now()}`;
      set((state) => ({
        ...(() => {
          const existingGoal = state.goals.find((item) => item.id === goalId);
          const requestedRole = goal.role ?? existingGoal?.role ?? (state.goals.length ? 'secondary' : 'main');
          const nextGoal = {
            ...existingGoal,
            ...goal,
            id: goalId,
            domain: goal.domain ?? existingGoal?.domain ?? inferLearningGoalDomain({
              title: goal.title,
              motivation: goal.motivation,
              baseline: goal.baseline,
              successMetric: goal.successMetric,
            }),
            role: requestedRole,
            scheduleWeight: normalizeGoalScheduleWeight(goal.scheduleWeight ?? existingGoal?.scheduleWeight, requestedRole),
          };
          const scheduledGoals = resolveGoalScheduling(
            state.goals.some((item) => item.id === goalId)
              ? state.goals.map((item) => (item.id === goalId ? nextGoal : item))
              : [...state.goals, nextGoal],
            requestedRole === 'main' ? goalId : state.plan.activeGoalId,
          );

          return {
            ...state,
            goals: scheduledGoals.goals,
            plan: {
              ...state.plan,
              activeGoalId: scheduledGoals.activeGoalId,
            },
            hydrated: true,
            hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
          };
        })(),
      }));
      return;
    }

    const goals = await bridge.upsertLearningGoal(goal);
    set((state) => ({
      ...state,
      goals,
      plan: {
        ...state.plan,
        activeGoalId: resolveGoalScheduling(goals).activeGoalId,
      },
      hydrated: true,
      hydrationError: null,
    }));
  },
  removeLearningGoal: async (goalId) => {
    const bridge = getBridge();
    if (!bridge) {
      set((state) => {
        const targetGoal = state.goals.find((goal) => goal.id === goalId);
        if (!targetGoal) {
          return state;
        }

        const nextGoals = state.goals.filter((goal) => goal.id !== goalId);
        const scheduledGoals = resolveGoalScheduling(
          nextGoals,
          state.plan.activeGoalId === goalId ? undefined : state.plan.activeGoalId,
        );
        const nextActiveGoalId = scheduledGoals.activeGoalId;
        const nextDrafts = state.plan.drafts.filter((draft) => draft.goalId !== goalId);
        const nextSnapshots = state.plan.snapshots.filter((snapshot) => snapshot.goalId !== goalId);
        const activeDraft = findDraftByGoalId(nextDrafts, nextActiveGoalId);
        const activeGoal = scheduledGoals.goals.find((goal) => goal.id === nextActiveGoalId) ?? scheduledGoals.goals[0] ?? null;

        return {
          ...state,
          goals: scheduledGoals.goals,
          plan: {
            ...state.plan,
            activeGoalId: nextActiveGoalId,
            drafts: nextDrafts,
            snapshots: nextSnapshots,
          },
          conversation: {
            ...state.conversation,
            relatedGoal: activeGoal?.title ?? EMPTY_RELATED_GOAL_LABEL,
            relatedPlan: activeDraft?.title ?? EMPTY_RELATED_PLAN_LABEL,
          },
          hydrated: true,
          hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
        };
      });
      return;
    }

    const persistedState = await bridge.removeLearningGoal(goalId);
    set({ ...persistedState, hydrated: true, hydrationError: null });
  },
  setActiveGoal: async (goalId) => {
    const bridge = getBridge();
    if (!bridge) {
      set((state) => {
        const targetGoal = state.goals.find((goal) => goal.id === goalId);
        if (!targetGoal) {
          return state;
        }

        const scheduledGoals = resolveGoalScheduling(state.goals, goalId);
        const activeDraft = findDraftByGoalId(state.plan.drafts, goalId);
        return {
          ...state,
          goals: scheduledGoals.goals,
          plan: {
            ...state.plan,
            activeGoalId: scheduledGoals.activeGoalId,
          },
          conversation: {
            ...state.conversation,
            relatedGoal: targetGoal.title,
            relatedPlan: activeDraft?.title ?? state.conversation.relatedPlan,
          },
          hydrated: true,
          hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
        };
      });
      return;
    }

    const persistedState = await bridge.setActiveGoal(goalId);
    set({ ...persistedState, hydrated: true, hydrationError: null });
  },
  saveLearningPlanDraft: async (draft) => {
    const bridge = getBridge();
    if (!bridge) {
      set((state) => {
        const drafts = state.plan.drafts.map((item) => (item.id === draft.id ? draft : item));
        const activeDraft = findDraftByGoalId(drafts, state.plan.activeGoalId);
        return {
          ...state,
          plan: {
            ...state.plan,
            drafts,
          },
          conversation: {
            ...state.conversation,
            relatedPlan: activeDraft?.title ?? state.conversation.relatedPlan,
          },
          hydrated: true,
          hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
        };
      });
      return;
    }

    const persistedState = await bridge.saveLearningPlanDraft(draft);
    set({ ...persistedState, hydrated: true, hydrationError: null });
  },
  updatePlanTaskStatus: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      const nextState = applyPlanTaskStatusUpdate(extractAppState(get()), payload);
      set((state) => ({
        ...state,
        ...nextState,
        hydrated: true,
        hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
      }));
      return nextState;
    }

    const persistedState = await bridge.updatePlanTaskStatus(payload);
    set({ ...persistedState, hydrated: true, hydrationError: null });
    return persistedState;
  },
  updateTodayPlanStepStatus: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      const nextState = applyTodayPlanStepStatusUpdate(extractAppState(get()), payload);
      set((state) => ({
        ...state,
        ...nextState,
        hydrated: true,
        hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
      }));
      return nextState;
    }

    const persistedState = await bridge.updateTodayPlanStepStatus(payload);
    set({ ...persistedState, hydrated: true, hydrationError: null });
    return persistedState;
  },
  saveReflectionEntry: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      set((state) => ({
        ...state,
        ...applyReflectionEntrySave(extractAppState(state), payload),
        hydrated: true,
        hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
      }));
      return;
    }

    const persistedState = await bridge.saveReflectionEntry(payload);
    set({ ...persistedState, hydrated: true, hydrationError: null });
  },
  saveTodayPlanningContext: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error('learningCompanion bridge 不可用，无法保存今日计划上下文。');
    }

    const persistedState = await bridge.saveTodayPlanningContext(payload);
    set({ ...persistedState, hydrated: true, hydrationError: null });
    return persistedState;
  },
  generateTodayPlan: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error('learningCompanion bridge 不可用，无法生成今日计划。');
    }

    const persistedState = await bridge.generateTodayPlan(payload);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set({ ...persistedState, ...diagnostics, hydrated: true, hydrationError: null });
    return persistedState;
  },
  regenerateLearningPlanDraft: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      set((state) => {
        const targetGoal = state.goals.find((goal) => goal.id === payload.goalId);
        const currentDraft = findDraftByGoalId(state.plan.drafts, payload.goalId);
        if (!targetGoal || !currentDraft) {
          return state;
        }

        const archivedDraft = payload.snapshotDraft ?? currentDraft;
        const snapshotVersion = getNextSnapshotVersion(state.plan.snapshots, payload.goalId);
        const nextSnapshot = createPlanSnapshot(archivedDraft, snapshotVersion);
        const nextDraft = {
          ...createPlanDraft(targetGoal, state.profile, 'regenerated'),
          id: currentDraft.id,
          goalId: currentDraft.goalId,
        };

        return {
          ...state,
          plan: {
            ...state.plan,
            drafts: state.plan.drafts.map((item) => (item.id === currentDraft.id ? nextDraft : item)),
            snapshots: [nextSnapshot, ...state.plan.snapshots],
          },
          conversation: {
            ...state.conversation,
            relatedGoal: targetGoal.title,
            relatedPlan: nextDraft.title,
          },
          hydrated: true,
          hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
        };
      });
      return;
    }

    const persistedState = await bridge.regenerateLearningPlanDraft(payload);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set({ ...persistedState, ...diagnostics, hydrated: true, hydrationError: null });
  },
  runProfileExtraction: async () => {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error('learningCompanion bridge 不可用，无法执行画像提取。');
    }

    const persistedState = await bridge.runProfileExtraction();
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set({ ...persistedState, ...diagnostics, hydrated: true, hydrationError: null });
    return persistedState;
  },
  generatePlanAdjustmentSuggestions: async (payload) => {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error('learningCompanion bridge 不可用，无法执行计划调整建议生成。');
    }

    const persistedState = await bridge.generatePlanAdjustmentSuggestions(payload);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set({ ...persistedState, ...diagnostics, hydrated: true, hydrationError: null });
    return persistedState;
  },
  appendConversationMessage: async (payload) => {
    const content = payload.content.trim();
    if (!content) {
      return;
    }

    const nextState = applyConversationMessageAppend(extractAppState(get()), {
      role: payload.role ?? 'user',
      content,
    });

    await get().saveAppState(nextState);
  },
  reviewConversationActionPreview: async (payload) => {
    const bridge = getBridge();
    const currentState = get();
    const nextConversation = resolveConversationState({
      profile: currentState.profile,
      goals: currentState.goals,
      plan: currentState.plan,
      conversation: updateConversationActionPreviewReview(currentState.conversation, payload),
      settings: currentState.settings,
    });

    if (!bridge) {
      set((state) => ({
        ...state,
        conversation: nextConversation,
        hydrated: true,
        hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
      }));
      return;
    }

    const nextState = {
      ...extractAppState(currentState),
      conversation: nextConversation,
    } satisfies AppState;
    const persistedState = await bridge.saveAppState(nextState);
    set({ ...persistedState, hydrated: true, hydrationError: null });
  },
  applyAcceptedConversationActionPreviews: async () => {
    const bridge = getBridge();
    const currentState = get();
    const hydrationError = bridge ? null : 'learningCompanion bridge 不可用，未写入本地数据库。';

    const result = bridge
      ? await bridge.applyAcceptedConversationActionPreviews()
      : applyAcceptedConversationActionPreviews(extractAppState(currentState));
    const nextState = syncExecutionDerivedState(result.state);
    const nextResult = {
      ...result,
      state: nextState,
    };
    set({ ...nextState, hydrated: true, hydrationError });
    return nextResult;
  },
  refreshProviderConfigs: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [providers, diagnostics] = await Promise.all([
      bridge.listProviderConfigs(),
      loadRuntimeDiagnostics(bridge),
    ]);
    set((state) => ({ ...mergeProviders(state, providers), ...diagnostics, hydrated: true, hydrationError: null }));
  },
  upsertProviderConfig: async (payload) => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.upsertProviderConfig(payload);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set((state) => ({ ...mergeProviders(state, providers), ...diagnostics, hydrated: true, hydrationError: null }));
  },
  saveProviderSecret: async (payload) => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.saveProviderSecret(payload);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set((state) => ({ ...mergeProviders(state, providers), ...diagnostics, hydrated: true, hydrationError: null }));
  },
  clearProviderSecret: async (providerId) => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.clearProviderSecret(providerId);
    const diagnostics = await loadRuntimeDiagnostics(bridge);
    set((state) => ({ ...mergeProviders(state, providers), ...diagnostics, hydrated: true, hydrationError: null }));
  },
  runProviderHealthCheck: async (providerId) => {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error('learningCompanion bridge 不可用，无法执行 Provider 健康检查。');
    }

    const [response, aiObservability] = await Promise.all([
      bridge.runProviderHealthCheck(providerId),
      bridge.getAiObservability(),
    ]);
    set((state) => ({ ...mergeProviders(state, response.providers), aiRuntimeSummary: response.aiRuntimeSummary, aiObservability, hydrated: true, hydrationError: null }));
    return response.result;
  },
  refreshAdvancedSettingsData: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [providers, diagnostics] = await Promise.all([
      bridge.listProviderConfigs(),
      loadRuntimeDiagnostics(bridge),
    ]);
    set((state) => ({ ...mergeProviders(state, providers), ...diagnostics, hydrated: true, hydrationError: null }));
  },
  refreshCodexAuthStatus: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const codexAuth = await bridge.getCodexAuthStatus();
    set((state) => ({ ...state, codexAuth, hydrated: true, hydrationError: null }));
  },
  startCodexLogin: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [, diagnostics] = await Promise.all([
      bridge.startCodexLogin(),
      loadRuntimeDiagnostics(bridge),
    ]);
    set((state) => ({ ...state, ...diagnostics, hydrated: true, hydrationError: null }));
  },
  startCodexDeviceLogin: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [, diagnostics] = await Promise.all([
      bridge.startCodexDeviceLogin(),
      loadRuntimeDiagnostics(bridge),
    ]);
    set((state) => ({ ...state, ...diagnostics, hydrated: true, hydrationError: null }));
  },
  logoutCodex: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [, diagnostics] = await Promise.all([
      bridge.logoutCodex(),
      loadRuntimeDiagnostics(bridge),
    ]);
    set((state) => ({ ...state, ...diagnostics, hydrated: true, hydrationError: null }));
  },
  refreshAiRuntimeSummary: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [aiRuntimeSummary, codexAuth] = await Promise.all([
      bridge.getAiRuntimeSummary(),
      bridge.getCodexAuthStatus(),
    ]);
    set((state) => ({ ...state, aiRuntimeSummary, codexAuth, hydrated: true, hydrationError: null }));
  },
  refreshAiObservability: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const aiObservability = await bridge.getAiObservability();
    set((state) => ({ ...state, aiObservability, hydrated: true, hydrationError: null }));
  },
}));
