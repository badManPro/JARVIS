import { create } from 'zustand';
import type { AppState, ApplyConversationActionPreviewsResult, ConversationActionReviewStatus, LearningPlanDraft, ProviderConfig, ProviderId, ProviderSecretInput, UserProfile } from '@shared/app-state';
import type { AiRuntimeSummaryItem } from '@shared/ai-service';
import { applyAcceptedConversationActionPreviews, resolveConversationState, seedState, updateConversationActionPreviewReview } from '@shared/app-state';
import type { LearningGoalInput } from '@shared/goal';
import { createPlanDraft, createPlanSnapshot, getNextSnapshotVersion } from '@shared/plan-draft';
import type { ProviderConfigInput } from '@shared/provider-config';

type AppStore = AppState & {
  aiRuntimeSummary: AiRuntimeSummaryItem[];
  hydrated: boolean;
  hydrationError: string | null;
  hydrateFromStorage: () => Promise<void>;
  saveAppState: (nextState: AppState) => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  upsertLearningGoal: (goal: LearningGoalInput) => Promise<void>;
  removeLearningGoal: (goalId: string) => Promise<void>;
  setActiveGoal: (goalId: string) => Promise<void>;
  saveLearningPlanDraft: (draft: LearningPlanDraft) => Promise<void>;
  regenerateLearningPlanDraft: (payload: { goalId: string; snapshotDraft?: LearningPlanDraft | null }) => Promise<void>;
  reviewConversationActionPreview: (payload: { actionId: string; reviewStatus: ConversationActionReviewStatus }) => Promise<void>;
  applyAcceptedConversationActionPreviews: () => Promise<ApplyConversationActionPreviewsResult>;
  refreshProviderConfigs: () => Promise<void>;
  upsertProviderConfig: (payload: { config: ProviderConfigInput; secret?: string | null }) => Promise<void>;
  saveProviderSecret: (payload: ProviderSecretInput) => Promise<void>;
  clearProviderSecret: (providerId: ProviderId) => Promise<void>;
  refreshAiRuntimeSummary: () => Promise<void>;
};

function getBridge() {
  return window.learningCompanion?.storage;
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
  ...seedState,
  aiRuntimeSummary: [],
  hydrated: false,
  hydrationError: null,
  hydrateFromStorage: async () => {
    const bridge = getBridge();
    if (!bridge) {
      set({ hydrated: true, hydrationError: 'learningCompanion bridge 不可用，已退回 seed state。' });
      return;
    }

    try {
      const [persistedState, aiRuntimeSummary] = await Promise.all([
        bridge.loadAppState(),
        bridge.getAiRuntimeSummary(),
      ]);
      set({ ...persistedState, aiRuntimeSummary, hydrated: true, hydrationError: null });
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

    const [persistedState, aiRuntimeSummary] = await Promise.all([
      bridge.saveAppState(nextState),
      bridge.getAiRuntimeSummary(),
    ]);
    set({ ...persistedState, aiRuntimeSummary, hydrated: true, hydrationError: null });
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
  upsertLearningGoal: async (goal) => {
    const bridge = getBridge();
    if (!bridge) {
      const goalId = goal.id ?? `goal-${Date.now()}`;
      set((state) => ({
        ...state,
        goals: state.goals.some((item) => item.id === goalId)
          ? state.goals.map((item) => (item.id === goalId ? { ...item, ...goal, id: goalId } : item))
          : [...state.goals, { ...goal, id: goalId }],
        hydrated: true,
        hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。',
      }));
      return;
    }

    const goals = await bridge.upsertLearningGoal(goal);
    set((state) => ({ ...state, goals, hydrated: true, hydrationError: null }));
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
        const nextActiveGoalId = state.plan.activeGoalId === goalId ? (nextGoals[0]?.id ?? '') : state.plan.activeGoalId;
        const nextDrafts = state.plan.drafts.filter((draft) => draft.goalId !== goalId);
        const nextSnapshots = state.plan.snapshots.filter((snapshot) => snapshot.goalId !== goalId);
        const activeDraft = findDraftByGoalId(nextDrafts, nextActiveGoalId);
        const activeGoal = nextGoals.find((goal) => goal.id === nextActiveGoalId) ?? nextGoals[0] ?? null;

        return {
          ...state,
          goals: nextGoals,
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

        const activeDraft = findDraftByGoalId(state.plan.drafts, goalId);
        return {
          ...state,
          plan: {
            ...state.plan,
            activeGoalId: goalId,
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
    set({ ...persistedState, hydrated: true, hydrationError: null });
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

    if (!bridge) {
      const result = applyAcceptedConversationActionPreviews(extractAppState(currentState));
      set({ ...result.state, hydrated: true, hydrationError: 'learningCompanion bridge 不可用，未写入本地数据库。' });
      return result;
    }

    const result = await bridge.applyAcceptedConversationActionPreviews();
    set({ ...result.state, hydrated: true, hydrationError: null });
    return result;
  },
  refreshProviderConfigs: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const [providers, aiRuntimeSummary] = await Promise.all([
      bridge.listProviderConfigs(),
      bridge.getAiRuntimeSummary(),
    ]);
    set((state) => ({ ...mergeProviders(state, providers), aiRuntimeSummary, hydrated: true, hydrationError: null }));
  },
  upsertProviderConfig: async (payload) => {
    const bridge = getBridge();
    if (!bridge) return;

    const [providers, aiRuntimeSummary] = await Promise.all([
      bridge.upsertProviderConfig(payload),
      bridge.getAiRuntimeSummary(),
    ]);
    set((state) => ({ ...mergeProviders(state, providers), aiRuntimeSummary, hydrated: true, hydrationError: null }));
  },
  saveProviderSecret: async (payload) => {
    const bridge = getBridge();
    if (!bridge) return;

    const [providers, aiRuntimeSummary] = await Promise.all([
      bridge.saveProviderSecret(payload),
      bridge.getAiRuntimeSummary(),
    ]);
    set((state) => ({ ...mergeProviders(state, providers), aiRuntimeSummary, hydrated: true, hydrationError: null }));
  },
  clearProviderSecret: async (providerId) => {
    const bridge = getBridge();
    if (!bridge) return;

    const [providers, aiRuntimeSummary] = await Promise.all([
      bridge.clearProviderSecret(providerId),
      bridge.getAiRuntimeSummary(),
    ]);
    set((state) => ({ ...mergeProviders(state, providers), aiRuntimeSummary, hydrated: true, hydrationError: null }));
  },
  refreshAiRuntimeSummary: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const aiRuntimeSummary = await bridge.getAiRuntimeSummary();
    set((state) => ({ ...state, aiRuntimeSummary, hydrated: true, hydrationError: null }));
  },
}));
