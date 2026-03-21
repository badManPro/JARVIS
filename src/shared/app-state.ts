export type ProviderId = 'openai' | 'glm' | 'kimi' | 'deepseek' | 'custom';
export type GoalStatus = 'active' | 'paused' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'delayed';
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

const EMPTY_RELATED_GOAL_LABEL = '暂未设置目标';
const EMPTY_RELATED_PLAN_LABEL = '暂无计划草案';

function getActiveConversationGoal(goals: LearningGoal[], activeGoalId: string) {
  return goals.find((goal) => goal.id === activeGoalId) ?? goals[0] ?? null;
}

function getActiveConversationDraft(plan: LearningPlanState) {
  return plan.drafts.find((draft) => draft.goalId === plan.activeGoalId) ?? plan.drafts[0] ?? null;
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
  if (/(画像|时间窗口|节奏|偏好|优势|阻碍)/.test(content)) {
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

function buildConversationActionPreview(
  preview: Omit<ConversationActionPreview, 'reviewable' | 'reviewStatus' | 'reviewedAt'>,
): ConversationActionPreview {
  return {
    ...preview,
    reviewable: isConversationActionReviewable(preview.status),
    reviewStatus: 'unreviewed',
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
    return {
      ...preview,
      status,
      reviewable,
      reviewStatus: 'unreviewed',
      reviewedAt: undefined,
    };
  }

  const reviewStatus = status === 'applied'
    ? 'accepted'
    : normalizeConversationActionReviewStatus(storedPreview?.reviewStatus);
  return {
    ...preview,
    status,
    reviewable,
    reviewStatus,
    reviewedAt: reviewStatus === 'unreviewed' ? undefined : storedPreview?.reviewedAt,
  };
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
  if (!/(画像|时间窗口|学习窗口|节奏|偏好)/.test(content)) {
    return null;
  }

  const nextBestStudyWindow = extractStudyWindow(content);
  const nextPlanImpact = dedupeStrings([
    ...profile.planImpact,
    `对话确认：后续计划优先围绕${nextBestStudyWindow ?? profile.bestStudyWindow}安排执行窗口。`,
  ]);
  const nextProfile: UserProfile = {
    ...profile,
    bestStudyWindow: nextBestStudyWindow ?? profile.bestStudyWindow,
    planImpact: nextPlanImpact,
  };

  if (
    nextProfile.bestStudyWindow === profile.bestStudyWindow
    && JSON.stringify(nextProfile.planImpact) === JSON.stringify(profile.planImpact)
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
        field: 'profile.bestStudyWindow',
        label: '学习窗口',
        before: profile.bestStudyWindow,
        after: nextProfile.bestStudyWindow,
      },
      {
        field: 'profile.planImpact',
        label: '计划影响说明',
        before: profile.planImpact[profile.planImpact.length - 1] ?? '暂无额外说明',
        after: nextProfile.planImpact[nextProfile.planImpact.length - 1] ?? '暂无额外说明',
      },
    ],
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
    : (state.conversation.actionPreviews ?? []);

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
      return {
        ...preview,
        reviewStatus,
        reviewedAt: reviewStatus === 'unreviewed' ? undefined : (payload.reviewedAt ?? new Date().toISOString()),
      };
    }),
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
        nextProfile = {
          ...execution.nextProfile,
          strengths: [...execution.nextProfile.strengths],
          blockers: [...execution.nextProfile.blockers],
          planImpact: [...execution.nextProfile.planImpact],
        };
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
          { id: 'task-python-ai-1', title: '完成 1 个 Python 小脚本练习', duration: '30 分钟', status: 'done', note: '目标是把前端熟悉的流程翻译成 Python 表达。' },
          { id: 'task-python-ai-2', title: '用 requests 或 fetch 封装一次模型调用', duration: '45 分钟', status: 'in_progress', note: '先把请求、异常处理、返回结构理解清楚。' },
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
          { id: 'task-writing-1', title: '整理一份复盘模板首版', duration: '25 分钟', status: 'in_progress', note: '模板要足够短，避免每次写作启动成本过高。' },
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
    period: '本周',
    completedTasks: 6,
    actualDuration: '4.5 小时',
    deviation: '比计划少 1 小时，主要因临时事务打断。',
    insight: '用真实交付物驱动开发时，连续性更稳定。',
    nextActions: ['保持单次任务 45 分钟以内', '优先做能直接增强产品骨架的事项', '下阶段接持久层，不扩展过多页面功能'],
  },
  settings: {
    theme: '跟随系统',
    startPage: '首页',
    providers: [
      { id: 'openai', label: 'OpenAI / GPT', enabled: true, endpoint: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', authMode: 'apiKey', capabilityTags: ['profile_extraction', 'plan_generation', 'chat_general'], healthStatus: 'ready', keyPreview: '未配置', hasSecret: false },
      { id: 'glm', label: 'Zhipu / GLM', enabled: false, endpoint: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4.5', authMode: 'apiKey', capabilityTags: ['plan_adjustment', 'reflection_summary'], healthStatus: 'unknown', keyPreview: '未配置', hasSecret: false },
      { id: 'kimi', label: 'Moonshot / Kimi', enabled: false, endpoint: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', authMode: 'apiKey', capabilityTags: ['chat_general', 'reflection_summary'], healthStatus: 'unknown', keyPreview: '未配置', hasSecret: false },
      { id: 'deepseek', label: 'DeepSeek', enabled: false, endpoint: 'https://api.deepseek.com', model: 'deepseek-chat', authMode: 'apiKey', capabilityTags: ['plan_generation', 'plan_adjustment'], healthStatus: 'warning', keyPreview: '未配置', hasSecret: false },
    ],
    routing: {
      profileExtraction: 'openai',
      planGeneration: 'deepseek',
      planAdjustment: 'glm',
      reflectionSummary: 'kimi',
      generalChat: 'openai',
    },
  },
};

export const seedState: AppState = {
  ...baseSeedState,
  conversation: resolveConversationState(baseSeedState),
};
