import type { AppState, LearningGoal, LearningPlanDraft, LearningPlanState, ModelCapability, ProviderConfig, ProviderId, UserProfile } from './app-state.js';

export type AiRuntimeSummaryItem = {
  capability: ModelCapability;
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  ready: boolean;
  healthStatus: ProviderConfig['healthStatus'];
  healthHint?: string;
  blockedReason?: string;
};

export type AiProviderHealthCheckResult = {
  providerId: ProviderId;
  providerLabel: string;
  healthStatus: ProviderConfig['healthStatus'];
  message: string;
  checkedAt: string;
};

export type AiProviderHealthCheckResponse = {
  providers: ProviderConfig[];
  aiRuntimeSummary: AiRuntimeSummaryItem[];
  result: AiProviderHealthCheckResult;
};

export type AiProviderRuntimeConfig = {
  id: ProviderId;
  label: string;
  endpoint: string;
  model: string;
  authMode: ProviderConfig['authMode'];
  capabilityTags: ModelCapability[];
  healthStatus: ProviderConfig['healthStatus'];
  secret: string | null;
};

export type AiPlanGenerationRequest = {
  capability: 'plan_generation';
  goal: LearningGoal;
  profile: UserProfile;
  currentDraft?: LearningPlanDraft | null;
};

export type AiProfileExtractionRequest = {
  capability: 'profile_extraction';
  conversation: AppState['conversation'];
  profile: UserProfile;
  goals: AppState['goals'];
  plan: LearningPlanState;
  reflection: AppState['reflection'];
};

export type AiPlanAdjustmentRequest = {
  capability: 'plan_adjustment';
  goal: LearningGoal;
  profile: UserProfile;
  currentDraft: LearningPlanDraft;
  reflection: AppState['reflection'];
  feedback: string[];
};

export type AiReflectionSummaryRequest = {
  capability: 'reflection_summary';
  reflection: AppState['reflection'];
  profile: UserProfile;
  goals: AppState['goals'];
};

export type AiChatGeneralRequest = {
  capability: 'chat_general';
  messages: AppState['conversation']['messages'];
};

export type AiRequest =
  | AiPlanGenerationRequest
  | AiProfileExtractionRequest
  | AiPlanAdjustmentRequest
  | AiReflectionSummaryRequest
  | AiChatGeneralRequest;

export type AiPlanGenerationResult = {
  capability: 'plan_generation';
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  draft: {
    title: string;
    summary: string;
    basis: string[];
    stages: Array<{
      title: string;
      outcome: string;
      progress?: string;
    }>;
    tasks: Array<{
      title: string;
      duration: string;
      note: string;
      status?: LearningPlanDraft['tasks'][number]['status'];
    }>;
  };
};

export type AiProfileExtractionResult = {
  capability: 'profile_extraction';
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  suggestions: string[];
};

export type AiTextResult = {
  capability: 'plan_adjustment' | 'reflection_summary' | 'chat_general';
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  text: string;
};

export type AiResult =
  | AiPlanGenerationResult
  | AiProfileExtractionResult
  | AiTextResult;

export type AiRequestLogStatus = 'success' | 'error';

export type AiRequestLogEntry = {
  id: string;
  capability: ModelCapability;
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  status: AiRequestLogStatus;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  errorMessage?: string;
};

export type AiCapabilityObservabilitySummary = {
  capability: ModelCapability;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  lastStatus?: AiRequestLogStatus;
  lastRequestedAt?: string;
  lastDurationMs?: number;
  lastErrorMessage?: string;
};

export type AiObservabilitySnapshot = {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  lastRequestedAt?: string;
  capabilitySummaries: AiCapabilityObservabilitySummary[];
  recentRequests: AiRequestLogEntry[];
};

export type AiProviderAdapter = {
  name: string;
  supports: (provider: AiProviderRuntimeConfig) => boolean;
  checkHealth: (input: {
    provider: AiProviderRuntimeConfig;
    signal?: AbortSignal;
  }) => Promise<{
    ok: boolean;
    message: string;
  }>;
  execute: (input: {
    provider: AiProviderRuntimeConfig;
    request: AiRequest;
    signal?: AbortSignal;
  }) => Promise<AiResult>;
};
