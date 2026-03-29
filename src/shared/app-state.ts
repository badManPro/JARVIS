export type ProviderId = 'openai' | 'codex' | 'glm' | 'kimi' | 'deepseek' | 'custom';
export type GoalStatus = 'active' | 'paused' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'delayed' | 'skipped';
export type HealthStatus = 'unknown' | 'ready' | 'warning';

export type ModelCapability =
  | 'profile_extraction'
  | 'plan_generation'
  | 'plan_adjustment'
  | 'reflection_summary'
  | 'chat_general';

export type ProviderConfig = {
  id: ProviderId;
  label: string;
  enabled: boolean;
  endpoint: string;
  model: string;
  authMode: 'apiKey' | 'bearer' | 'none';
  capabilityTags: ModelCapability[];
  healthStatus: HealthStatus;
  keyPreview: string;
  hasSecret: boolean;
  updatedAt?: string;
};

export type ProviderSecretInput = {
  providerId: ProviderId;
  secret: string | null;
};

export type UserProfile = {
  name: string;
  identity: string;
  timeBudget: string;
  pacePreference: string;
  strengths: string[];
  blockers: string[];
  bestStudyWindow: string;
  planImpact: string[];
  ageBracket: string;
  gender: string;
  personalityTraits: string[];
  mbti: string;
  motivationStyle: string;
  stressResponse: string;
  feedbackPreference: string;
};

export type LearningGoal = {
  id: string;
  title: string;
  motivation: string;
  baseline: string;
  cycle: string;
  successMetric: string;
  priority: 'P1' | 'P2' | 'P3';
  status: GoalStatus;
};

export type PlanTask = {
  id: string;
  title: string;
  duration: string;
  status: TaskStatus;
  note: string;
  statusNote?: string;
  statusUpdatedAt?: string;
};

export type LearningPlanStage = {
  title: string;
  outcome: string;
  progress: string;
};

export type LearningPlanDraft = {
  id: string;
  goalId: string;
  title: string;
  summary: string;
  basis: string[];
  stages: LearningPlanStage[];
  tasks: PlanTask[];
  updatedAt?: string;
};

export type PlanSnapshotSource = 'regenerated';

export type LearningPlanSnapshot = {
  id: string;
  draftId: string;
  goalId: string;
  version: number;
  source: PlanSnapshotSource;
  title: string;
  summary: string;
  basis: string[];
  stages: LearningPlanStage[];
  tasks: PlanTask[];
  createdAt: string;
};

export type LearningPlanState = {
  activeGoalId: string;
  drafts: LearningPlanDraft[];
  snapshots: LearningPlanSnapshot[];
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ConversationActionScope = 'profile' | 'goal' | 'plan';
export type ConversationActionKind = 'profile_update' | 'goal_update' | 'plan_update' | 'plan_generation' | 'unknown';
export type ConversationActionStatus = 'proposed' | 'pending' | 'applied';
export type ConversationActionReviewStatus = 'unreviewed' | 'accepted' | 'rejected';
export type ConversationActionSourceType = 'conversation_suggestion' | 'runtime_placeholder';

export type ConversationActionChange = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
};

export type ConversationActionExecution =
  | {
    type: 'profile_update';
    nextProfile: UserProfile;
  }
  | {
    type: 'goal_update';
    goalId: string;
    nextGoal: LearningGoal;
  }
  | {
    type: 'plan_update';
    goalId: string;
    draftId: string;
    nextDraft: LearningPlanDraft;
  };

export type ConversationActionPreview = {
  id: string;
  kind: ConversationActionKind;
  target: ConversationActionScope;
  scopes: ConversationActionScope[];
  status: ConversationActionStatus;
  sourceType: ConversationActionSourceType;
  sourceLabel: string;
  createdAt: string;
  appliedAt?: string;
  reviewable: boolean;
  reviewStatus: ConversationActionReviewStatus;
  reviewedAt?: string;
  title: string;
  summary: string;
  reason: string;
  sourceSuggestion: string;
  changes: ConversationActionChange[];
  execution?: ConversationActionExecution;
};

export type ApplyConversationActionPreviewsResult = {
  state: AppState;
  appliedActionIds: string[];
  skippedActionIds: string[];
};

export type ReflectionTaskExecution = {
  taskId: string;
  taskTitle: string;
  status: Exclude<TaskStatus, 'todo'>;
  note: string;
  updatedAt: string;
};

export type ReflectionPeriod = 'daily' | 'weekly' | 'stage';
export type ReflectionDifficultyFit = 'too_easy' | 'matched' | 'too_hard';
export type ReflectionTimeFit = 'insufficient' | 'matched' | 'overflow';

export type ReflectionEntry = {
  period: ReflectionPeriod;
  label: string;
  completedTasks: number;
  actualDuration: string;
  deviation: string;
  obstacle: string;
  difficultyFit: ReflectionDifficultyFit;
  timeFit: ReflectionTimeFit;
  moodScore: number;
  confidenceScore: number;
  accomplishmentScore: number;
  insight: string;
  nextActions: string[];
  followUpActions: string[];
  recentTaskExecutions: ReflectionTaskExecution[];
  updatedAt?: string;
};

export type SaveReflectionEntryInput = {
  period: ReflectionPeriod;
  obstacle: string;
  difficultyFit: ReflectionDifficultyFit;
  timeFit: ReflectionTimeFit;
  moodScore: number;
  confidenceScore: number;
  accomplishmentScore: number;
  insight: string;
  followUpActions: string[];
};

export type UpdatePlanTaskStatusInput = {
  draftId: string;
  taskId: string;
  status: TaskStatus;
  statusNote?: string;
};

export type DashboardPriorityActionKind = 'continue' | 'start' | 'review';
export type DashboardRiskLevel = 'high' | 'medium' | 'low';
export type DashboardOnboardingStepStatus = 'complete' | 'current' | 'pending';
export type DashboardOnboardingPage = 'today' | 'path' | 'profile' | 'settings';

export type DashboardPriorityAction = {
  kind: DashboardPriorityActionKind;
  title: string;
  detail: string;
  reason: string;
  duration: string;
  taskId?: string;
};

export type DashboardRiskSignal = {
  id: string;
  level: DashboardRiskLevel;
  title: string;
  detail: string;
  action: string;
};

export type DashboardOnboardingStep = {
  id: 'profile' | 'goal' | 'plan' | 'execution';
  title: string;
  detail: string;
  actionLabel: string;
  pageId: DashboardOnboardingPage;
  status: DashboardOnboardingStepStatus;
};

export type DashboardOnboardingState = {
  active: boolean;
  title: string;
  detail: string;
  completedCount: number;
  totalCount: number;
  steps: DashboardOnboardingStep[];
  optionalAction?: {
    label: string;
    detail: string;
    pageId: DashboardOnboardingPage;
  };
};

export type AppState = {
  profile: UserProfile;
  dashboard: {
    todayFocus: string;
    stage: string;
    duration: string;
    weeklyCompletion: number;
    streakDays: number;
    alerts: string[];
    quickActions: string[];
    reflectionSummary: string;
    priorityAction: DashboardPriorityAction;
    riskSignals: DashboardRiskSignal[];
    onboarding: DashboardOnboardingState;
  };
  goals: LearningGoal[];
  plan: LearningPlanState;
  conversation: {
    title: string;
    relatedGoal: string;
    relatedPlan: string;
    tags: string[];
    messages: ConversationMessage[];
    suggestions: string[];
    actionPreviews: ConversationActionPreview[];
  };
  reflection: {
    period: string;
    completedTasks: number;
    actualDuration: string;
    deviation: string;
    insight: string;
    nextActions: string[];
    recentTaskExecutions: ReflectionTaskExecution[];
    entries: ReflectionEntry[];
  };
  settings: {
    theme: string;
    startPage: string;
    providers: ProviderConfig[];
    routing: {
      profileExtraction: ProviderId;
      planGeneration: ProviderId;
      planAdjustment: ProviderId;
      reflectionSummary: ProviderId;
      generalChat: ProviderId;
    };
  };
};

export function createEmptyUserProfile(): UserProfile {
  return {
    name: '',
    identity: '',
    timeBudget: '',
    pacePreference: '',
    strengths: [],
    blockers: [],
    bestStudyWindow: '',
    planImpact: [],
    ageBracket: '',
    gender: '',
    personalityTraits: [],
    mbti: '',
    motivationStyle: '',
    stressResponse: '',
    feedbackPreference: '',
  };
}

export function normalizeUserProfile(profile?: Partial<UserProfile> | null): UserProfile {
  const fallback = createEmptyUserProfile();

  return {
    ...fallback,
    ...profile,
    name: profile?.name?.trim() ?? fallback.name,
    identity: profile?.identity?.trim() ?? fallback.identity,
    timeBudget: profile?.timeBudget?.trim() ?? fallback.timeBudget,
    pacePreference: profile?.pacePreference?.trim() ?? fallback.pacePreference,
    strengths: Array.isArray(profile?.strengths) ? profile.strengths.map((item) => item.trim()).filter(Boolean) : fallback.strengths,
    blockers: Array.isArray(profile?.blockers) ? profile.blockers.map((item) => item.trim()).filter(Boolean) : fallback.blockers,
    bestStudyWindow: profile?.bestStudyWindow?.trim() ?? fallback.bestStudyWindow,
    planImpact: Array.isArray(profile?.planImpact) ? profile.planImpact.map((item) => item.trim()).filter(Boolean) : fallback.planImpact,
    ageBracket: profile?.ageBracket?.trim() ?? fallback.ageBracket,
    gender: profile?.gender?.trim() ?? fallback.gender,
    personalityTraits: Array.isArray(profile?.personalityTraits) ? profile.personalityTraits.map((item) => item.trim()).filter(Boolean) : fallback.personalityTraits,
    mbti: profile?.mbti?.trim() ?? fallback.mbti,
    motivationStyle: profile?.motivationStyle?.trim() ?? fallback.motivationStyle,
    stressResponse: profile?.stressResponse?.trim() ?? fallback.stressResponse,
    feedbackPreference: profile?.feedbackPreference?.trim() ?? fallback.feedbackPreference,
  };
}

const EMPTY_RELATED_GOAL_LABEL = '暂未设置目标';
const EMPTY_RELATED_PLAN_LABEL = '暂无计划草案';
const DEFAULT_REFLECTION_PERIOD: ReflectionPeriod = 'stage';
const reflectionPeriods: ReflectionPeriod[] = ['daily', 'weekly', 'stage'];
const reflectionPeriodLabels = {
  daily: '日复盘',
  weekly: '周复盘',
  stage: '阶段复盘',
} satisfies Record<ReflectionPeriod, string>;

const defaultProviderConfigs: ProviderConfig[] = [
  { id: 'openai', label: 'OpenAI / GPT', enabled: true, endpoint: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', authMode: 'apiKey', capabilityTags: ['profile_extraction', 'plan_generation', 'chat_general'], healthStatus: 'ready', keyPreview: '未配置', hasSecret: false },
  { id: 'codex', label: 'OpenAI / Codex', enabled: false, endpoint: '', model: 'gpt-5.2-codex', authMode: 'none', capabilityTags: ['profile_extraction', 'plan_generation', 'plan_adjustment', 'reflection_summary', 'chat_general'], healthStatus: 'unknown', keyPreview: '无需 Secret', hasSecret: false },
  { id: 'glm', label: 'Zhipu / GLM', enabled: false, endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5', authMode: 'apiKey', capabilityTags: ['plan_adjustment', 'reflection_summary'], healthStatus: 'unknown', keyPreview: '未配置', hasSecret: false },
  { id: 'kimi', label: 'Moonshot / Kimi', enabled: false, endpoint: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', authMode: 'apiKey', capabilityTags: ['chat_general', 'reflection_summary'], healthStatus: 'unknown', keyPreview: '未配置', hasSecret: false },
  { id: 'deepseek', label: 'DeepSeek', enabled: false, endpoint: 'https://api.deepseek.com', model: 'deepseek-chat', authMode: 'apiKey', capabilityTags: ['plan_generation', 'plan_adjustment'], healthStatus: 'warning', keyPreview: '未配置', hasSecret: false },
];

const defaultRouting = {
  profileExtraction: 'openai',
  planGeneration: 'deepseek',
  planAdjustment: 'glm',
  reflectionSummary: 'kimi',
  generalChat: 'openai',
} satisfies AppState['settings']['routing'];

function getActiveConversationGoal(goals: LearningGoal[], activeGoalId: string) {
  return goals.find((goal) => goal.id === activeGoalId) ?? goals[0] ?? null;
}

function getActiveConversationDraft(plan: LearningPlanState) {
  return plan.drafts.find((draft) => draft.goalId === plan.activeGoalId) ?? plan.drafts[0] ?? null;
}

function cloneProviderConfigs(providers: ProviderConfig[]) {
  return providers.map((provider) => ({
    ...provider,
    capabilityTags: [...provider.capabilityTags],
  }));
}

function createDefaultSettings(): AppState['settings'] {
  return {
    theme: '跟随系统',
    startPage: '今日',
    providers: cloneProviderConfigs(defaultProviderConfigs),
    routing: {
      ...defaultRouting,
    },
  };
}

function createDashboardSkeleton(): AppState['dashboard'] {
  return {
    todayFocus: '开始对话建档',
    stage: '首次启动引导',
    duration: '3 分钟',
    weeklyCompletion: 0,
    streakDays: 0,
    alerts: [],
    quickActions: ['开始对话建档', '查看学习路径', '连接 Codex（可选）'],
    reflectionSummary: '当前还是首次启动空状态。先通过对话完成基础建档，再开始第一项任务。',
    priorityAction: {
      kind: 'start',
      title: '开始对话建档',
      detail: '先告诉系统你想学什么、现在什么水平、每周能投入多少，再生成第一版学习路径。',
      reason: '首次体验不应该要求你先理解页面结构，先产出第一步更重要。',
      duration: '3 分钟',
    },
    riskSignals: [],
    onboarding: {
      active: true,
      title: '首次启动引导',
      detail: '先补齐基础输入，再开始第一项任务。',
      completedCount: 0,
      totalCount: 4,
      steps: [],
    },
  };
}

export function createEmptyAppState(): AppState {
  const baseState: AppState = {
    profile: createEmptyUserProfile(),
    dashboard: createDashboardSkeleton(),
    goals: [],
    plan: {
      activeGoalId: '',
      drafts: [],
      snapshots: [],
    },
    conversation: {
      title: '开始你的第一次学习规划',
      relatedGoal: EMPTY_RELATED_GOAL_LABEL,
      relatedPlan: EMPTY_RELATED_PLAN_LABEL,
      tags: ['首次启动', '空状态'],
      messages: [],
      suggestions: [],
      actionPreviews: [],
    },
    reflection: {
      period: reflectionPeriodLabels[DEFAULT_REFLECTION_PERIOD],
      completedTasks: 0,
      actualDuration: '0 分钟',
      deviation: '当前周期还没有真实执行记录。',
      insight: '',
      nextActions: [],
      recentTaskExecutions: [],
      entries: reflectionPeriods.map((period) => createEmptyReflectionEntry(period)),
    },
    settings: createDefaultSettings(),
  };

  return {
    ...syncExecutionDerivedState(baseState),
    conversation: resolveConversationState(baseState),
  };
}

function normalizeTaskStatus(status?: string): TaskStatus {
  switch (status) {
    case 'todo':
    case 'in_progress':
    case 'done':
    case 'delayed':
    case 'skipped':
      return status;
    default:
      return 'todo';
  }
}

function normalizePlanTask(task: PlanTask): PlanTask {
  return {
    ...task,
    status: normalizeTaskStatus(task.status),
    statusNote: task.statusNote?.trim() ?? '',
    statusUpdatedAt: task.statusUpdatedAt,
  };
}

function normalizeReflectionDifficultyFit(value?: string): ReflectionDifficultyFit {
  switch (value) {
    case 'too_easy':
    case 'matched':
    case 'too_hard':
      return value;
    default:
      return 'matched';
  }
}

function normalizeReflectionTimeFit(value?: string): ReflectionTimeFit {
  switch (value) {
    case 'insufficient':
    case 'matched':
    case 'overflow':
      return value;
    default:
      return 'matched';
  }
}

function clampReflectionScore(value?: number) {
  if (!Number.isFinite(value)) {
    return 3;
  }

  return Math.max(1, Math.min(5, Math.round(value ?? 3)));
}

function createEmptyReflectionEntry(period: ReflectionPeriod): ReflectionEntry {
  return {
    period,
    label: reflectionPeriodLabels[period],
    completedTasks: 0,
    actualDuration: '0 分钟',
    deviation: '当前周期还没有真实执行记录。',
    obstacle: '',
    difficultyFit: 'matched',
    timeFit: 'matched',
    moodScore: 3,
    confidenceScore: 3,
    accomplishmentScore: 3,
    insight: '',
    nextActions: [],
    followUpActions: [],
    recentTaskExecutions: [],
  };
}

function normalizeReflectionEntry(entry: Partial<ReflectionEntry> & Pick<ReflectionEntry, 'period'>): ReflectionEntry {
  const fallback = createEmptyReflectionEntry(entry.period);
  return {
    ...fallback,
    ...entry,
    label: reflectionPeriodLabels[entry.period],
    obstacle: entry.obstacle?.trim() ?? '',
    difficultyFit: normalizeReflectionDifficultyFit(entry.difficultyFit),
    timeFit: normalizeReflectionTimeFit(entry.timeFit),
    moodScore: clampReflectionScore(entry.moodScore),
    confidenceScore: clampReflectionScore(entry.confidenceScore),
    accomplishmentScore: clampReflectionScore(entry.accomplishmentScore),
    insight: entry.insight?.trim() ?? '',
    nextActions: Array.from(new Set((entry.nextActions ?? []).map((item) => item.trim()).filter(Boolean))),
    followUpActions: Array.from(new Set((entry.followUpActions ?? []).map((item) => item.trim()).filter(Boolean))),
    recentTaskExecutions: entry.recentTaskExecutions ?? [],
    updatedAt: entry.updatedAt,
  };
}

function resolveReflectionEntries(reflection: Partial<AppState['reflection']>): ReflectionEntry[] {
  const providedEntries = Array.isArray(reflection.entries) ? reflection.entries : [];
  const legacyObstacle = reflection.deviation?.trim() ?? '';
  const legacyInsight = reflection.insight?.trim() ?? '';
  const legacyActions = Array.isArray(reflection.nextActions) ? reflection.nextActions : [];

  return reflectionPeriods.map((period) => {
    const provided = providedEntries.find((entry) => entry.period === period);
    if (provided) {
      return normalizeReflectionEntry(provided);
    }

    if (period === 'weekly' || period === 'stage') {
      return normalizeReflectionEntry({
        period,
        obstacle: legacyObstacle,
        insight: legacyInsight,
        followUpActions: legacyActions,
      });
    }

    return createEmptyReflectionEntry(period);
  });
}

function parseTaskDurationMinutes(duration: string) {
  const normalized = duration.trim();
  if (!normalized) {
    return 0;
  }

  const hourRangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*小时/);
  if (hourRangeMatch) {
    const start = Number(hourRangeMatch[1]);
    const end = Number(hourRangeMatch[2]);
    return Math.round(((start + end) / 2) * 60);
  }

  const minuteRangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*分钟?/);
  if (minuteRangeMatch) {
    const start = Number(minuteRangeMatch[1]);
    const end = Number(minuteRangeMatch[2]);
    return Math.round((start + end) / 2);
  }

  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*小时/);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*分钟?/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (hours || minutes) {
    return Math.round((hours * 60) + minutes);
  }

  const fallbackNumber = normalized.match(/\d+(?:\.\d+)?/);
  return fallbackNumber ? Math.round(Number(fallbackNumber[0])) : 0;
}

function formatMinutes(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return '0 分钟';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) {
    return `${minutes} 分钟`;
  }

  if (!minutes) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

function pickCurrentStage(draft: LearningPlanDraft | null) {
  if (!draft) {
    return '暂无阶段';
  }

  return draft.stages.find((stage) => stage.progress !== '已完成')?.title
    ?? draft.stages[draft.stages.length - 1]?.title
    ?? draft.title;
}

function buildTaskStatusSummary(tasks: PlanTask[]) {
  const doneTasks = tasks.filter((task) => task.status === 'done');
  const delayedTasks = tasks.filter((task) => task.status === 'delayed');
  const skippedTasks = tasks.filter((task) => task.status === 'skipped');
  const inProgressTask = tasks.find((task) => task.status === 'in_progress') ?? null;
  const nextTodoTask = tasks.find((task) => task.status === 'todo') ?? null;

  return {
    total: tasks.length,
    doneTasks,
    delayedTasks,
    skippedTasks,
    inProgressTask,
    nextTodoTask,
  };
}

function buildTaskSummaryLine(tasks: PlanTask[]) {
  if (!tasks.length) {
    return '暂无任务';
  }

  return tasks
    .slice(0, 2)
    .map((task) => `${task.title}${task.statusNote ? `（${task.statusNote}）` : ''}`)
    .join('；');
}

function buildExecutionInsight(summary: ReturnType<typeof buildTaskStatusSummary>) {
  if (!summary.total) {
    return '当前周期还没有足够的执行记录，先完成一次真实任务后再做复盘。';
  }

  if (summary.delayedTasks.length || summary.skippedTasks.length) {
    return '当前执行节奏出现偏差，下一步应优先处理延后与跳过原因，再决定是否重排计划。';
  }

  if (summary.doneTasks.length === summary.total && summary.total > 0) {
    return '当前计划内任务已全部完成，可以进入复盘并准备下一轮调整。';
  }

  return '当前执行节奏基本稳定，继续保持单次任务可完成的推进方式。';
}

function buildRecentTaskExecutions(tasks: PlanTask[]): ReflectionTaskExecution[] {
  return tasks
    .filter((task): task is PlanTask & { statusUpdatedAt: string } => Boolean(task.statusUpdatedAt) && task.status !== 'todo')
    .sort((left, right) => new Date(right.statusUpdatedAt ?? 0).getTime() - new Date(left.statusUpdatedAt ?? 0).getTime())
    .map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      status: task.status as ReflectionTaskExecution['status'],
      note: task.statusNote?.trim() || task.note.trim(),
      updatedAt: task.statusUpdatedAt,
    }));
}

function isWithinRecentDays(timestamp: string, days: number, now: Date) {
  const current = new Date(timestamp);
  if (Number.isNaN(current.getTime())) {
    return false;
  }

  const diffMs = now.getTime() - current.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

function filterTasksForReflectionPeriod(tasks: PlanTask[], period: ReflectionPeriod, now: Date) {
  const normalizedTasks = tasks.map((task) => normalizePlanTask(task));

  switch (period) {
    case 'daily':
      return normalizedTasks.filter((task) => task.status !== 'todo' && Boolean(task.statusUpdatedAt) && isWithinRecentDays(task.statusUpdatedAt ?? '', 1, now));
    case 'weekly':
      return normalizedTasks.filter((task) => task.status !== 'todo' && Boolean(task.statusUpdatedAt) && isWithinRecentDays(task.statusUpdatedAt ?? '', 7, now));
    case 'stage':
    default:
      return normalizedTasks.filter((task) => task.status !== 'todo');
  }
}

function buildReflectionDeviation(
  summary: ReturnType<typeof buildTaskStatusSummary>,
  manualObstacle: string,
) {
  const executionDeviation = summary.delayedTasks.length || summary.skippedTasks.length
    ? [
      summary.delayedTasks.length ? `延后 ${summary.delayedTasks.length} 项：${buildTaskSummaryLine(summary.delayedTasks)}` : null,
      summary.skippedTasks.length ? `跳过 ${summary.skippedTasks.length} 项：${buildTaskSummaryLine(summary.skippedTasks)}` : null,
    ].filter(Boolean).join('；')
    : '';

  if (manualObstacle) {
    return [executionDeviation, manualObstacle].filter(Boolean).join('；');
  }

  if (executionDeviation) {
    return executionDeviation;
  }

  if (!summary.total) {
    return '当前周期还没有真实执行记录。';
  }

  return '当前没有跳过或延后任务，执行节奏基本稳定。';
}

function buildReflectionSuggestions(
  period: ReflectionPeriod,
  summary: ReturnType<typeof buildTaskStatusSummary>,
  manualEntry: ReflectionEntry,
) {
  const suggestions = [
    summary.delayedTasks[0] ? `优先处理延后任务：${summary.delayedTasks[0].title}` : null,
    summary.skippedTasks[0] ? `回看被跳过任务：${summary.skippedTasks[0].title}` : null,
    manualEntry.timeFit === 'insufficient' ? '下个周期减少并行事项，先为主线预留连续时间块' : null,
    manualEntry.timeFit === 'overflow' ? '下个周期可以适度加一点挑战，但保持任务可完成' : null,
    manualEntry.difficultyFit === 'too_hard' ? '把高难任务拆成更小的前置练习，再继续推进主线' : null,
    manualEntry.difficultyFit === 'too_easy' ? '可以补一项更有反馈的挑战任务，避免节奏过松' : null,
    manualEntry.moodScore <= 2 ? '先安排一项低阻力任务恢复节奏，再进入高负荷工作' : null,
    !summary.total
      ? (period === 'stage' ? '先完成一次真实任务流转，再补阶段复盘。' : `先记录一次${reflectionPeriodLabels[period]}内的真实执行，再完善复盘。`)
      : null,
  ];

  return Array.from(new Set(suggestions.map((item) => item?.trim() ?? '').filter(Boolean)));
}

function buildReflectionEntry(period: ReflectionPeriod, tasks: PlanTask[], manualEntry: ReflectionEntry, now: Date): ReflectionEntry {
  const scopedTasks = filterTasksForReflectionPeriod(tasks, period, now);
  const summary = buildTaskStatusSummary(scopedTasks);
  const totalMinutes = summary.doneTasks.reduce((minutes, task) => minutes + parseTaskDurationMinutes(task.duration), 0);
  const recentTaskExecutions = buildRecentTaskExecutions(scopedTasks);
  const systemSuggestions = buildReflectionSuggestions(period, summary, manualEntry);
  const nextActions = Array.from(new Set([...manualEntry.followUpActions, ...systemSuggestions].map((item) => item.trim()).filter(Boolean)));

  return {
    ...manualEntry,
    label: reflectionPeriodLabels[period],
    completedTasks: summary.doneTasks.length,
    actualDuration: formatMinutes(totalMinutes),
    deviation: buildReflectionDeviation(summary, manualEntry.obstacle),
    insight: manualEntry.insight || buildExecutionInsight(summary),
    nextActions,
    recentTaskExecutions,
  };
}

function buildPriorityAction(
  focusTask: PlanTask | null,
  stageTitle: string,
  summary: ReturnType<typeof buildTaskStatusSummary>,
  defaultReflectionEntry: ReflectionEntry,
  onboarding: DashboardOnboardingState,
): DashboardPriorityAction {
  if (focusTask) {
    const isInProgress = focusTask.status === 'in_progress';
    return {
      kind: isInProgress ? 'continue' : 'start',
      title: `${isInProgress ? '继续推进' : '开始执行'}：${focusTask.title}`,
      detail: focusTask.statusNote?.trim() || focusTask.note.trim() || `当前阶段：${stageTitle}`,
      reason: isInProgress
        ? '该任务已在进行中，先完成当前上下文能降低切换成本。'
        : `这是 ${stageTitle} 当前最直接的下一步。`,
      duration: focusTask.duration || '15 分钟',
      taskId: focusTask.id,
    };
  }

  if (onboarding.active) {
    const nextStep = onboarding.steps.find((step) => step.status !== 'complete') ?? onboarding.steps[0];
    return {
      kind: 'start',
      title: `完成首次设置：${nextStep?.actionLabel ?? '开始使用应用'}`,
      detail: nextStep?.detail ?? '先补齐基础输入，再开始第一项任务。',
      reason: '当前仍是首次启动空状态，先把画像、目标和计划骨架补齐，后续首页与对话才有真实上下文。',
      duration: nextStep?.id === 'execution' ? '15 分钟' : '10 分钟',
    };
  }

  return {
    kind: 'review',
    title: '查看复盘并准备下一阶段任务',
    detail: defaultReflectionEntry.insight || '当前没有待执行任务，先回看复盘与计划调整建议。',
    reason: summary.total
      ? '当前计划内任务已处理完成，下一步应该通过复盘决定新的推进重点。'
      : '当前还没有可执行任务，先通过复盘明确下一步。',
    duration: '15 分钟',
  };
}

function buildTaskRiskSignals(summary: ReturnType<typeof buildTaskStatusSummary>): DashboardRiskSignal[] {
  const signals: DashboardRiskSignal[] = [];

  const delayedTask = summary.delayedTasks[0];
  if (delayedTask) {
    signals.push({
      id: `task-delayed-${delayedTask.id}`,
      level: 'high',
      title: `已延后：${delayedTask.title}`,
      detail: delayedTask.statusNote?.trim() || delayedTask.note.trim() || '该任务未按计划推进，可能继续侵蚀当前阶段节奏。',
      action: `优先重排或拆小：${delayedTask.title}`,
    });
  }

  const skippedTask = summary.skippedTasks[0];
  if (skippedTask) {
    signals.push({
      id: `task-skipped-${skippedTask.id}`,
      level: 'high',
      title: `已跳过：${skippedTask.title}`,
      detail: skippedTask.statusNote?.trim() || skippedTask.note.trim() || '该任务被跳过，需补齐原因避免重复阻塞。',
      action: `在复盘中补充原因，并决定是否重新排入：${skippedTask.title}`,
    });
  }

  return signals;
}

function buildReflectionRiskSignals(entries: ReflectionEntry[]): DashboardRiskSignal[] {
  const signals: DashboardRiskSignal[] = [];

  for (const entry of entries) {
    if (entry.timeFit === 'insufficient') {
      signals.push({
        id: `reflection-time-${entry.period}`,
        level: 'medium',
        title: `${entry.label}时间预算不足`,
        detail: entry.obstacle || `${entry.label}可投入时间低于原计划，容易打断连续推进。`,
        action: '下个周期减少并行事项，先为主线预留连续时间块',
      });
    }

    if (entry.difficultyFit === 'too_hard') {
      signals.push({
        id: `reflection-difficulty-${entry.period}`,
        level: 'medium',
        title: `${entry.label}任务难度偏高`,
        detail: entry.insight || entry.obstacle || '当前任务粒度或前置条件偏大，推进成本持续偏高。',
        action: '把高难任务拆成更小的前置练习，再继续推进主线',
      });
    }

    if (entry.moodScore <= 2 || entry.confidenceScore <= 2) {
      signals.push({
        id: `reflection-state-${entry.period}`,
        level: 'medium',
        title: `${entry.label}当前状态偏低`,
        detail: entry.insight || entry.obstacle || '当前压力或自信度偏低，直接加码容易失速。',
        action: '先安排一项低阻力任务恢复节奏，再进入高负荷工作',
      });
    }

    if (!signals.length && entry.obstacle) {
      signals.push({
        id: `reflection-obstacle-${entry.period}`,
        level: 'medium',
        title: `${entry.label}存在稳定阻力`,
        detail: entry.obstacle,
        action: entry.nextActions[0] || '先按复盘建议收窄任务范围，再继续推进',
      });
    }
  }

  return signals;
}

function buildDashboardRiskSignals(
  summary: ReturnType<typeof buildTaskStatusSummary>,
  reflectionEntries: ReflectionEntry[],
  priorityAction: DashboardPriorityAction,
  onboarding: DashboardOnboardingState,
): DashboardRiskSignal[] {
  const combined = [
    ...buildTaskRiskSignals(summary),
    ...buildReflectionRiskSignals(reflectionEntries),
  ];

  if (!combined.length) {
    if (onboarding.active) {
      const nextStep = onboarding.steps.find((step) => step.status !== 'complete') ?? onboarding.steps[0];
      return [
        {
          id: 'first-run-setup',
          level: 'low',
          title: '首次设置尚未完成',
          detail: onboarding.detail,
          action: nextStep?.actionLabel ?? '返回首页查看引导',
        },
      ];
    }

    return [
      {
        id: 'focus-discipline',
        level: 'low',
        title: '当前无明显风险',
        detail: '执行节奏整体稳定，主要风险是任务切换过多打断连续性。',
        action: priorityAction.title,
      },
    ];
  }

  const seen = new Set<string>();
  return combined.filter((signal) => {
    if (seen.has(signal.id)) {
      return false;
    }
    seen.add(signal.id);
    return true;
  }).slice(0, 3);
}

function isProfileReady(profile: UserProfile) {
  return Boolean(
    profile.identity.trim()
    && profile.timeBudget.trim(),
  );
}

function hasConfiguredProvider(settings: AppState['settings']) {
  return settings.providers.some((provider) => provider.enabled && (provider.authMode === 'none' || provider.hasSecret));
}

function buildDashboardOnboarding(
  state: AppState,
  activeDraft: LearningPlanDraft | null,
  recentTaskExecutions: ReflectionTaskExecution[],
): DashboardOnboardingState {
  const profileReady = isProfileReady(state.profile);
  const hasGoals = state.goals.length > 0;
  const hasPlan = Boolean(activeDraft && activeDraft.tasks.length);
  const hasExecution = recentTaskExecutions.length > 0;
  const providerConfigured = hasConfiguredProvider(state.settings);

  const rawSteps: Array<Omit<DashboardOnboardingStep, 'status'> & { status: 'complete' | 'pending' }> = [
    {
      id: 'profile',
      title: '完成第一段建档',
      detail: '先通过对话说清想学什么、当前基础和时间预算，系统才能直接产出第一版路径。',
      actionLabel: '开始对话建档',
      pageId: 'today',
      status: profileReady ? 'complete' : 'pending',
    },
    {
      id: 'goal',
      title: '确认主目标',
      detail: '系统生成第一版目标后，只需要确认主线是否正确，不再要求你手工拆多层结构。',
      actionLabel: '查看学习路径',
      pageId: 'path',
      status: hasGoals ? 'complete' : 'pending',
    },
    {
      id: 'plan',
      title: '确认第一版路径',
      detail: '学习路径默认只展示当前阶段和最近几项任务，先确认第一步是否现实可做。',
      actionLabel: '查看当前路径',
      pageId: 'path',
      status: hasPlan ? 'complete' : 'pending',
    },
    {
      id: 'execution',
      title: '开始今天第一步',
      detail: '记录一次真实执行后，今日页和后续复盘才会开始消费真实节奏信号。',
      actionLabel: '开始今日任务',
      pageId: 'today',
      status: hasExecution ? 'complete' : 'pending',
    },
  ];

  let currentAssigned = false;
  const steps = rawSteps.map((step) => {
    if (step.status === 'pending' && !currentAssigned) {
      currentAssigned = true;
      return {
        ...step,
        status: 'current',
      } satisfies DashboardOnboardingStep;
    }

    return step satisfies DashboardOnboardingStep;
  });

  const completedCount = steps.filter((step) => step.status === 'complete').length;
  const nextStep = steps.find((step) => step.status !== 'complete');

  return {
    active: completedCount < steps.length,
    title: completedCount ? `首次启动引导 ${completedCount}/${steps.length}` : '首次启动引导',
    detail: nextStep?.detail ?? '核心初始化已完成，可以开始稳定执行与复盘。',
    completedCount,
    totalCount: steps.length,
    steps,
    optionalAction: providerConfigured
      ? undefined
      : {
        label: '连接 Codex',
        detail: '可选：复用本机 Codex 登录，启用真实画像提取、计划生成和调整建议。',
        pageId: 'settings',
      },
  };
}

function buildExecutionDerivedState(state: AppState) {
  const activeGoal = getActiveConversationGoal(state.goals, state.plan.activeGoalId);
  const activeDraft = getActiveConversationDraft(state.plan);
  const tasks = (activeDraft?.tasks ?? []).map((task) => normalizePlanTask(task));
  const summary = buildTaskStatusSummary(tasks);
  const totalMinutes = summary.doneTasks.reduce((minutes, task) => minutes + parseTaskDurationMinutes(task.duration), 0);
  const recentTaskExecutions = buildRecentTaskExecutions(tasks);
  const focusTask = summary.inProgressTask ?? summary.nextTodoTask;
  const completionRate = summary.total ? Math.round((summary.doneTasks.length / summary.total) * 100) : 0;
  const stageTitle = pickCurrentStage(activeDraft);
  const manualReflectionEntries = resolveReflectionEntries(state.reflection);
  const now = new Date();
  const reflectionEntries = reflectionPeriods.map((period) => {
    const manualEntry = manualReflectionEntries.find((entry) => entry.period === period) ?? createEmptyReflectionEntry(period);
    return buildReflectionEntry(period, tasks, manualEntry, now);
  });
  const defaultReflectionEntry = reflectionEntries.find((entry) => entry.period === DEFAULT_REFLECTION_PERIOD) ?? reflectionEntries[0] ?? createEmptyReflectionEntry(DEFAULT_REFLECTION_PERIOD);
  const onboarding = buildDashboardOnboarding(state, activeDraft, recentTaskExecutions);
  const priorityAction = buildPriorityAction(focusTask, stageTitle, summary, defaultReflectionEntry, onboarding);
  const riskSignals = buildDashboardRiskSignals(summary, reflectionEntries, priorityAction, onboarding);
  const alerts = riskSignals.map((signal) => `${signal.title}：${signal.detail}`);
  const nextActions = onboarding.active && !summary.total
    ? [
      ...onboarding.steps.filter((step) => step.status !== 'complete').slice(0, 3).map((step) => step.actionLabel),
      onboarding.optionalAction?.label,
    ].filter(Boolean) as string[]
    : Array.from(new Set([
      summary.delayedTasks[0] ? `优先重排：${summary.delayedTasks[0].title}` : null,
      focusTask ? `${focusTask.status === 'in_progress' ? '继续推进' : '开始执行'}：${focusTask.title}` : '查看复盘并准备下一阶段任务',
      summary.skippedTasks.length ? '在复盘中补充跳过原因，避免同类阻塞重复出现' : null,
    ].filter(Boolean) as string[]));
  const executionSummaryLine = onboarding.active && !summary.total
    ? '当前还没有学习目标、计划任务和执行记录。先完成首次设置，再开始第一项任务。'
    : `${activeGoal?.title ?? '当前目标'}已完成 ${summary.doneTasks.length}/${summary.total} 项；延后 ${summary.delayedTasks.length} 项，跳过 ${summary.skippedTasks.length} 项。`;

  return {
    dashboard: {
      ...state.dashboard,
      todayFocus: priorityAction.title,
      stage: onboarding.active && !summary.total ? '首次启动引导' : stageTitle,
      duration: priorityAction.duration,
      weeklyCompletion: completionRate,
      alerts,
      quickActions: nextActions,
      reflectionSummary: onboarding.active && !summary.total
        ? `${executionSummaryLine} ${onboarding.detail}`
        : (defaultReflectionEntry.insight
          ? `${executionSummaryLine} ${defaultReflectionEntry.label}：${defaultReflectionEntry.insight}`
          : executionSummaryLine),
      priorityAction,
      riskSignals,
      onboarding,
    },
    reflection: {
      ...state.reflection,
      period: defaultReflectionEntry.label,
      completedTasks: defaultReflectionEntry.completedTasks,
      actualDuration: defaultReflectionEntry.actualDuration,
      deviation: defaultReflectionEntry.deviation,
      insight: defaultReflectionEntry.insight,
      nextActions: defaultReflectionEntry.nextActions,
      recentTaskExecutions: defaultReflectionEntry.recentTaskExecutions,
      entries: reflectionEntries,
    },
  };
}

function createConversationActionId(sourceSuggestion: string, index: number) {
  const normalized = sourceSuggestion
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return `conversation-action-${normalized || 'preview'}-${index + 1}`;
}

function parseSuggestionStatus(sourceSuggestion: string) {
  const trimmed = sourceSuggestion.trim();
  if (trimmed.startsWith('进行中：')) {
    return {
      status: 'pending' as const,
      content: trimmed.slice('进行中：'.length).trim(),
    };
  }

  if (trimmed.startsWith('采纳：')) {
    return {
      status: 'proposed' as const,
      content: trimmed.slice('采纳：'.length).trim(),
    };
  }

  return {
    status: 'proposed' as const,
    content: trimmed,
  };
}

function inferConversationActionTarget(content: string): ConversationActionScope {
  if (/(画像|时间窗口|学习窗口|时间预算|节奏|偏好|优势|阻碍|阻力|计划影响)/.test(content)) {
    return 'profile';
  }

  if (/(目标|主目标|成功标准|优先级)/.test(content)) {
    return 'goal';
  }

  return 'plan';
}

function normalizeConversationActionStatus(status?: string): ConversationActionStatus {
  switch (status) {
    case 'pending':
    case 'applied':
    case 'proposed':
      return status;
    default:
      return 'proposed';
  }
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function cloneLearningPlanDraft(draft: LearningPlanDraft): LearningPlanDraft {
  return {
    ...draft,
    basis: [...draft.basis],
    stages: draft.stages.map((stage) => ({ ...stage })),
    tasks: draft.tasks.map((task) => ({ ...task })),
  };
}

function buildConversationGeneratedTaskId(actionId: string, index: number) {
  return `${actionId}-task-${index + 1}`;
}

function extractQuotedContent(content: string) {
  const quoted = content.match(/[「“"]([^」”"]+)[」”"]/);
  return quoted?.[1]?.trim() ?? null;
}

function extractStudyWindow(content: string) {
  const explicit = content.match(/((?:工作日|周末)?(?:早间|早上|上午|午间|下午|晚间|晚上)?\s*\d{1,2}:\d{2}\s*[-~到至]\s*\d{1,2}:\d{2})/);
  if (explicit?.[1]) {
    return explicit[1].replace(/\s+/g, ' ').trim();
  }

  if (/周末/.test(content)) {
    return '周末上午 09:00 - 11:00';
  }

  if (/(早间|早上|上午)/.test(content)) {
    return '工作日早间 07:00 - 08:00';
  }

  if (/(晚间|晚上|夜间)/.test(content)) {
    return '工作日晚间 20:30 - 21:15';
  }

  return null;
}

function trimSuggestionValue(value: string) {
  return value.replace(/[。！!；;]+$/g, '').trim();
}

function extractProfileDirectValue(content: string, labels: string[], verbs: string[]) {
  const quoted = extractQuotedContent(content);
  if (quoted && labels.some((label) => content.includes(label))) {
    return trimSuggestionValue(quoted);
  }

  const labelPattern = labels.join('|');
  const verbPattern = verbs.join('|');
  const direct = content.match(new RegExp(`(?:${labelPattern})(?:${verbPattern})[：:\\s]*(.+)$`));
  return direct?.[1] ? trimSuggestionValue(direct[1]) : null;
}

function extractTimeBudget(content: string) {
  return extractProfileDirectValue(content, ['时间预算', '学习预算'], ['调整为', '改为', '设为']);
}

function extractPacePreference(content: string) {
  return extractProfileDirectValue(content, ['节奏偏好', '学习节奏', '节奏'], ['调整为', '改为', '设为']);
}

function extractProfileBlocker(content: string) {
  return extractProfileDirectValue(content, ['阻力因素', '阻碍因素', '阻力', '阻碍'], ['补充为', '调整为', '改为']);
}

function extractProfilePlanImpact(content: string) {
  return extractProfileDirectValue(content, ['计划影响说明', '计划影响'], ['补充为', '调整为', '改为']);
}

function extractAgeBracket(content: string) {
  return extractProfileDirectValue(content, ['年龄阶段', '年龄'], ['补充为', '调整为', '改为', '设为']);
}

function extractGender(content: string) {
  return extractProfileDirectValue(content, ['性别'], ['补充为', '调整为', '改为', '设为']);
}

function extractMbti(content: string) {
  const directValue = extractProfileDirectValue(content, ['MBTI', 'mbti'], ['补充为', '调整为', '改为', '设为']);
  if (directValue) {
    return directValue.toUpperCase();
  }

  const match = content.match(/\b([EI][NS][FT][JP])\b/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function extractPersonalityTrait(content: string) {
  return extractProfileDirectValue(content, ['性格关键词', '性格特征', '性格'], ['补充为', '调整为', '改为']);
}

function extractMotivationStyle(content: string) {
  return extractProfileDirectValue(content, ['激励方式', '动力方式', 'motivationStyle'], ['补充为', '调整为', '改为', '设为']);
}

function extractStressResponse(content: string) {
  return extractProfileDirectValue(content, ['压力反应', '压力偏好', 'stressResponse'], ['补充为', '调整为', '改为', '设为']);
}

function extractFeedbackPreference(content: string) {
  return extractProfileDirectValue(content, ['反馈偏好', '提醒方式', 'feedbackPreference'], ['补充为', '调整为', '改为', '设为']);
}

function extractGoalPriority(content: string): LearningGoal['priority'] | null {
  const match = content.match(/\b(P[123])\b/i);
  return (match?.[1]?.toUpperCase() as LearningGoal['priority'] | undefined) ?? null;
}

function extractGoalCycle(content: string) {
  const match = content.match(/(\d+\s*(?:周|天|个月))/);
  return match?.[1]?.replace(/\s+/g, ' ').trim() ?? null;
}

function extractGoalSuccessMetric(content: string) {
  const quoted = extractQuotedContent(content);
  if (quoted && /(成功标准|衡量标准)/.test(content)) {
    return quoted;
  }

  const direct = content.match(/(?:成功标准|衡量标准)(?:改为|调整为|设为)?[：:\s]*([^，。]+)/);
  if (direct?.[1]) {
    return direct[1].trim();
  }

  return null;
}

function extractGoalTitle(content: string) {
  const quoted = extractQuotedContent(content);
  if (quoted && /(主目标|目标)/.test(content)) {
    return quoted;
  }

  const direct = content.match(/(?:主目标|目标)(?:改成|调整为|设为)[：:\s]*([^，。]+)/);
  if (direct?.[1]) {
    return direct[1].trim();
  }

  return null;
}

function extractPlanTitle(content: string) {
  const quoted = extractQuotedContent(content);
  if (quoted && /(计划标题|标题|计划)/.test(content)) {
    return quoted;
  }

  const direct = content.match(/(?:计划标题|标题|计划)(?:改成|调整为|设为)[：:\s]*([^，。]+)/);
  if (direct?.[1]) {
    return direct[1].trim();
  }

  return null;
}

function extractAppendedTaskTitle(content: string) {
  const taskQuoted = content.match(/(?:新增|加入|补一个)[^「“"]*(?:任务|行动)?[「“"]([^」”"]+)[」”"]/);
  if (taskQuoted?.[1]) {
    return taskQuoted[1].trim();
  }

  const quoted = extractQuotedContent(content);
  if (quoted && /(任务|行动)/.test(content)) {
    return quoted;
  }

  const direct = content.match(/(?:补一个|新增|加入)([^，。]*?(?:任务|行动))/);
  return direct?.[1]?.trim() ?? null;
}

function isConversationActionReviewable(status: ConversationActionStatus) {
  return status === 'proposed';
}

function normalizeConversationActionReviewStatus(status?: string): ConversationActionReviewStatus {
  switch (status) {
    case 'accepted':
    case 'rejected':
    case 'unreviewed':
      return status;
    default:
      return 'unreviewed';
  }
}

function normalizeConversationActionSourceType(sourceType?: string): ConversationActionSourceType {
  switch (sourceType) {
    case 'runtime_placeholder':
    case 'conversation_suggestion':
      return sourceType;
    default:
      return 'conversation_suggestion';
  }
}

function getConversationActionSourceDefaults(
  preview: Pick<ConversationActionPreview, 'kind' | 'status'>,
): Pick<ConversationActionPreview, 'sourceType' | 'sourceLabel'> {
  if (preview.status === 'pending' && preview.kind === 'plan_generation') {
    return {
      sourceType: 'runtime_placeholder',
      sourceLabel: '运行时占位建议',
    };
  }

  return {
    sourceType: 'conversation_suggestion',
    sourceLabel: '对话建议',
  };
}

type ConversationActionPreviewInput = Omit<
  ConversationActionPreview,
  'reviewable' | 'reviewStatus' | 'reviewedAt' | 'sourceType' | 'sourceLabel' | 'createdAt' | 'appliedAt'
> & Partial<Pick<ConversationActionPreview, 'sourceType' | 'sourceLabel' | 'createdAt' | 'appliedAt'>>;

function buildConversationActionPreview(
  preview: ConversationActionPreviewInput,
): ConversationActionPreview {
  const defaults = getConversationActionSourceDefaults(preview);
  return {
    ...preview,
    sourceType: normalizeConversationActionSourceType(preview.sourceType) ?? defaults.sourceType,
    sourceLabel: preview.sourceLabel?.trim() || defaults.sourceLabel,
    createdAt: preview.createdAt ?? new Date().toISOString(),
    appliedAt: preview.appliedAt,
    reviewable: isConversationActionReviewable(preview.status),
    reviewStatus: 'unreviewed',
  };
}

function ensureConversationActionAudit(preview: ConversationActionPreview): ConversationActionPreview {
  const defaults = getConversationActionSourceDefaults(preview);
  return {
    ...preview,
    sourceType: normalizeConversationActionSourceType(preview.sourceType) ?? defaults.sourceType,
    sourceLabel: preview.sourceLabel?.trim() || defaults.sourceLabel,
    createdAt: preview.createdAt ?? new Date().toISOString(),
    appliedAt: preview.appliedAt,
  };
}

function mergeStoredConversationActionState(
  preview: ConversationActionPreview,
  storedPreview?: ConversationActionPreview,
): ConversationActionPreview {
  const status = storedPreview?.status === 'applied'
    ? 'applied'
    : normalizeConversationActionStatus(preview.status);
  const reviewable = isConversationActionReviewable(status);

  if (status === 'pending') {
    return ensureConversationActionAudit({
      ...preview,
      status,
      reviewable,
      reviewStatus: 'unreviewed',
      reviewedAt: undefined,
      appliedAt: storedPreview?.appliedAt,
      createdAt: storedPreview?.createdAt ?? preview.createdAt,
      sourceType: storedPreview?.sourceType ?? preview.sourceType,
      sourceLabel: storedPreview?.sourceLabel ?? preview.sourceLabel,
    });
  }

  const reviewStatus = status === 'applied'
    ? 'accepted'
    : normalizeConversationActionReviewStatus(storedPreview?.reviewStatus);
  return ensureConversationActionAudit({
    ...preview,
    status,
    reviewable,
    reviewStatus,
    reviewedAt: reviewStatus === 'unreviewed' ? undefined : storedPreview?.reviewedAt,
    appliedAt: storedPreview?.appliedAt,
    createdAt: storedPreview?.createdAt ?? preview.createdAt,
    sourceType: storedPreview?.sourceType ?? preview.sourceType,
    sourceLabel: storedPreview?.sourceLabel ?? preview.sourceLabel,
  });
}

function buildGenericConversationActionPreview({
  sourceSuggestion,
  status,
  content,
  index,
}: {
  sourceSuggestion: string;
  status: ConversationActionStatus;
  content: string;
  index: number;
}): ConversationActionPreview {
  const target = inferConversationActionTarget(content);
  const kindByTarget: Record<ConversationActionScope, ConversationActionKind> = {
    profile: 'profile_update',
    goal: 'goal_update',
    plan: 'plan_update',
  };

  return buildConversationActionPreview({
    id: createConversationActionId(sourceSuggestion, index),
    kind: kindByTarget[target],
    target,
    scopes: [target],
    status,
    title: '结构化建议预览',
    summary: `把原始建议整理为可确认的${target === 'profile' ? '画像' : target === 'goal' ? '目标' : '计划'}变更预览。`,
    reason: '这一步先把自然语言建议转成稳定结构，后续确认/拒绝和持久化才能复用同一个动作模型。',
    sourceSuggestion,
    changes: [
      {
        field: 'conversation.suggestion',
        label: '原始建议',
        before: sourceSuggestion,
        after: content,
      },
    ],
  });
}

function buildProfileAdjustmentPreview({
  actionId,
  sourceSuggestion,
  status,
  content,
  profile,
}: {
  actionId: string;
  sourceSuggestion: string;
  status: ConversationActionStatus;
  content: string;
  profile: UserProfile;
}): ConversationActionPreview | null {
  if (!/(画像|时间窗口|学习窗口|时间预算|节奏|偏好|阻力|阻碍|计划影响|年龄|性别|性格|MBTI|反馈|提醒|激励|压力)/i.test(content)) {
    return null;
  }

  const nextBestStudyWindow = extractStudyWindow(content);
  const nextTimeBudget = extractTimeBudget(content);
  const nextPacePreference = extractPacePreference(content);
  const nextBlocker = extractProfileBlocker(content);
  const explicitPlanImpact = extractProfilePlanImpact(content);
  const nextAgeBracket = extractAgeBracket(content);
  const nextGender = extractGender(content);
  const nextMbti = extractMbti(content);
  const nextPersonalityTrait = extractPersonalityTrait(content);
  const nextMotivationStyle = extractMotivationStyle(content);
  const nextStressResponse = extractStressResponse(content);
  const nextFeedbackPreference = extractFeedbackPreference(content);
  const nextPlanImpact = dedupeStrings([
    ...profile.planImpact,
    ...(explicitPlanImpact ? [explicitPlanImpact] : []),
    ...(nextBestStudyWindow && nextBestStudyWindow !== profile.bestStudyWindow
      ? [`对话确认：后续计划优先围绕${nextBestStudyWindow}安排执行窗口。`]
      : []),
  ]);
  const nextProfile: UserProfile = normalizeUserProfile({
    ...profile,
    timeBudget: nextTimeBudget ?? profile.timeBudget,
    pacePreference: nextPacePreference ?? profile.pacePreference,
    bestStudyWindow: nextBestStudyWindow ?? profile.bestStudyWindow,
    blockers: nextBlocker ? dedupeStrings([...profile.blockers, nextBlocker]) : [...profile.blockers],
    planImpact: nextPlanImpact,
    ageBracket: nextAgeBracket ?? profile.ageBracket,
    gender: nextGender ?? profile.gender,
    personalityTraits: nextPersonalityTrait ? dedupeStrings([...profile.personalityTraits, nextPersonalityTrait]) : [...profile.personalityTraits],
    mbti: nextMbti ?? profile.mbti,
    motivationStyle: nextMotivationStyle ?? profile.motivationStyle,
    stressResponse: nextStressResponse ?? profile.stressResponse,
    feedbackPreference: nextFeedbackPreference ?? profile.feedbackPreference,
  });

  if (
    nextProfile.timeBudget === profile.timeBudget
    && nextProfile.pacePreference === profile.pacePreference
    && nextProfile.bestStudyWindow === profile.bestStudyWindow
    && JSON.stringify(nextProfile.blockers) === JSON.stringify(profile.blockers)
    && JSON.stringify(nextProfile.planImpact) === JSON.stringify(profile.planImpact)
    && nextProfile.ageBracket === profile.ageBracket
    && nextProfile.gender === profile.gender
    && JSON.stringify(nextProfile.personalityTraits) === JSON.stringify(profile.personalityTraits)
    && nextProfile.mbti === profile.mbti
    && nextProfile.motivationStyle === profile.motivationStyle
    && nextProfile.stressResponse === profile.stressResponse
    && nextProfile.feedbackPreference === profile.feedbackPreference
  ) {
    return null;
  }

  return buildConversationActionPreview({
    id: actionId,
    kind: 'profile_update',
    target: 'profile',
    scopes: ['profile', 'plan'],
    status,
    title: '画像调整预览',
    summary: '把对话里的画像变化整理成可执行补丁，确认后会写回用户画像并影响后续计划依据。',
    reason: '画像是计划调整的上游约束，先以结构化补丁落库，才能让后续计划建议建立在最新上下文上。',
    sourceSuggestion,
    changes: [
      {
        field: 'profile.timeBudget',
        label: '时间预算',
        before: profile.timeBudget,
        after: nextProfile.timeBudget,
      },
      {
        field: 'profile.pacePreference',
        label: '节奏偏好',
        before: profile.pacePreference,
        after: nextProfile.pacePreference,
      },
      {
        field: 'profile.bestStudyWindow',
        label: '学习窗口',
        before: profile.bestStudyWindow,
        after: nextProfile.bestStudyWindow,
      },
      {
        field: 'profile.blockers',
        label: '阻力因素',
        before: profile.blockers[profile.blockers.length - 1] ?? '暂无额外阻力',
        after: nextProfile.blockers[nextProfile.blockers.length - 1] ?? '暂无额外阻力',
      },
      {
        field: 'profile.planImpact',
        label: '计划影响说明',
        before: profile.planImpact[profile.planImpact.length - 1] ?? '暂无额外说明',
        after: nextProfile.planImpact[nextProfile.planImpact.length - 1] ?? '暂无额外说明',
      },
      {
        field: 'profile.ageBracket',
        label: '年龄阶段',
        before: profile.ageBracket || '未填写',
        after: nextProfile.ageBracket || '未填写',
      },
      {
        field: 'profile.gender',
        label: '性别',
        before: profile.gender || '未填写',
        after: nextProfile.gender || '未填写',
      },
      {
        field: 'profile.personalityTraits',
        label: '性格关键词',
        before: profile.personalityTraits[profile.personalityTraits.length - 1] ?? '暂无',
        after: nextProfile.personalityTraits[nextProfile.personalityTraits.length - 1] ?? '暂无',
      },
      {
        field: 'profile.mbti',
        label: 'MBTI',
        before: profile.mbti || '未填写',
        after: nextProfile.mbti || '未填写',
      },
      {
        field: 'profile.motivationStyle',
        label: '激励方式',
        before: profile.motivationStyle || '未填写',
        after: nextProfile.motivationStyle || '未填写',
      },
      {
        field: 'profile.stressResponse',
        label: '压力偏好',
        before: profile.stressResponse || '未填写',
        after: nextProfile.stressResponse || '未填写',
      },
      {
        field: 'profile.feedbackPreference',
        label: '反馈方式',
        before: profile.feedbackPreference || '未填写',
        after: nextProfile.feedbackPreference || '未填写',
      },
    ].filter((change) => change.before !== change.after),
    execution: {
      type: 'profile_update',
      nextProfile,
    },
  });
}

function buildGoalAdjustmentPreview({
  actionId,
  sourceSuggestion,
  status,
  content,
  goal,
}: {
  actionId: string;
  sourceSuggestion: string;
  status: ConversationActionStatus;
  content: string;
  goal: LearningGoal | null;
}): ConversationActionPreview | null {
  if (!goal || !/(目标|主目标|成功标准|优先级|周期)/.test(content)) {
    return null;
  }

  const nextGoal: LearningGoal = {
    ...goal,
    title: extractGoalTitle(content) ?? goal.title,
    cycle: extractGoalCycle(content) ?? goal.cycle,
    priority: extractGoalPriority(content) ?? goal.priority,
    successMetric: extractGoalSuccessMetric(content) ?? goal.successMetric,
  };

  const changes: ConversationActionChange[] = [];
  if (nextGoal.title !== goal.title) {
    changes.push({
      field: 'goal.title',
      label: '当前主目标',
      before: goal.title,
      after: nextGoal.title,
    });
  }
  if (nextGoal.cycle !== goal.cycle) {
    changes.push({
      field: 'goal.cycle',
      label: '目标周期',
      before: goal.cycle,
      after: nextGoal.cycle,
    });
  }
  if (nextGoal.priority !== goal.priority) {
    changes.push({
      field: 'goal.priority',
      label: '目标优先级',
      before: goal.priority,
      after: nextGoal.priority,
    });
  }
  if (nextGoal.successMetric !== goal.successMetric) {
    changes.push({
      field: 'goal.successMetric',
      label: '成功标准',
      before: goal.successMetric,
      after: nextGoal.successMetric,
    });
  }

  if (!changes.length) {
    return null;
  }

  return buildConversationActionPreview({
    id: actionId,
    kind: 'goal_update',
    target: 'goal',
    scopes: ['goal', 'plan'],
    status,
    title: '目标调整预览',
    summary: `将当前主目标「${goal.title}」的关键约束整理成可确认变更。`,
    reason: '目标是计划草案的锚点，先更新目标实体，计划页和对话上下文才能立即对齐。',
    sourceSuggestion,
    changes,
    execution: {
      type: 'goal_update',
      goalId: goal.id,
      nextGoal,
    },
  });
}

function buildPlanAdjustmentPreview({
  actionId,
  sourceSuggestion,
  status,
  content,
  draft,
}: {
  actionId: string;
  sourceSuggestion: string;
  status: ConversationActionStatus;
  content: string;
  draft: LearningPlanDraft | null;
}): ConversationActionPreview | null {
  if (!draft || !/(计划|阶段|任务|草案)/.test(content)) {
    return null;
  }

  const nextDraft = cloneLearningPlanDraft(draft);
  const nextTitle = extractPlanTitle(content);
  if (nextTitle) {
    nextDraft.title = nextTitle;
  }

  const taskTitle = extractAppendedTaskTitle(content);
  if (!nextTitle && !taskTitle) {
    return null;
  }

  if (taskTitle && !nextDraft.tasks.some((task) => task.title === taskTitle)) {
    nextDraft.tasks.push({
      id: buildConversationGeneratedTaskId(actionId, nextDraft.tasks.length),
      title: taskTitle,
      duration: '30 分钟',
      status: 'todo',
      note: '来自对话确认后的计划补充动作。',
    });
  }

  const nextBasis = dedupeStrings([...nextDraft.basis, `对话调整：${content}`]);
  nextDraft.basis = nextBasis;

  const changes: ConversationActionChange[] = [];
  if (nextDraft.title !== draft.title) {
    changes.push({
      field: 'plan.title',
      label: '计划标题',
      before: draft.title,
      after: nextDraft.title,
    });
  }

  const previousTask = draft.tasks[draft.tasks.length - 1];
  const appendedTask = nextDraft.tasks[nextDraft.tasks.length - 1];
  if (nextDraft.tasks.length !== draft.tasks.length && appendedTask) {
    changes.push({
      field: 'plan.tasks',
      label: '计划任务补充',
      before: previousTask?.title ?? '暂无额外任务',
      after: appendedTask.title,
    });
  }

  if (nextDraft.basis[nextDraft.basis.length - 1] !== draft.basis[draft.basis.length - 1]) {
    changes.push({
      field: 'plan.basis',
      label: '计划依据',
      before: draft.basis[draft.basis.length - 1] ?? '暂无额外依据',
      after: nextDraft.basis[nextDraft.basis.length - 1] ?? '暂无额外依据',
    });
  }

  if (!changes.length) {
    return null;
  }

  return buildConversationActionPreview({
    id: actionId,
    kind: 'plan_update',
    target: 'plan',
    scopes: ['plan'],
    status,
    title: '计划调整预览',
    summary: `把当前主目标对应草案「${draft.title}」整理成可直接落库的计划补丁。`,
    reason: '计划层需要接收来自对话的结构化调整，但必须在确认后才进入真实草案，避免直接覆盖人工编辑。',
    sourceSuggestion,
    changes,
    execution: {
      type: 'plan_update',
      goalId: draft.goalId,
      draftId: draft.id,
      nextDraft: {
        ...nextDraft,
        updatedAt: draft.updatedAt,
      },
    },
  });
}

export function resolveConversationState(
  state: Pick<AppState, 'profile' | 'goals' | 'plan' | 'conversation' | 'settings'>,
): AppState['conversation'] {
  const activeGoal = getActiveConversationGoal(state.goals, state.plan.activeGoalId);
  const activeDraft = getActiveConversationDraft(state.plan);
  const relatedGoal = activeGoal?.title ?? EMPTY_RELATED_GOAL_LABEL;
  const relatedPlan = activeDraft?.title ?? EMPTY_RELATED_PLAN_LABEL;
  const planGenerationProvider = state.settings.providers.find((provider) => provider.id === state.settings.routing.planGeneration)?.label
    ?? state.settings.routing.planGeneration;
  const suggestions = state.conversation.suggestions.map((item) => item.trim()).filter(Boolean);
  const storedPreviewById = new Map((state.conversation.actionPreviews ?? []).map((preview) => [preview.id, preview]));

  const actionPreviews = suggestions.length
    ? suggestions.map((sourceSuggestion, index) => {
      const { status, content } = parseSuggestionStatus(sourceSuggestion);
      const previewId = createConversationActionId(sourceSuggestion, index);
      const storedPreview = storedPreviewById.get(previewId);
      const actionablePreview = buildProfileAdjustmentPreview({
        actionId: previewId,
        sourceSuggestion,
        status,
        content,
        profile: state.profile,
      }) ?? buildGoalAdjustmentPreview({
        actionId: previewId,
        sourceSuggestion,
        status,
        content,
        goal: activeGoal,
      }) ?? buildPlanAdjustmentPreview({
        actionId: previewId,
        sourceSuggestion,
        status,
        content,
        draft: activeDraft,
      });

      if (actionablePreview) {
        return mergeStoredConversationActionState(actionablePreview, storedPreview);
      }

      if (/直接读取当前目标/.test(content) && /(plan draft|草案)/i.test(content)) {
        return mergeStoredConversationActionState(buildConversationActionPreview({
          id: previewId,
          kind: 'plan_update',
          target: 'plan',
          scopes: ['goal', 'plan'],
          status,
          title: '计划页跟随当前目标草案',
          summary: `让计划页直接绑定当前主目标「${relatedGoal}」对应的草案，而不是停留在展示映射层。`,
          reason: '目标与计划需要单一真实来源，否则后续对话调整和计划比较会建立在不稳定的展示关系上。',
          sourceSuggestion,
          changes: [
            {
              field: 'plan.binding',
              label: '计划页绑定方式',
              before: '目标与计划可能只在界面层做弱关联',
              after: `计划页直接读取当前主目标「${relatedGoal}」的独立草案`,
            },
            {
              field: 'conversation.relatedPlan',
              label: '当前关联计划',
              before: '对话只描述计划，不保证与主目标同步',
              after: relatedPlan,
            },
          ],
        }), storedPreview);
      }

      if (/新目标/.test(content) && /(自动补|首版草案|草案)/.test(content)) {
        return mergeStoredConversationActionState(buildConversationActionPreview({
          id: previewId,
          kind: 'goal_update',
          target: 'goal',
          scopes: ['goal', 'plan'],
          status,
          title: '新目标创建后自动补首版草案',
          summary: '把“创建目标”扩展成“创建目标并生成首版计划草案”的连续动作，减少目标创建后的空白期。',
          reason: '新目标如果没有对应草案，计划页、对话调整和后续确认动作都会缺少可作用的计划对象。',
          sourceSuggestion,
          changes: [
            {
              field: 'goal.creation.followUp',
              label: '目标创建后的系统动作',
              before: '仅创建目标记录',
              after: '创建目标后自动补首版计划草案',
            },
            {
              field: 'plan.initialDraft',
              label: '新目标初始计划状态',
              before: '可能出现“有目标但无草案”的空状态',
              after: '新目标创建后立即拥有可编辑的首版草案',
            },
          ],
        }), storedPreview);
      }

      if (/(真实 ai|ai provider|provider)/i.test(content) && /(生成计划|计划)/.test(content)) {
        return mergeStoredConversationActionState(buildConversationActionPreview({
          id: previewId,
          kind: 'plan_generation',
          target: 'plan',
          scopes: ['plan'],
          status: 'pending',
          title: '接入真实 Provider 计划生成',
          summary: `把当前的本地规则模板生成，升级为通过 ${planGenerationProvider} 路由执行的真实计划生成。`,
          reason: '只有先把建议映射成结构化动作，后续统一 AI service 才能在不直接改页面状态的前提下接入真实模型调用。',
          sourceSuggestion,
          changes: [
            {
              field: 'plan.generationMode',
              label: '计划生成方式',
              before: '本地规则模板生成',
              after: `统一 AI service 通过 ${planGenerationProvider} 路由执行真实生成`,
            },
            {
              field: 'settings.routing.planGeneration',
              label: '计划生成路由',
              before: `${planGenerationProvider} 已被选中，但尚未进入运行时`,
              after: '路由配置会直接影响实际模型调用目标',
            },
          ],
        }), storedPreview);
      }

      return mergeStoredConversationActionState(buildGenericConversationActionPreview({
        sourceSuggestion,
        status,
        content,
        index,
      }), storedPreview);
    })
    : (state.conversation.actionPreviews ?? []).map((preview) => ensureConversationActionAudit(preview));

  return {
    ...state.conversation,
    relatedGoal,
    relatedPlan,
    suggestions,
    actionPreviews,
  };
}

export function updateConversationActionPreviewReview(
  conversation: AppState['conversation'],
  payload: {
    actionId: string;
    reviewStatus: ConversationActionReviewStatus;
    reviewedAt?: string;
  },
): AppState['conversation'] {
  return {
    ...conversation,
    actionPreviews: conversation.actionPreviews.map((preview) => {
      if (preview.id !== payload.actionId || !preview.reviewable) {
        return preview;
      }

      const reviewStatus = payload.reviewStatus;
      return ensureConversationActionAudit({
        ...preview,
        reviewStatus,
        reviewedAt: reviewStatus === 'unreviewed' ? undefined : (payload.reviewedAt ?? new Date().toISOString()),
      });
    }),
  };
}

export function appendConversationMessage(
  state: AppState,
  payload: {
    role: ConversationMessage['role'];
    content: string;
    id?: string;
  },
): AppState {
  const content = payload.content.trim();
  if (!content) {
    return state;
  }

  const nextConversation = resolveConversationState({
    profile: state.profile,
    goals: state.goals,
    plan: state.plan,
    settings: state.settings,
    conversation: {
      ...state.conversation,
      messages: [
        ...state.conversation.messages,
        {
          id: payload.id?.trim() || `message-${Date.now()}-${state.conversation.messages.length + 1}`,
          role: payload.role,
          content,
        },
      ],
    },
  });

  return {
    ...state,
    conversation: nextConversation,
  };
}

export function applyAcceptedConversationActionPreviews(state: AppState): ApplyConversationActionPreviewsResult {
  let nextProfile = state.profile;
  let nextGoals = state.goals.map((goal) => ({ ...goal }));
  let nextPlan: LearningPlanState = {
    ...state.plan,
    drafts: state.plan.drafts.map((draft) => cloneLearningPlanDraft(draft)),
    snapshots: state.plan.snapshots.map((snapshot) => ({
      ...snapshot,
      basis: [...snapshot.basis],
      stages: snapshot.stages.map((stage) => ({ ...stage })),
      tasks: snapshot.tasks.map((task) => ({ ...task })),
    })),
  };

  const appliedActionIds: string[] = [];
  const skippedActionIds: string[] = [];
  const appliedAt = new Date().toISOString();

  state.conversation.actionPreviews.forEach((preview) => {
    if (preview.reviewStatus !== 'accepted' || preview.status !== 'proposed') {
      return;
    }

    if (!preview.execution) {
      skippedActionIds.push(preview.id);
      return;
    }

    const execution = preview.execution;

    switch (execution.type) {
      case 'profile_update':
        nextProfile = normalizeUserProfile({
          ...execution.nextProfile,
          strengths: [...execution.nextProfile.strengths],
          blockers: [...execution.nextProfile.blockers],
          planImpact: [...execution.nextProfile.planImpact],
          personalityTraits: [...execution.nextProfile.personalityTraits],
        });
        appliedActionIds.push(preview.id);
        break;
      case 'goal_update': {
        const targetIndex = nextGoals.findIndex((goal) => goal.id === execution.goalId);
        if (targetIndex === -1) {
          skippedActionIds.push(preview.id);
          break;
        }

        nextGoals[targetIndex] = { ...execution.nextGoal };
        appliedActionIds.push(preview.id);
        break;
      }
      case 'plan_update': {
        const targetIndex = nextPlan.drafts.findIndex((draft) => draft.id === execution.draftId || draft.goalId === execution.goalId);
        if (targetIndex === -1) {
          skippedActionIds.push(preview.id);
          break;
        }

        nextPlan.drafts[targetIndex] = cloneLearningPlanDraft({
          ...execution.nextDraft,
          updatedAt: new Date().toISOString(),
        });
        appliedActionIds.push(preview.id);
        break;
      }
      default:
        skippedActionIds.push(preview.id);
    }
  });

  const nextConversation = resolveConversationState({
    profile: nextProfile,
    goals: nextGoals,
    plan: nextPlan,
    settings: state.settings,
    conversation: {
      ...state.conversation,
      actionPreviews: state.conversation.actionPreviews.map((preview) => {
        if (!appliedActionIds.includes(preview.id)) {
          return preview;
        }

        return {
          ...preview,
          status: 'applied',
          reviewable: false,
          reviewStatus: 'accepted',
          appliedAt,
        };
      }),
    },
  });

  return {
    state: {
      ...state,
      profile: nextProfile,
      goals: nextGoals,
      plan: nextPlan,
      conversation: nextConversation,
    },
    appliedActionIds,
    skippedActionIds,
  };
}

export function syncExecutionDerivedState(state: AppState): AppState {
  const derived = buildExecutionDerivedState(state);
  return {
    ...state,
    dashboard: derived.dashboard,
    reflection: derived.reflection,
  };
}

export function updatePlanTaskStatus(state: AppState, input: UpdatePlanTaskStatusInput): AppState {
  const changedAt = new Date().toISOString();
  let matchedDraft = false;
  let matchedTask = false;

  const nextDrafts = state.plan.drafts.map((draft) => {
    if (draft.id !== input.draftId) {
      return cloneLearningPlanDraft(draft);
    }

    matchedDraft = true;
    const nextTasks = draft.tasks.map((task) => {
      const normalizedTask = normalizePlanTask(task);
      if (task.id !== input.taskId) {
        return normalizedTask;
      }

      matchedTask = true;
      return {
        ...normalizedTask,
        status: input.status,
        statusNote: input.statusNote?.trim() ?? normalizedTask.statusNote ?? '',
        statusUpdatedAt: changedAt,
      };
    });

    return cloneLearningPlanDraft({
      ...draft,
      tasks: nextTasks,
      updatedAt: changedAt,
    });
  });

  if (!matchedDraft) {
    throw new Error('计划草案不存在，无法更新任务状态。');
  }

  if (!matchedTask) {
    throw new Error('任务不存在，无法更新状态。');
  }

  return syncExecutionDerivedState({
    ...state,
    plan: {
      ...state.plan,
      drafts: nextDrafts,
    },
  });
}

export function saveReflectionEntry(state: AppState, input: SaveReflectionEntryInput): AppState {
  const changedAt = new Date().toISOString();
  const nextEntries = resolveReflectionEntries(state.reflection).map((entry) => (
    entry.period === input.period
      ? normalizeReflectionEntry({
        ...entry,
        obstacle: input.obstacle,
        difficultyFit: input.difficultyFit,
        timeFit: input.timeFit,
        moodScore: input.moodScore,
        confidenceScore: input.confidenceScore,
        accomplishmentScore: input.accomplishmentScore,
        insight: input.insight,
        followUpActions: input.followUpActions,
        updatedAt: changedAt,
      })
      : entry
  ));

  return syncExecutionDerivedState({
    ...state,
    reflection: {
      ...state.reflection,
      entries: nextEntries,
    },
  });
}

const baseSeedState: AppState = {
  profile: {
    name: 'Baymax',
    identity: '前端背景、希望系统化补足 Python 与 AI 应用能力',
    timeBudget: '工作日 45 分钟，周末 2 小时',
    pacePreference: '偏轻量但连续，适合小步推进',
    strengths: ['前端基础好', '动手意愿强', '能接受项目驱动学习'],
    blockers: ['容易被临时事务打断', '计划过重时会拖延', '需要明确反馈闭环'],
    bestStudyWindow: '工作日晚间 21:00 - 22:00',
    planImpact: ['当前计划控制为低摩擦日任务', '阶段一优先补基础与建立连续感', '任务粒度保持 30-45 分钟可完成'],
    ageBracket: '25-34 岁',
    gender: '',
    personalityTraits: ['项目驱动', '需要明确反馈', '偏好小步推进'],
    mbti: 'INTJ',
    motivationStyle: '更适合看到明确里程碑与可交付结果',
    stressResponse: '连续被打断时更适合先做低阻力任务恢复节奏',
    feedbackPreference: '希望提醒直接、简短，并明确下一步动作',
  },
  dashboard: {
    todayFocus: '完成目标级计划草案切换，让不同学习主线真正拥有自己的计划内容',
    stage: '阶段 1 / 建立目标级计划草案能力',
    duration: '45 分钟',
    weeklyCompletion: 68,
    streakDays: 5,
    alerts: ['当前计划草案仍由本地模板生成，尚未接入真实 AI Provider 自动生成。', '如果目标刚创建且尚无草案，会先用本地规则生成首版草案。'],
    quickActions: ['开始今日学习', '切换当前目标', '查看当前计划依据'],
    reflectionSummary: '最近更适合以真实交付物推进，先把每个目标的计划草案独立起来。',
    priorityAction: {
      kind: 'continue',
      title: '继续推进当前任务',
      detail: '优先保持单任务推进。',
      reason: '避免在主线上频繁切换。',
      duration: '45 分钟',
    },
    riskSignals: [],
    onboarding: {
      active: false,
      title: '首次启动引导',
      detail: '',
      completedCount: 4,
      totalCount: 4,
      steps: [],
    },
  },
  goals: [
    {
      id: 'goal-python-ai',
      title: '补齐 Python + AI 应用开发基础',
      motivation: '从前端延展到能独立搭建 AI 工具型产品。',
      baseline: '前端经验较强，Python 与数据层经验较弱。',
      cycle: '8 周',
      successMetric: '能独立完成一个本地优先的 AI 学习工具 MVP。',
      priority: 'P1',
      status: 'active',
    },
    {
      id: 'goal-writing',
      title: '形成稳定的技术复盘输出习惯',
      motivation: '通过写作加固知识结构，减少学完即忘。',
      baseline: '偶尔记录，缺少固定节奏。',
      cycle: '4 周',
      successMetric: '每周至少 1 次结构化复盘。',
      priority: 'P2',
      status: 'active',
    },
  ],
  plan: {
    activeGoalId: 'goal-python-ai',
    drafts: [
      {
        id: 'plan-goal-python-ai',
        goalId: 'goal-python-ai',
        title: 'Python + AI 工具开发草案',
        summary: '先把 Python / 数据处理 / 调用 LLM 的基础链路跑通，再逐步拼成一个本地优先的 AI 工具型产品。',
        basis: ['目标优先级为 P1，需要主线投入', '当前基础偏前端，需要先补语言与数据处理短板', '工作日晚间只有 45 分钟，任务需保持单次可完成'],
        stages: [
          { title: '阶段 1：Python 补基础', outcome: '完成语法、虚拟环境、文件读写与基础脚本练习', progress: '进行中' },
          { title: '阶段 2：AI 调用链路', outcome: '掌握 prompt、API 调用、结果解析与错误处理', progress: '未开始' },
          { title: '阶段 3：做出 MVP', outcome: '完成一个本地优先的学习工具 MVP', progress: '未开始' },
        ],
        tasks: [
          {
            id: 'task-python-ai-1',
            title: '完成 1 个 Python 小脚本练习',
            duration: '30 分钟',
            status: 'done',
            note: '目标是把前端熟悉的流程翻译成 Python 表达。',
            statusNote: '已完成一次脚本练习，并记录了输入输出结构。',
            statusUpdatedAt: '2026-03-21T11:00:00.000Z',
          },
          {
            id: 'task-python-ai-2',
            title: '用 requests 或 fetch 封装一次模型调用',
            duration: '45 分钟',
            status: 'in_progress',
            note: '先把请求、异常处理、返回结构理解清楚。',
            statusNote: '正在验证真实 Provider 的错误归一化与路由命中。',
            statusUpdatedAt: '2026-03-22T09:30:00.000Z',
          },
          { id: 'task-python-ai-3', title: '规划本地优先 MVP 的最小功能清单', duration: '30 分钟', status: 'todo', note: '只保留真正能验证学习价值的功能。' },
        ],
      },
      {
        id: 'plan-goal-writing',
        goalId: 'goal-writing',
        title: '技术复盘输出习惯草案',
        summary: '先建立稳定的写作节奏和模板，再把每周输入沉淀成可复用的技术复盘文章。',
        basis: ['目标周期较短，适合用轻量但稳定的周节奏推进', '当前阻力不是写不出来，而是缺少固定触发器与模板', '已有项目驱动学习基础，适合把真实开发过程转成复盘素材'],
        stages: [
          { title: '阶段 1：固定写作触发器', outcome: '明确每周什么时候写、写什么、写到什么程度', progress: '进行中' },
          { title: '阶段 2：建立复盘模板', outcome: '沉淀输入 / 决策 / 踩坑 / 下一步四段式模板', progress: '未开始' },
          { title: '阶段 3：连续输出', outcome: '连续 4 周完成结构化复盘', progress: '未开始' },
        ],
        tasks: [
          {
            id: 'task-writing-1',
            title: '整理一份复盘模板首版',
            duration: '25 分钟',
            status: 'in_progress',
            note: '模板要足够短，避免每次写作启动成本过高。',
            statusNote: '已整理出输入 / 决策 / 踩坑 / 下一步四段式骨架。',
            statusUpdatedAt: '2026-03-20T20:00:00.000Z',
          },
          { id: 'task-writing-2', title: '把最近一次开发迭代改写成复盘', duration: '35 分钟', status: 'todo', note: '优先写真实发生过的决策与取舍。' },
          { id: 'task-writing-3', title: '设定每周固定复盘时段', duration: '10 分钟', status: 'todo', note: '建议绑定到周末较完整的学习窗口。' },
        ],
      },
    ],
    snapshots: [],
  },
  conversation: {
    title: '学习伴侣下一阶段推进',
    relatedGoal: '补齐 Python + AI 应用开发基础',
    relatedPlan: 'Python + AI 工具开发草案',
    tags: ['画像更新', '目标调整', '计划调整'],
    messages: [
      { id: 'm1', role: 'user', content: '我最近更适合工作日晚间 20:30 - 21:15 学习，想把当前主目标压缩到 6 周。' },
      { id: 'm2', role: 'assistant', content: '已整理出画像、目标和计划三个层次的候选变更，等待你逐条确认。' },
      { id: 'm3', role: 'system', content: '建议先更新学习窗口与目标周期，再给当前计划补一条本周可交付任务。' },
    ],
    suggestions: [
      '采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
      '采纳：把当前主目标周期改为 6 周，并把成功标准调整为完成一个可演示的本地优先 AI MVP',
      '采纳：把计划标题改成「Python + AI MVP 冲刺草案」，并新增任务「拆解本周 MVP 功能清单」',
      '进行中：真实 AI Provider 生成计划仍待接入',
    ],
    actionPreviews: [],
  },
  reflection: {
    period: '阶段复盘',
    completedTasks: 0,
    actualDuration: '0 分钟',
    deviation: '当前周期还没有真实执行记录。',
    insight: '',
    nextActions: [],
    recentTaskExecutions: [],
    entries: [
      createEmptyReflectionEntry('daily'),
      normalizeReflectionEntry({
        period: 'weekly',
        obstacle: '比计划少 1 小时，主要因临时事务打断。',
        insight: '用真实交付物驱动开发时，连续性更稳定。',
        followUpActions: ['保持单次任务 45 分钟以内', '优先做能直接增强产品骨架的事项', '下阶段接持久层，不扩展过多页面功能'],
      }),
      normalizeReflectionEntry({
        period: 'stage',
        obstacle: '当前阶段的主要偏差来自临时事务打断，说明任务仍需进一步降摩擦。',
        insight: '项目驱动的学习方式更稳定，但每次投入仍需要更明确的可交付物。',
        followUpActions: ['把每次任务压缩到 30-45 分钟', '优先选择能直接增强产品骨架的事项', '为下一阶段预留一次完整复盘时段'],
      }),
    ],
  },
  settings: createDefaultSettings(),
};

export const seedState: AppState = {
  ...syncExecutionDerivedState(baseSeedState),
  conversation: resolveConversationState(baseSeedState),
};
