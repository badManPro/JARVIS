import type {
  AppState,
  ApplyConversationActionPreviewsResult,
  GenerateTodayPlanInput,
  LearningPlanDraft,
  ProviderConfig,
  ProviderId,
  SaveTodayPlanningContextInput,
  ProviderSecretInput,
  SaveReflectionEntryInput,
  UpdatePlanTaskStatusInput,
} from './app-state.js';
import type { AiObservabilitySnapshot, AiProviderHealthCheckResponse, AiRuntimeSummaryItem } from './ai-service.js';
import type { CodexAuthStatus } from './codex-auth.js';
import type { LearningGoalInput } from './goal.js';
import type { CompleteInitialOnboardingPayload, CompleteInitialOnboardingResult } from './onboarding.js';
import type { ProviderConfigInput } from './provider-config.js';

export type LearningCompanionBridge = {
  platform: NodeJS.Platform;
  version: string;
  storage: {
    loadAppState: () => Promise<AppState>;
    saveAppState: (state: AppState) => Promise<AppState>;
    loadUserProfile: () => Promise<AppState['profile']>;
    saveUserProfile: (profile: AppState['profile']) => Promise<AppState['profile']>;
    completeInitialOnboarding: (payload: CompleteInitialOnboardingPayload) => Promise<CompleteInitialOnboardingResult>;
    upsertLearningGoal: (goal: LearningGoalInput) => Promise<AppState['goals']>;
    removeLearningGoal: (goalId: string) => Promise<AppState>;
    setActiveGoal: (goalId: string) => Promise<AppState>;
    saveLearningPlanDraft: (draft: LearningPlanDraft) => Promise<AppState>;
    updatePlanTaskStatus: (payload: UpdatePlanTaskStatusInput) => Promise<AppState>;
    saveReflectionEntry: (payload: SaveReflectionEntryInput) => Promise<AppState>;
    saveTodayPlanningContext: (payload: SaveTodayPlanningContextInput) => Promise<AppState>;
    generateTodayPlan: (payload: GenerateTodayPlanInput) => Promise<AppState>;
    regenerateLearningPlanDraft: (payload: { goalId: string; snapshotDraft?: LearningPlanDraft | null }) => Promise<AppState>;
    runProfileExtraction: () => Promise<AppState>;
    generatePlanAdjustmentSuggestions: (payload: { goalId: string }) => Promise<AppState>;
    applyAcceptedConversationActionPreviews: () => Promise<ApplyConversationActionPreviewsResult>;
    listProviderConfigs: () => Promise<ProviderConfig[]>;
    upsertProviderConfig: (payload: { config: ProviderConfigInput; secret?: string | null }) => Promise<ProviderConfig[]>;
    saveProviderSecret: (payload: ProviderSecretInput) => Promise<ProviderConfig[]>;
    clearProviderSecret: (providerId: ProviderId) => Promise<ProviderConfig[]>;
    runProviderHealthCheck: (providerId: ProviderId) => Promise<AiProviderHealthCheckResponse>;
    getAiRuntimeSummary: () => Promise<AiRuntimeSummaryItem[]>;
    getAiObservability: () => Promise<AiObservabilitySnapshot>;
    getCodexAuthStatus: () => Promise<CodexAuthStatus>;
    startCodexLogin: () => Promise<CodexAuthStatus>;
    startCodexDeviceLogin: () => Promise<CodexAuthStatus>;
    logoutCodex: () => Promise<CodexAuthStatus>;
  };
};
