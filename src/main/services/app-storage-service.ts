import type { AppState, ApplyConversationActionPreviewsResult, LearningPlanDraft, ProviderConfig, ProviderId, ProviderSecretInput, UserProfile } from '../../shared/app-state.js';
import type { AiRuntimeSummaryItem } from '../../shared/ai-service.js';
import { applyAcceptedConversationActionPreviews, resolveConversationState, seedState } from '../../shared/app-state.js';
import type { LearningGoalInput } from '../../shared/goal.js';
import { createPlanDraft, createPlanSnapshot, ensurePlanDrafts, getNextSnapshotVersion } from '../../shared/plan-draft.js';
import type { ProviderConfigInput } from '../../shared/provider-config.js';
import { normalizeSecretInput, toSafeProviderConfig } from '../../shared/provider-config.js';
import { AppStateRepository } from '../repositories/app-state-repository.js';
import { EntitiesRepository } from '../repositories/entities-repository.js';
import { ProviderSecretRepository } from '../repositories/provider-secret-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import type { AiRuntimeService } from './ai-service.js';

export class AppStorageService {
  constructor(
    private readonly appStateRepository: AppStateRepository,
    private readonly entitiesRepository: EntitiesRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly providerSecretRepository: ProviderSecretRepository,
    private readonly aiService: AiRuntimeService,
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
    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      goals: persistedGoals,
      plan: nextPlanState,
      conversation: snapshot.conversation,
    }));

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
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

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
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

  regenerateLearningPlanDraft(goalId: string, snapshotDraft?: LearningPlanDraft | null) {
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
    const regeneratedDraft = this.normalizeLearningPlanDraft(
      {
        ...createPlanDraft(targetGoal, snapshot.profile, 'regenerated'),
        id: previousDraft.id,
        goalId: previousDraft.goalId,
      },
      previousDraft,
    );

    const nextState = this.sanitizeState(this.hydratePlanState({
      ...snapshot,
      plan: {
        ...snapshot.plan,
        drafts: snapshot.plan.drafts.map((item) => (item.id === previousDraft.id ? regeneratedDraft : item)),
        snapshots: [archivedSnapshot, ...snapshot.plan.snapshots],
      },
    }));

    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);
    return this.loadAppState();
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

    const nextState = this.sanitizeState(this.hydratePlanState(result.state));
    this.persistStructuredState(nextState);
    this.appStateRepository.save(nextState);

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

  getAiRuntimeSummary(): AiRuntimeSummaryItem[] {
    return this.aiService.getRuntimeSummary(this.loadAppState().settings);
  }

  private loadStructuredState(): AppState | null {
    const profile = this.entitiesRepository.loadUserProfile();
    const goals = this.entitiesRepository.loadLearningGoals();
    const plan = this.entitiesRepository.loadLearningPlanState();

    if (!profile || !plan) {
      return null;
    }

    const snapshot = this.appStateRepository.load() ?? seedState;
    return this.hydratePlanState({
      ...snapshot,
      profile,
      goals,
      plan,
      settings: this.settingsRepository.loadSettings() ?? snapshot.settings,
    });
  }

  private persistStructuredState(state: AppState) {
    this.entitiesRepository.saveUserProfile(state.profile);
    this.entitiesRepository.replaceLearningGoals(state.goals);
    this.entitiesRepository.saveLearningPlanState(state.plan);
    this.settingsRepository.saveSettings(state.settings);
  }

  private hydratePlanState(state: AppState): AppState {
    const nextPlanState = ensurePlanDrafts(state.goals, state.plan, state.profile);
    return this.withResolvedConversationState({
      ...state,
      plan: nextPlanState,
    });
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

  private withResolvedConversationState(state: AppState): AppState {
    return {
      ...state,
      conversation: resolveConversationState(state),
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
          note: task.note.trim(),
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
        note: task.note.trim(),
      })),
      updatedAt: draft.updatedAt ?? fallback.updatedAt,
    };
  }
}
