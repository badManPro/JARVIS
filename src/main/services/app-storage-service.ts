import type {
  AppState,
  ApplyConversationActionPreviewsResult,
  LearningPlanDraft,
  ProviderConfig,
  ProviderId,
  ProviderSecretInput,
  SaveReflectionEntryInput,
  UpdatePlanTaskStatusInput,
  UserProfile,
} from '../../shared/app-state.js';
import type {
  AiObservabilitySnapshot,
  AiPlanGenerationResult,
  AiProfileExtractionResult,
  AiProviderHealthCheckResponse,
  AiRequest,
  AiResult,
  AiRuntimeSummaryItem,
  AiTextResult,
} from '../../shared/ai-service.js';
import {
  applyAcceptedConversationActionPreviews,
  resolveConversationState,
  saveReflectionEntry as applyReflectionEntrySave,
  seedState,
  syncExecutionDerivedState,
  updatePlanTaskStatus as applyPlanTaskStatusUpdate,
} from '../../shared/app-state.js';
import type { LearningGoalInput } from '../../shared/goal.js';
import { createPlanSnapshot, ensurePlanDrafts, getNextSnapshotVersion } from '../../shared/plan-draft.js';
import type { ProviderConfigInput } from '../../shared/provider-config.js';
import { normalizeSecretInput, toSafeProviderConfig } from '../../shared/provider-config.js';
import { AiRequestLogRepository } from '../repositories/ai-request-log-repository.js';
import { AppStateRepository } from '../repositories/app-state-repository.js';
import { EntitiesRepository } from '../repositories/entities-repository.js';
import { ProviderSecretRepository } from '../repositories/provider-secret-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import { normalizeAppStateConsistency, type AppStateConsistencyIssue } from './state-consistency.js';
import type { AiRuntimeService } from './ai-service.js';

const capabilityRouteKeyMap = {
  profile_extraction: 'profileExtraction',
  plan_generation: 'planGeneration',
  plan_adjustment: 'planAdjustment',
  reflection_summary: 'reflectionSummary',
  chat_general: 'generalChat',
} satisfies Record<AiRequest['capability'], keyof AppState['settings']['routing']>;

export class AppStorageService {
  constructor(
    private readonly appStateRepository: AppStateRepository,
    private readonly entitiesRepository: EntitiesRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly providerSecretRepository: ProviderSecretRepository,
    private readonly aiRequestLogRepository: AiRequestLogRepository,
    private readonly aiService: AiRuntimeService,
  ) {}

  initialize() {
    const structured = this.loadStructuredState();
    if (structured) {
      const merged = this.withProviderSecrets(structured);
      this.appStateRepository.save(merged);
      return merged;
    }

    const legacySnapshot = this.appStateRepository.loadLegacyState();
    if (legacySnapshot) {
      const hydratedFromSnapshot = this.prepareState(legacySnapshot).state;
      const merged = this.withProviderSecrets(hydratedFromSnapshot);
      this.persistStateAtomically(merged);
      return merged;
    }

    const initialState = this.withProviderSecrets(this.prepareState(this.withSnapshotConversation(seedState)).state);
    this.persistStateAtomically(initialState);
    return initialState;
  }

  loadAppState() {
    const structured = this.loadStructuredState();
    if (structured) {
      const merged = this.withProviderSecrets(structured);
      this.appStateRepository.save(merged);
      return merged;
    }

    const legacySnapshot = this.appStateRepository.loadLegacyState();
    if (legacySnapshot) {
      const hydratedFromSnapshot = this.prepareState(legacySnapshot).state;
      const merged = this.withProviderSecrets(hydratedFromSnapshot);
      this.persistStateAtomically(merged);
      return merged;
    }

    const hydratedFromSnapshot = this.prepareState(this.withSnapshotConversation(seedState)).state;
    const merged = this.withProviderSecrets(hydratedFromSnapshot);
    this.persistStateAtomically(merged);
    return merged;
  }

  saveAppState(state: AppState) {
    const hydrated = this.prepareState(state).state;
    const sanitized = this.sanitizeState(hydrated);
    this.persistStateAtomically(sanitized);
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
    const nextState = this.sanitizeState(this.prepareState({
      ...snapshot,
      profile,
    }).state);

    this.persistStateAtomically(nextState);
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
    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      goals: persistedGoals,
      plan: nextPlanState,
      conversation: snapshot.conversation,
    }));

    this.persistStateAtomically(nextState);
    return this.loadAppState().goals;
  }

  removeLearningGoal(goalId: string) {
    const snapshot = this.loadAppState();
    const targetGoal = snapshot.goals.find((goal) => goal.id === goalId);
    if (!targetGoal) {
      throw new Error('目标不存在，无法删除。');
    }

    const nextGoals = snapshot.goals.filter((goal) => goal.id !== goalId);
    const nextPlanState = ensurePlanDrafts(
      nextGoals,
      {
        activeGoalId: snapshot.plan.activeGoalId === goalId ? (nextGoals[0]?.id ?? '') : snapshot.plan.activeGoalId,
        drafts: snapshot.plan.drafts.filter((draft) => draft.goalId !== goalId),
        snapshots: snapshot.plan.snapshots.filter((planSnapshot) => planSnapshot.goalId !== goalId),
      },
      snapshot.profile,
    );

    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      goals: nextGoals,
      plan: nextPlanState,
      conversation: snapshot.conversation,
    }));

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  setActiveGoal(goalId: string) {
    const snapshot = this.loadAppState();
    const targetGoal = snapshot.goals.find((goal) => goal.id === goalId);
    if (!targetGoal) {
      throw new Error('目标不存在，无法设为当前目标。');
    }

    const ensuredPlanState = ensurePlanDrafts(snapshot.goals, { ...snapshot.plan, activeGoalId: goalId }, snapshot.profile);
    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      plan: ensuredPlanState,
      conversation: snapshot.conversation,
    }));

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  saveLearningPlanDraft(draft: LearningPlanDraft) {
    const snapshot = this.loadAppState();
    const previousDraft = snapshot.plan.drafts.find((item) => item.id === draft.id || item.goalId === draft.goalId);
    if (!previousDraft) {
      throw new Error('计划草案不存在，无法保存。');
    }

    const normalizedDraft = this.normalizeLearningPlanDraft(draft, previousDraft);
    const nextState = this.sanitizeState(this.prepareState({
      ...snapshot,
      plan: {
        ...snapshot.plan,
        drafts: snapshot.plan.drafts.map((item) => (item.id === previousDraft.id ? normalizedDraft : item)),
      },
    }).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  updatePlanTaskStatus(input: UpdatePlanTaskStatusInput) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.prepareState(applyPlanTaskStatusUpdate(snapshot, input)).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  saveReflectionEntry(input: SaveReflectionEntryInput) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.prepareState(applyReflectionEntrySave(snapshot, input)).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  async runProfileExtraction() {
    const snapshot = this.loadAppState();
    const providerId = snapshot.settings.routing.profileExtraction;
    const request = {
      capability: 'profile_extraction',
      conversation: snapshot.conversation,
      profile: snapshot.profile,
      goals: snapshot.goals,
      plan: snapshot.plan,
      reflection: snapshot.reflection,
    } satisfies Extract<AiRequest, { capability: 'profile_extraction' }>;

    let result: AiProfileExtractionResult;
    try {
      result = await this.executeLoggedCapabilityRequest(snapshot, request, (value) => {
        if (value.capability !== 'profile_extraction') {
          throw new Error('画像提取返回了意外结果。');
        }
        return value;
      });
    } catch (error) {
      this.persistProviderHealthStatus(snapshot, providerId, 'warning');
      throw error;
    }

    return this.persistConversationSuggestions(this.withProviderHealthStatus(snapshot, providerId, 'ready'), result.suggestions, 'replace');
  }

  async regenerateLearningPlanDraft(goalId: string, snapshotDraft?: LearningPlanDraft | null) {
    const snapshot = this.loadAppState();
    const targetGoal = snapshot.goals.find((goal) => goal.id === goalId);
    if (!targetGoal) {
      throw new Error('目标不存在，无法重新生成计划。');
    }

    const previousDraft = snapshot.plan.drafts.find((item) => item.goalId === goalId);
    if (!previousDraft) {
      throw new Error('计划草案不存在，无法重新生成。');
    }

    const archivedDraft = snapshotDraft
      ? this.normalizeSnapshotDraft(snapshotDraft, previousDraft)
      : this.normalizeSnapshotDraft(previousDraft, previousDraft);
    const nextSnapshotVersion = getNextSnapshotVersion(snapshot.plan.snapshots, goalId);
    const archivedSnapshot = createPlanSnapshot(archivedDraft, nextSnapshotVersion);
    const providerId = snapshot.settings.routing.planGeneration;
    const request = {
      capability: 'plan_generation',
      goal: targetGoal,
      profile: snapshot.profile,
      currentDraft: previousDraft,
    } satisfies Extract<AiRequest, { capability: 'plan_generation' }>;

    let result: AiPlanGenerationResult;
    try {
      result = await this.executeLoggedCapabilityRequest(snapshot, request, (value) => {
        if (value.capability !== 'plan_generation') {
          throw new Error('计划生成返回了意外结果。');
        }
        return value;
      });
    } catch (error) {
      this.persistProviderHealthStatus(snapshot, providerId, 'warning');
      throw error;
    }

    const regeneratedDraft = this.normalizeLearningPlanDraft({
      ...previousDraft,
      id: previousDraft.id,
      goalId: previousDraft.goalId,
      title: result.draft.title,
      summary: result.draft.summary,
      basis: result.draft.basis,
      stages: result.draft.stages.map((stage) => ({
        title: stage.title,
        outcome: stage.outcome,
        progress: stage.progress ?? '未开始',
      })),
      tasks: result.draft.tasks.map((task, index) => ({
        id: `${previousDraft.id}-ai-task-${index + 1}`,
        title: task.title,
        duration: task.duration,
        note: task.note,
        status: task.status ?? 'todo',
      })),
    }, previousDraft);

    const nextState = this.sanitizeState(this.prepareState(this.withProviderHealthStatus({
      ...snapshot,
      plan: {
        ...snapshot.plan,
        drafts: snapshot.plan.drafts.map((item) => (item.id === previousDraft.id ? regeneratedDraft : item)),
        snapshots: [archivedSnapshot, ...snapshot.plan.snapshots],
      },
    }, providerId, 'ready')).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  async generatePlanAdjustmentSuggestions(goalId: string) {
    const snapshot = this.loadAppState();
    const targetGoal = snapshot.goals.find((goal) => goal.id === goalId);
    if (!targetGoal) {
      throw new Error('目标不存在，无法生成计划调整建议。');
    }

    const currentDraft = snapshot.plan.drafts.find((draft) => draft.goalId === goalId);
    if (!currentDraft) {
      throw new Error('计划草案不存在，无法生成调整建议。');
    }

    const providerId = snapshot.settings.routing.planAdjustment;
    const request = {
      capability: 'plan_adjustment',
      goal: targetGoal,
      profile: snapshot.profile,
      currentDraft,
      reflection: snapshot.reflection,
      feedback: this.collectPlanAdjustmentFeedback(snapshot, currentDraft),
    } satisfies Extract<AiRequest, { capability: 'plan_adjustment' }>;

    let result: AiTextResult;
    try {
      result = await this.executeLoggedCapabilityRequest(snapshot, request, (value) => {
        if (value.capability !== 'plan_adjustment') {
          throw new Error('计划调整返回了意外结果。');
        }
        return value;
      });
    } catch (error) {
      this.persistProviderHealthStatus(snapshot, providerId, 'warning');
      throw error;
    }

    const suggestions = this.parseSuggestionText(result.text);
    return this.persistConversationSuggestions(this.withProviderHealthStatus(snapshot, providerId, 'ready'), suggestions, 'append');
  }

  applyAcceptedConversationActionPreviews(): ApplyConversationActionPreviewsResult {
    const snapshot = this.loadAppState();
    const result = applyAcceptedConversationActionPreviews(snapshot);

    if (!result.appliedActionIds.length) {
      return {
        ...result,
        state: snapshot,
      };
    }

    const nextState = this.sanitizeState(this.prepareState(result.state).state);
    this.persistStateAtomically(nextState);

    return {
      ...result,
      state: this.loadAppState(),
    };
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

    this.persistStateAtomically(nextState);

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

  getAiRuntimeSummary(): AiRuntimeSummaryItem[] {
    return this.aiService.getRuntimeSummary(this.loadAppState().settings);
  }

  getAiObservability(): AiObservabilitySnapshot {
    return this.aiRequestLogRepository.getSnapshot();
  }

  async runProviderHealthCheck(providerId: ProviderId): Promise<AiProviderHealthCheckResponse> {
    const snapshot = this.loadAppState();
    const result = await this.aiService.checkProviderHealth(snapshot.settings, providerId);
    const nextState = this.persistProviderHealthStatus(snapshot, providerId, result.healthStatus);

    return {
      providers: nextState.settings.providers,
      aiRuntimeSummary: this.aiService.getRuntimeSummary(nextState.settings),
      result,
    };
  }

  private loadStructuredState(): AppState | null {
    const profile = this.entitiesRepository.loadUserProfile();
    const goals = this.entitiesRepository.loadLearningGoals();
    const plan = this.entitiesRepository.loadLearningPlanState();

    if (!profile || !plan) {
      return null;
    }

    const prepared = this.prepareState(this.withSnapshotConversation({
      ...seedState,
      profile,
      goals,
      plan,
      reflection: {
        ...seedState.reflection,
        entries: this.entitiesRepository.loadReflectionEntries(),
      },
      settings: this.settingsRepository.loadSettings() ?? seedState.settings,
    }));

    if (prepared.repaired) {
      this.reportConsistencyIssues('structured-load', prepared.issues);
      this.appStateRepository.transaction(() => {
        this.persistStructuredState(prepared.state);
      });
    }

    return prepared.state;
  }

  private persistStateAtomically(state: AppState) {
    this.appStateRepository.transaction(() => {
      this.persistStructuredState(state);
      this.appStateRepository.save(state);
    });
  }

  private persistStructuredState(state: AppState) {
    this.entitiesRepository.saveUserProfile(state.profile);
    this.entitiesRepository.replaceLearningGoals(state.goals);
    this.entitiesRepository.saveLearningPlanState(state.plan);
    this.entitiesRepository.saveReflectionEntries(state.reflection.entries);
    this.settingsRepository.saveSettings(state.settings);
  }

  private prepareState(state: AppState) {
    const normalized = normalizeAppStateConsistency(state);
    return {
      ...normalized,
      state: syncExecutionDerivedState(this.withResolvedConversationState(normalized.state)),
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

  private reportConsistencyIssues(context: string, issues: AppStateConsistencyIssue[]) {
    if (!issues.length) {
      return;
    }

    console.warn(`[AppStorageService] repaired ${issues.length} consistency issue(s) during ${context}: ${issues.map((issue) => issue.message).join(' | ')}`);
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

  private withResolvedConversationState(state: AppState): AppState {
    return {
      ...state,
      conversation: resolveConversationState(state),
    };
  }

  private withSnapshotConversation(state: AppState): AppState {
    const snapshotConversation = this.appStateRepository.loadConversationState();
    if (!snapshotConversation) {
      return state;
    }

    return {
      ...state,
      conversation: snapshotConversation,
    };
  }

  private withProviderHealthStatus(
    state: AppState,
    providerId: ProviderId,
    healthStatus: ProviderConfig['healthStatus'],
  ): AppState {
    if (!state.settings.providers.some((provider) => provider.id === providerId)) {
      return state;
    }

    return {
      ...state,
      settings: {
        ...state.settings,
        providers: state.settings.providers.map((provider) => (
          provider.id === providerId
            ? { ...provider, healthStatus }
            : provider
        )),
      },
    };
  }

  private persistProviderHealthStatus(
    state: AppState,
    providerId: ProviderId,
    healthStatus: ProviderConfig['healthStatus'],
  ) {
    const nextState = this.sanitizeState(this.withProviderHealthStatus(state, providerId, healthStatus));
    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  private persistConversationSuggestions(
    state: AppState,
    suggestions: string[],
    mode: 'replace' | 'append',
  ) {
    const normalizedSuggestions = this.dedupeSuggestions(suggestions);
    if (!normalizedSuggestions.length) {
      throw new Error('Provider 未返回可用于预览的建议。');
    }

    const nextSuggestions = mode === 'append'
      ? this.dedupeSuggestions([...state.conversation.suggestions, ...normalizedSuggestions])
      : normalizedSuggestions;

    const nextState = this.sanitizeState(this.prepareState({
      ...state,
      conversation: {
        ...state.conversation,
        suggestions: nextSuggestions,
      },
    }).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  private parseSuggestionText(text: string) {
    return this.dedupeSuggestions(text
      .split('\n')
      .map((line) => line.trim().replace(/^[*-]\s*/, '').replace(/^\d+[.)、]\s*/, ''))
      .filter(Boolean));
  }

  private dedupeSuggestions(values: string[]) {
    return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
  }

  private async executeLoggedCapabilityRequest<T extends AiResult>(
    snapshot: AppState,
    request: AiRequest,
    validate: (result: AiResult) => T,
  ): Promise<T> {
    const startedAt = new Date();

    try {
      const result = validate(await this.aiService.execute(snapshot.settings, request));
      const finishedAt = new Date();
      this.aiRequestLogRepository.record({
        capability: request.capability,
        providerId: result.providerId,
        providerLabel: result.providerLabel,
        model: result.model,
        status: 'success',
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
      });
      return result;
    } catch (error) {
      const finishedAt = new Date();
      const routedProvider = this.describeRoutedProvider(snapshot.settings, request.capability);
      this.aiRequestLogRepository.record({
        capability: request.capability,
        providerId: routedProvider.providerId,
        providerLabel: routedProvider.providerLabel,
        model: routedProvider.model,
        status: 'error',
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        errorMessage: error instanceof Error ? error.message : '未知 AI runtime 错误。',
      });
      throw error;
    }
  }

  private collectPlanAdjustmentFeedback(state: AppState, draft: LearningPlanDraft) {
    const taskFeedback = draft.tasks
      .filter((task) => task.status === 'delayed' || task.status === 'in_progress' || task.status === 'skipped')
      .map((task) => `任务反馈：${task.title} 当前状态为 ${task.status}${task.statusNote ? `，备注：${task.statusNote}` : ''}`);
    const reflectionFeedback = state.reflection.entries.flatMap((entry) => [
      entry.deviation ? `${entry.label}偏差：${entry.deviation}` : null,
      entry.insight ? `${entry.label}洞察：${entry.insight}` : null,
      ...entry.followUpActions.map((item) => `${entry.label}后续动作：${item}`),
    ].filter(Boolean) as string[]);

    const feedback = this.dedupeSuggestions([
      state.reflection.deviation,
      state.reflection.insight,
      ...state.reflection.nextActions.map((item) => `复盘建议：${item}`),
      ...reflectionFeedback,
      ...taskFeedback,
    ]);

    if (!feedback.length) {
      throw new Error('当前缺少可用于计划调整的反馈。');
    }

    return feedback;
  }

  private describeRoutedProvider(settings: AppState['settings'], capability: AiRequest['capability']) {
    const routeKey = capabilityRouteKeyMap[capability];
    const providerId = settings.routing[routeKey];
    const provider = settings.providers.find((item) => item.id === providerId);

    return {
      providerId,
      providerLabel: provider?.label ?? providerId,
      model: provider?.model ?? 'unknown',
    };
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
          status: task.status ?? 'todo',
          note: task.note.trim(),
          statusNote: task.statusNote?.trim() ?? '',
          statusUpdatedAt: task.statusUpdatedAt,
        }))
        .filter((task) => task.title || task.note),
      updatedAt: new Date().toISOString(),
    };
  }

  private normalizeSnapshotDraft(draft: LearningPlanDraft, fallback: LearningPlanDraft): LearningPlanDraft {
    return {
      ...fallback,
      ...draft,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      basis: draft.basis.map((item) => item.trim()).filter(Boolean),
      stages: draft.stages.map((stage) => ({
        title: stage.title.trim(),
        outcome: stage.outcome.trim(),
        progress: stage.progress.trim() || '未开始',
      })),
      tasks: draft.tasks.map((task, index) => ({
        ...task,
        id: task.id?.trim() || `${fallback.id}-snapshot-task-${index + 1}`,
        title: task.title.trim(),
        duration: task.duration.trim(),
        status: task.status ?? 'todo',
        note: task.note.trim(),
        statusNote: task.statusNote?.trim() ?? '',
        statusUpdatedAt: task.statusUpdatedAt,
      })),
      updatedAt: draft.updatedAt ?? fallback.updatedAt,
    };
  }
}
