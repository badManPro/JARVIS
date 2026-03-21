import type { AppState, LearningPlanDraft, ProviderConfig, ProviderId, ProviderSecretInput } from './app-state.js';
import type { LearningGoalInput } from './goal.js';
import type { ProviderConfigInput } from './provider-config.js';

export type LearningCompanionBridge = {
  platform: NodeJS.Platform;
  version: string;
  storage: {
    loadAppState: () => Promise<AppState>;
    saveAppState: (state: AppState) => Promise<AppState>;
    loadUserProfile: () => Promise<AppState['profile']>;
    saveUserProfile: (profile: AppState['profile']) => Promise<AppState['profile']>;
    upsertLearningGoal: (goal: LearningGoalInput) => Promise<AppState['goals']>;
    setActiveGoal: (goalId: string) => Promise<AppState>;
    saveLearningPlanDraft: (draft: LearningPlanDraft) => Promise<AppState>;
    regenerateLearningPlanDraft: (payload: { goalId: string; snapshotDraft?: LearningPlanDraft | null }) => Promise<AppState>;
    listProviderConfigs: () => Promise<ProviderConfig[]>;
    upsertProviderConfig: (payload: { config: ProviderConfigInput; secret?: string | null }) => Promise<ProviderConfig[]>;
    saveProviderSecret: (payload: ProviderSecretInput) => Promise<ProviderConfig[]>;
    clearProviderSecret: (providerId: ProviderId) => Promise<ProviderConfig[]>;
  };
};
