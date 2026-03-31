import type {
  AppState,
  ApplyConversationActionPreviewsResult,
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
} from '../../shared/app-state.js';
import type {
  AiObservabilitySnapshot,
  AiDailyPlanGenerationResult,
  AiPlanGenerationResult,
  AiProfileExtractionResult,
  AiProviderHealthCheckResponse,
  AiRequest,
  AiResult,
  AiRuntimeSummaryItem,
  AiTextResult,
} from '../../shared/ai-service.js';
import type { CodexAuthStatus } from '../../shared/codex-auth.js';
import {
  applyAcceptedConversationActionPreviews,
  createEmptyAppState,
  normalizeUserProfile,
  resolveConversationState,
  saveReflectionEntry as applyReflectionEntrySave,
  saveTodayPlanningContext as applyTodayPlanningContextSave,
  syncExecutionDerivedState,
  updatePlanTaskStatus as applyPlanTaskStatusUpdate,
  updateTodayPlanStepStatus as applyTodayPlanStepStatusUpdate,
  ROUGH_PLAN_STALE_TAG,
} from '../../shared/app-state.js';
import type { LearningGoalInput } from '../../shared/goal.js';
import {
  DEFAULT_MAIN_GOAL_WEIGHT,
  inferLearningGoalDomain,
  normalizeGoalScheduleWeight,
  resolveGoalScheduling,
} from '../../shared/goal.js';
import { buildDomainTodayPlanTemplate } from '../../shared/domain-rules.js';
import {
  buildPlanningConfirmationHighlights,
  derivePlanningConfirmation,
} from '../../shared/onboarding.js';
import type { CompleteInitialOnboardingPayload, CompleteInitialOnboardingResult, InitialOnboardingSummary } from '../../shared/onboarding.js';
import { createPlanDraft, createPlanSnapshot, ensurePlanDrafts, getNextSnapshotVersion } from '../../shared/plan-draft.js';
import type { ProviderConfigInput } from '../../shared/provider-config.js';
import { normalizeSecretInput, toSafeProviderConfig } from '../../shared/provider-config.js';
import { buildDashboardGoalScheduling } from '../../shared/scheduling.js';
import { AiRequestLogRepository } from '../repositories/ai-request-log-repository.js';
import { AppStateRepository } from '../repositories/app-state-repository.js';
import { EntitiesRepository } from '../repositories/entities-repository.js';
import { ProviderSecretRepository } from '../repositories/provider-secret-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import type { CodexAuthRuntimeService } from './codex-cli-auth-service.js';
import { normalizeAppStateConsistency, type AppStateConsistencyIssue } from './state-consistency.js';
import type { AiRuntimeService } from './ai-service.js';

const capabilityRouteKeyMap = {
  profile_extraction: 'profileExtraction',
  plan_generation: 'planGeneration',
  daily_plan_generation: 'planGeneration',
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
    private readonly codexCliAuthService: CodexAuthRuntimeService,
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

    const initialState = this.withProviderSecrets(this.prepareState(createEmptyAppState()).state);
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

    const hydratedFromSnapshot = this.prepareState(createEmptyAppState()).state;
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
    if (profile) return normalizeUserProfile(profile);

    const snapshot = this.loadAppState();
    this.entitiesRepository.saveUserProfile(snapshot.profile);
    return snapshot.profile;
  }

  saveUserProfile(profile: UserProfile) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.prepareState({
      ...snapshot,
      profile: normalizeUserProfile(profile),
    }).state);

    this.persistStateAtomically(nextState);
    return this.loadUserProfile();
  }

  async completeInitialOnboarding(payload: CompleteInitialOnboardingPayload): Promise<CompleteInitialOnboardingResult> {
    const snapshot = this.loadAppState();
    const goalId = snapshot.plan.activeGoalId || snapshot.goals[0]?.id || `goal-${Date.now()}`;
    const existingGoal = snapshot.goals.find((goal) => goal.id === goalId) ?? snapshot.goals[0] ?? null;
    const planningConfirmation = derivePlanningConfirmation({
      pacePreference: payload.pacePreference,
      personalityTraits: payload.personalityTraits,
      mbti: payload.mbti,
      motivationStyle: payload.motivationStyle,
      stressResponse: payload.stressResponse,
      feedbackPreference: payload.feedbackPreference,
    });
    const nextProfile = normalizeUserProfile({
      ...snapshot.profile,
      identity: payload.baseline,
      timeBudget: payload.timeBudget,
      bestStudyWindow: payload.bestStudyWindow,
      pacePreference: payload.pacePreference,
      ageBracket: payload.ageBracket,
      gender: payload.gender,
      personalityTraits: payload.personalityTraits,
      mbti: payload.mbti,
      motivationStyle: payload.motivationStyle,
      stressResponse: payload.stressResponse,
      feedbackPreference: payload.feedbackPreference,
      planningStyle: planningConfirmation.planningStyle,
      decisionSupportLevel: planningConfirmation.decisionSupportLevel,
      feedbackTone: planningConfirmation.feedbackTone,
      autonomyPreference: planningConfirmation.autonomyPreference,
    });
    const nextGoal = {
      id: goalId,
      title: payload.goalTitle.trim(),
      motivation: existingGoal?.motivation ?? `希望系统化推进 ${payload.goalTitle.trim()}。`,
      baseline: payload.baseline.trim(),
      cycle: payload.cycle.trim() || existingGoal?.cycle || '6 周',
      successMetric: existingGoal?.successMetric ?? `完成一个能证明「${payload.goalTitle.trim()}」学习结果的真实成果。`,
      priority: existingGoal?.priority ?? 'P1',
      status: 'active' as const,
      domain: existingGoal?.domain ?? inferLearningGoalDomain({
        title: payload.goalTitle.trim(),
        baseline: payload.baseline.trim(),
        successMetric: existingGoal?.successMetric ?? `完成一个能证明「${payload.goalTitle.trim()}」学习结果的真实成果。`,
      }),
      role: 'main' as const,
      scheduleWeight: existingGoal?.scheduleWeight ?? DEFAULT_MAIN_GOAL_WEIGHT,
    };
    const nextGoals = snapshot.goals.some((goal) => goal.id === goalId)
      ? snapshot.goals.map((goal) => (goal.id === goalId ? nextGoal : goal))
      : [...snapshot.goals, nextGoal];
    const scheduledGoals = resolveGoalScheduling(nextGoals, goalId);
    const ensuredPlanState = ensurePlanDrafts(scheduledGoals.goals, { ...snapshot.plan, activeGoalId: scheduledGoals.activeGoalId }, nextProfile);
    const scheduling = buildDashboardGoalScheduling(scheduledGoals.goals, ensuredPlanState, nextProfile.timeBudget);
    const baseDraft = ensuredPlanState.drafts.find((draft) => draft.goalId === goalId) ?? createPlanDraft(nextGoal, nextProfile);
    const routedProvider = this.describeRoutedProvider(snapshot.settings, 'plan_generation');

    let planSource: CompleteInitialOnboardingResult['planSource'] = 'template_fallback';
    let providerLabel = routedProvider.providerLabel;
    let fallbackReason: string | undefined;
    let nextDraft = createPlanDraft(nextGoal, nextProfile);

    try {
      const result = await this.executeLoggedCapabilityRequest(snapshot, {
        capability: 'plan_generation',
        goal: nextGoal,
        profile: nextProfile,
        currentDraft: null,
        scheduling,
      }, (value) => {
        if (value.capability !== 'plan_generation') {
          throw new Error('计划生成返回了意外结果。');
        }
        return value;
      });

      planSource = 'ai';
      providerLabel = result.providerLabel;
      nextDraft = this.normalizeLearningPlanDraft({
        ...baseDraft,
        title: result.draft.title,
        summary: result.draft.summary,
        basis: result.draft.basis,
        stages: result.draft.stages.map((stage) => ({
          title: stage.title,
          outcome: stage.outcome,
          progress: stage.progress ?? '未开始',
        })),
        milestones: result.draft.milestones,
        tasks: result.draft.tasks.map((task, index) => ({
          id: `${baseDraft.id}-ai-task-${index + 1}`,
          title: task.title,
          duration: task.duration,
          note: task.note,
          status: task.status ?? 'todo',
        })),
      }, baseDraft);
    } catch (error) {
      fallbackReason = error instanceof Error ? error.message : '计划生成失败，已降级为模板版路径。';
    }

    const nextState = this.sanitizeState(this.prepareState(this.withProviderHealthStatus({
      ...snapshot,
      profile: nextProfile,
      goals: scheduledGoals.goals,
      plan: {
        ...ensuredPlanState,
        activeGoalId: scheduledGoals.activeGoalId,
        drafts: ensuredPlanState.drafts.some((draft) => draft.goalId === goalId)
          ? ensuredPlanState.drafts.map((draft) => (draft.goalId === goalId ? nextDraft : draft))
          : [...ensuredPlanState.drafts, nextDraft],
      },
      conversation: {
        ...snapshot.conversation,
        tags: snapshot.conversation.tags.filter((tag) => tag !== ROUGH_PLAN_STALE_TAG),
      },
    }, routedProvider.providerId, planSource === 'ai' ? 'ready' : 'warning')).state);

    this.persistStateAtomically(nextState);

    const persistedState = this.loadAppState();
    const persistedDraft = persistedState.plan.drafts.find((draft) => draft.goalId === goalId) ?? nextDraft;

    return {
      state: persistedState,
      planSource,
      providerLabel,
      fallbackReason,
      summary: this.buildInitialOnboardingSummary(persistedState.profile, nextGoal.title, persistedDraft),
    };
  }

  upsertLearningGoal(goal: LearningGoalInput) {
    const snapshot = this.loadAppState();
    const goalId = goal.id?.trim() || `goal-${Date.now()}`;
    const existingGoal = snapshot.goals.find((item) => item.id === goalId);
    const requestedRole = goal.role ?? existingGoal?.role ?? (snapshot.goals.length ? 'secondary' : 'main');
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
      scheduleWeight: normalizeGoalScheduleWeight(
        goal.scheduleWeight ?? existingGoal?.scheduleWeight,
        requestedRole,
      ),
    };
    const draftGoals = snapshot.goals.some((item) => item.id === goalId)
      ? snapshot.goals.map((item) => (item.id === goalId ? nextGoal : item))
      : [...snapshot.goals, nextGoal];
    const scheduledGoals = resolveGoalScheduling(
      draftGoals,
      requestedRole === 'main' ? goalId : snapshot.plan.activeGoalId,
    );
    const nextPlanState = ensurePlanDrafts(
      scheduledGoals.goals,
      { ...snapshot.plan, activeGoalId: scheduledGoals.activeGoalId },
      snapshot.profile,
    );
    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      goals: scheduledGoals.goals,
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
    const scheduledGoals = resolveGoalScheduling(
      nextGoals,
      snapshot.plan.activeGoalId === goalId ? undefined : snapshot.plan.activeGoalId,
    );
    const nextPlanState = ensurePlanDrafts(
      scheduledGoals.goals,
      {
        activeGoalId: scheduledGoals.activeGoalId,
        drafts: snapshot.plan.drafts.filter((draft) => draft.goalId !== goalId),
        snapshots: snapshot.plan.snapshots.filter((planSnapshot) => planSnapshot.goalId !== goalId),
      },
      snapshot.profile,
    );

    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      goals: scheduledGoals.goals,
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

    const scheduledGoals = resolveGoalScheduling(snapshot.goals, goalId);
    const ensuredPlanState = ensurePlanDrafts(
      scheduledGoals.goals,
      { ...snapshot.plan, activeGoalId: scheduledGoals.activeGoalId },
      snapshot.profile,
    );
    const nextState = this.sanitizeState(this.withResolvedConversationState({
      ...snapshot,
      goals: scheduledGoals.goals,
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

  updateTodayPlanStepStatus(input: UpdateTodayPlanStepStatusInput) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.prepareState(applyTodayPlanStepStatusUpdate(snapshot, input)).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  saveReflectionEntry(input: SaveReflectionEntryInput) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.prepareState(applyReflectionEntrySave(snapshot, input)).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  saveTodayPlanningContext(input: SaveTodayPlanningContextInput) {
    const snapshot = this.loadAppState();
    const nextState = this.sanitizeState(this.prepareState(applyTodayPlanningContextSave(snapshot, input)).state);

    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  async generateTodayPlan(input: GenerateTodayPlanInput) {
    const snapshot = this.loadAppState();
    const goal = snapshot.goals.find((item) => item.id === input.goalId);
    const draft = snapshot.plan.drafts.find((item) => item.goalId === input.goalId);
    if (!goal || !draft) {
      throw new Error('目标对应的粗版计划不存在，无法生成今日计划。');
    }

    const scheduling = buildDashboardGoalScheduling(snapshot.goals, snapshot.plan, snapshot.profile.timeBudget);
    const routedProvider = this.describeRoutedProvider(snapshot.settings, 'daily_plan_generation');
    let nextPlan = this.buildFallbackTodayPlan(goal, draft, snapshot.profile);

    try {
      const result = await this.executeLoggedCapabilityRequest(snapshot, {
        capability: 'daily_plan_generation',
        goal,
        profile: snapshot.profile,
        currentDraft: draft,
        scheduling,
        todayContext: draft.todayContext,
      }, (value) => {
        if (value.capability !== 'daily_plan_generation') {
          throw new Error('今日计划生成返回了意外结果。');
        }
        return value;
      });

      nextPlan = this.normalizeTodayPlanResult(result, draft, goal, snapshot.profile);
      const nextState = this.sanitizeState(this.prepareState(this.withProviderHealthStatus({
        ...snapshot,
        plan: {
          ...snapshot.plan,
          drafts: snapshot.plan.drafts.map((item) => (
            item.goalId === input.goalId
              ? {
                ...item,
                todayPlan: nextPlan,
                updatedAt: new Date().toISOString(),
              }
              : item
          )),
        },
      }, routedProvider.providerId, 'ready')).state);

      this.persistStateAtomically(nextState);
      return this.loadAppState();
    } catch (error) {
      const nextState = this.sanitizeState(this.prepareState(this.withProviderHealthStatus({
        ...snapshot,
        plan: {
          ...snapshot.plan,
          drafts: snapshot.plan.drafts.map((item) => (
            item.goalId === input.goalId
              ? {
                ...item,
                todayPlan: nextPlan,
                updatedAt: new Date().toISOString(),
              }
              : item
          )),
        },
      }, routedProvider.providerId, 'warning')).state);

      this.persistStateAtomically(nextState);
      return this.loadAppState();
    }
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
    const scheduling = buildDashboardGoalScheduling(snapshot.goals, snapshot.plan, snapshot.profile.timeBudget);
    const request = {
      capability: 'plan_generation',
      goal: targetGoal,
      profile: snapshot.profile,
      currentDraft: previousDraft,
      scheduling,
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
      milestones: result.draft.milestones,
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
      conversation: {
        ...snapshot.conversation,
        tags: snapshot.conversation.tags.filter((tag) => tag !== ROUGH_PLAN_STALE_TAG),
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

  async getCodexAuthStatus() {
    const snapshot = this.loadAppState();
    return (await this.refreshCodexAuthStatus(snapshot)).status;
  }

  async startCodexLogin() {
    const snapshot = this.loadAppState();
    const status = await this.codexCliAuthService.startBrowserLogin();
    this.syncCodexProviderHealth(snapshot, status);
    return status;
  }

  async startCodexDeviceLogin() {
    const snapshot = this.loadAppState();
    const status = await this.codexCliAuthService.startDeviceLogin();
    this.syncCodexProviderHealth(snapshot, status);
    return status;
  }

  async logoutCodex() {
    const snapshot = this.loadAppState();
    const status = await this.codexCliAuthService.logout();
    this.syncCodexProviderHealth(snapshot, status);
    return status;
  }

  async getAiRuntimeSummary(): Promise<AiRuntimeSummaryItem[]> {
    const snapshot = this.loadAppState();
    const nextState = (await this.refreshCodexAuthStatus(snapshot)).state;
    return this.aiService.getRuntimeSummary(nextState.settings);
  }

  getAiObservability(): AiObservabilitySnapshot {
    return this.aiRequestLogRepository.getSnapshot();
  }

  async runProviderHealthCheck(providerId: ProviderId): Promise<AiProviderHealthCheckResponse> {
    const snapshot = providerId === 'codex'
      ? (await this.refreshCodexAuthStatus(this.loadAppState())).state
      : this.loadAppState();
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

    const emptyBaseState = createEmptyAppState();
    const prepared = this.prepareState(this.withSnapshotConversation({
      ...emptyBaseState,
      profile,
      goals,
      plan,
      reflection: {
        ...emptyBaseState.reflection,
        entries: this.entitiesRepository.loadReflectionEntries(),
      },
      settings: this.settingsRepository.loadSettings() ?? emptyBaseState.settings,
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
    const normalizedState = {
      ...state,
      profile: normalizeUserProfile(state.profile),
    } satisfies AppState;
    const normalized = normalizeAppStateConsistency(normalizedState);
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
    const preparedSnapshot = this.describeRoutedProvider(snapshot.settings, request.capability).providerId === 'codex'
      ? (await this.refreshCodexAuthStatus(snapshot)).state
      : snapshot;

    try {
      const result = validate(await this.aiService.execute(preparedSnapshot.settings, request));
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
      const routedProvider = this.describeRoutedProvider(preparedSnapshot.settings, request.capability);
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

  private async refreshCodexAuthStatus(snapshot: AppState) {
    const status = await this.codexCliAuthService.getStatus();
    return {
      status,
      state: this.syncCodexProviderHealth(snapshot, status),
    };
  }

  private syncCodexProviderHealth(state: AppState, status: CodexAuthStatus) {
    if (!state.settings.providers.some((provider) => provider.id === 'codex')) {
      return state;
    }

    const nextHealthStatus = this.mapCodexAuthStatusToHealthStatus(status);
    const currentHealthStatus = state.settings.providers.find((provider) => provider.id === 'codex')?.healthStatus;
    if (currentHealthStatus === nextHealthStatus) {
      return state;
    }

    const nextState = this.sanitizeState(this.withProviderHealthStatus(state, 'codex', nextHealthStatus));
    this.persistStateAtomically(nextState);
    return this.loadAppState();
  }

  private mapCodexAuthStatusToHealthStatus(status: CodexAuthStatus): ProviderConfig['healthStatus'] {
    switch (status.state) {
      case 'connected':
        return 'ready';
      case 'connecting':
        return 'unknown';
      case 'disconnected':
      case 'expired':
      case 'unavailable':
      default:
        return 'warning';
    }
  }

  private normalizeTodayPlanStep(
    step: Partial<NonNullable<LearningPlanDraft['todayPlan']>['steps'][number]>,
    index: number,
  ): NonNullable<LearningPlanDraft['todayPlan']>['steps'][number] {
    return {
      id: step.id?.trim() || `today-step-${index + 1}`,
      title: step.title?.trim() ?? '',
      detail: step.detail?.trim() ?? '',
      duration: step.duration?.trim() ?? '',
      status: step.status === 'in_progress' || step.status === 'done' || step.status === 'delayed' || step.status === 'skipped'
        ? step.status
        : 'todo',
      statusNote: step.statusNote?.trim() ?? '',
      statusUpdatedAt: step.statusUpdatedAt,
      dependencyStrategy: step.dependencyStrategy === 'compress_continue'
        || step.dependencyStrategy === 'wait_recovery'
        || step.dependencyStrategy === 'auto_reorder'
        ? step.dependencyStrategy
        : undefined,
    };
  }

  private normalizeTodayPlanStepList(
    steps: Array<Partial<NonNullable<LearningPlanDraft['todayPlan']>['steps'][number]>> | undefined,
  ) {
    return Array.isArray(steps)
      ? steps
        .map((step, index) => this.normalizeTodayPlanStep(step, index))
        .filter((step) => step.title || step.detail)
      : [];
  }

  private buildFallbackTodayPlan(
    goal: LearningGoalInput & { id?: string } | AppState['goals'][number],
    draft: LearningPlanDraft,
    profile: UserProfile,
  ): NonNullable<LearningPlanDraft['todayPlan']> {
    const firstMilestone = draft.milestones[0];
    const firstTask = draft.tasks[0];
    const domainTemplate = buildDomainTodayPlanTemplate(goal as AppState['goals'][number], draft, profile);

    return {
      date: new Date().toISOString().slice(0, 10),
      status: 'ready' as const,
      todayGoal: domainTemplate?.todayGoal ?? firstTask?.title ?? `围绕「${goal.title}」完成今天的最小闭环`,
      deliverable: domainTemplate?.deliverable ?? '完成一个能证明今天已推进的最小成果',
      estimatedDuration: domainTemplate?.estimatedDuration
        ?? draft.todayContext.availableDuration
        ?? firstTask?.duration
        ?? profile.timeBudget
        ?? '30 分钟',
      milestoneRef: firstMilestone?.title || '本周里程碑',
      steps: this.normalizeTodayPlanStepList(domainTemplate?.steps ?? [
        {
          title: '先确认今天的最小目标',
          detail: firstTask?.note || '先把今天要交付什么写清楚，再开始执行。',
          duration: '5 分钟',
        },
        {
          title: firstTask?.title || '完成今天的基础练习',
          detail: '按最小闭环推进，不额外扩展范围。',
          duration: firstTask?.duration || draft.todayContext.availableDuration || '20 分钟',
        },
      ]),
      tomorrowCandidates: [],
      resources: domainTemplate?.resources ?? [
        {
          title: '使用当前最熟悉的一份入门资料',
          url: '',
          reason: 'AI 不可用时，先沿用你最容易开始的资料，避免今天停在准备阶段。',
        },
      ],
      practice: domainTemplate?.practice ?? [
        {
          title: '完成一个最小练习',
          detail: '把今天的学习内容转成一个真实动作或脚本。',
          output: '保留一份可运行结果或文字记录',
        },
      ],
      generatedFromContext: {
        availableDuration: draft.todayContext.availableDuration || '',
        studyWindow: draft.todayContext.studyWindow || profile.bestStudyWindow || '',
        note: draft.todayContext.note || '',
      },
    };
  }

  private normalizeTodayPlanResult(
    result: AiDailyPlanGenerationResult,
    fallbackDraft: LearningPlanDraft,
    goal: AppState['goals'][number],
    profile: UserProfile,
  ): NonNullable<LearningPlanDraft['todayPlan']> {
    return {
      ...this.buildFallbackTodayPlan(goal, fallbackDraft, profile),
      ...result.plan,
      status: result.plan.status === 'stale' ? 'stale' : 'ready',
      steps: this.normalizeTodayPlanStepList(result.plan.steps),
      tomorrowCandidates: this.normalizeTodayPlanStepList(result.plan.tomorrowCandidates),
      resources: result.plan.resources.map((resource) => ({
        title: resource.title.trim(),
        url: resource.url.trim(),
        reason: resource.reason.trim(),
      })),
      practice: result.plan.practice.map((item) => ({
        title: item.title.trim(),
        detail: item.detail.trim(),
        output: item.output.trim(),
      })),
      generatedFromContext: {
        availableDuration: result.plan.generatedFromContext.availableDuration.trim(),
        studyWindow: result.plan.generatedFromContext.studyWindow.trim(),
        note: result.plan.generatedFromContext.note.trim(),
      },
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
      milestones: draft.milestones
        .map((milestone) => ({
          title: milestone.title.trim(),
          focus: milestone.focus.trim(),
          outcome: milestone.outcome.trim(),
          status: milestone.status,
        }))
        .filter((milestone) => milestone.title || milestone.focus || milestone.outcome),
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
      todayPlan: draft.todayPlan
        ? {
          ...draft.todayPlan,
          date: draft.todayPlan.date.trim(),
          todayGoal: draft.todayPlan.todayGoal.trim(),
          deliverable: draft.todayPlan.deliverable.trim(),
          estimatedDuration: draft.todayPlan.estimatedDuration.trim(),
          milestoneRef: draft.todayPlan.milestoneRef.trim(),
          steps: this.normalizeTodayPlanStepList(draft.todayPlan.steps),
          tomorrowCandidates: this.normalizeTodayPlanStepList(draft.todayPlan.tomorrowCandidates),
          resources: draft.todayPlan.resources.map((resource) => ({
            title: resource.title.trim(),
            url: resource.url.trim(),
            reason: resource.reason.trim(),
          })).filter((resource) => resource.title || resource.url),
          practice: draft.todayPlan.practice.map((item) => ({
            title: item.title.trim(),
            detail: item.detail.trim(),
            output: item.output.trim(),
          })).filter((item) => item.title || item.detail || item.output),
          generatedFromContext: {
            availableDuration: draft.todayPlan.generatedFromContext.availableDuration.trim(),
            studyWindow: draft.todayPlan.generatedFromContext.studyWindow.trim(),
            note: draft.todayPlan.generatedFromContext.note.trim(),
          },
        }
        : null,
      todayContext: {
        availableDuration: draft.todayContext.availableDuration.trim(),
        studyWindow: draft.todayContext.studyWindow.trim(),
        note: draft.todayContext.note.trim(),
        updatedAt: draft.todayContext.updatedAt.trim(),
      },
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
      milestones: draft.milestones.map((milestone) => ({
        title: milestone.title.trim(),
        focus: milestone.focus.trim(),
        outcome: milestone.outcome.trim(),
        status: milestone.status,
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

  private buildInitialOnboardingSummary(
    profile: UserProfile,
    goalTitle: string,
    draft: LearningPlanDraft,
  ): InitialOnboardingSummary {
    const personaHighlights = [
      profile.timeBudget ? `时间预算：${profile.timeBudget}` : null,
      profile.bestStudyWindow ? `学习窗口：${profile.bestStudyWindow}` : null,
      profile.pacePreference ? `推进节奏：${profile.pacePreference}` : null,
      profile.feedbackPreference ? `反馈方式：${profile.feedbackPreference}` : null,
      profile.mbti ? `MBTI：${profile.mbti}` : null,
      profile.personalityTraits[0] ? `性格关键词：${profile.personalityTraits[0]}` : null,
      profile.stressResponse ? `压力应对：${profile.stressResponse}` : null,
    ].filter(Boolean).slice(0, 3) as string[];
    const planningHighlights = buildPlanningConfirmationHighlights({
      planningStyle: profile.planningStyle,
      decisionSupportLevel: profile.decisionSupportLevel,
      feedbackTone: profile.feedbackTone,
      autonomyPreference: profile.autonomyPreference,
    });
    const firstTask = draft.tasks[0] ?? {
      title: '确认第一步任务',
      duration: '20 分钟',
      note: '先从最小动作开始。',
    };

    return {
      personaHighlights: personaHighlights.length ? personaHighlights : ['系统会先按低摩擦节奏启动，后续可继续补充画像。'],
      planningHighlights: planningHighlights.length ? planningHighlights : ['系统会先给出明确下一步，并在大调整前征求确认。'],
      goalTitle,
      planTitle: draft.title,
      planSummary: draft.summary,
      firstTaskTitle: firstTask.title,
      firstTaskDuration: firstTask.duration,
      firstTaskNote: firstTask.note,
    };
  }
}
