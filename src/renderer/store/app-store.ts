import { create } from 'zustand';
import type { AppState, LearningPlanDraft, ProviderConfig, ProviderId, ProviderSecretInput, UserProfile } from '@shared/app-state';
import { seedState } from '@shared/app-state';
import type { LearningGoalInput } from '@shared/goal';
import type { ProviderConfigInput } from '@shared/provider-config';

type AppStore = AppState & {
  hydrated: boolean;
  hydrationError: string | null;
  hydrateFromStorage: () => Promise<void>;
  saveAppState: (nextState: AppState) => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  upsertLearningGoal: (goal: LearningGoalInput) => Promise<void>;
  setActiveGoal: (goalId: string) => Promise<void>;
  saveLearningPlanDraft: (draft: LearningPlanDraft) => Promise<void>;
  refreshProviderConfigs: () => Promise<void>;
  upsertProviderConfig: (payload: { config: ProviderConfigInput; secret?: string | null }) => Promise<void>;
  saveProviderSecret: (payload: ProviderSecretInput) => Promise<void>;
  clearProviderSecret: (providerId: ProviderId) => Promise<void>;
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

export const useAppStore = create<AppStore>((set) => ({
  ...seedState,
  hydrated: false,
  hydrationError: null,
  hydrateFromStorage: async () => {
    const bridge = getBridge();
    if (!bridge) {
      set({ hydrated: true, hydrationError: 'learningCompanion bridge 不可用，已退回 seed state。' });
      return;
    }

    try {
      const persistedState = await bridge.loadAppState();
      set({ ...persistedState, hydrated: true, hydrationError: null });
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
    set({ ...persistedState, hydrated: true, hydrationError: null });
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
  refreshProviderConfigs: async () => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.listProviderConfigs();
    set((state) => ({ ...mergeProviders(state, providers), hydrated: true }));
  },
  upsertProviderConfig: async (payload) => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.upsertProviderConfig(payload);
    set((state) => ({ ...mergeProviders(state, providers), hydrated: true, hydrationError: null }));
  },
  saveProviderSecret: async (payload) => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.saveProviderSecret(payload);
    set((state) => ({ ...mergeProviders(state, providers), hydrated: true, hydrationError: null }));
  },
  clearProviderSecret: async (providerId) => {
    const bridge = getBridge();
    if (!bridge) return;

    const providers = await bridge.clearProviderSecret(providerId);
    set((state) => ({ ...mergeProviders(state, providers), hydrated: true, hydrationError: null }));
  },
}));
