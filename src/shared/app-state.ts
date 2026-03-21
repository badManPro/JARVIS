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
export type ConversationActionStatus = 'proposed' | 'pending';
export type ConversationActionReviewStatus = 'unreviewed' | 'accepted' | 'rejected';

export type ConversationActionChange = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
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

function applyStoredConversationActionReviewState(
  preview: ConversationActionPreview,
  storedPreview?: ConversationActionPreview,
): ConversationActionPreview {
  if (!preview.reviewable) {
    return {
      ...preview,
      reviewStatus: 'unreviewed',
      reviewedAt: undefined,
    };
  }

  const reviewStatus = normalizeConversationActionReviewStatus(storedPreview?.reviewStatus);
  return {
    ...preview,
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

      if (/直接读取当前目标/.test(content) && /(plan draft|草案)/i.test(content)) {
        return applyStoredConversationActionReviewState(buildConversationActionPreview({
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
        return applyStoredConversationActionReviewState(buildConversationActionPreview({
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
        return applyStoredConversationActionReviewState(buildConversationActionPreview({
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

      if (/(画像|时间窗口|节奏|偏好)/.test(content)) {
        return applyStoredConversationActionReviewState(buildConversationActionPreview({
          id: previewId,
          kind: 'profile_update',
          target: 'profile',
          scopes: ['profile', 'plan'],
          status,
          title: '画像调整预览',
          summary: '把对话里的画像建议整理成可确认字段，后续再决定是否落库并联动重排计划。',
          reason: '画像是计划生成和调整的上游约束，先结构化预览，才能避免对话直接改动已有计划。',
          sourceSuggestion,
          changes: [
            {
              field: 'profile.bestStudyWindow',
              label: '学习窗口',
              before: state.profile.bestStudyWindow,
              after: '按对话建议更新默认执行窗口',
            },
            {
              field: 'profile.planImpact',
              label: '计划节奏依据',
              before: state.profile.planImpact[0] ?? '暂无明确节奏说明',
              after: '新的画像变化将作为后续计划调整依据',
            },
          ],
        }), storedPreview);
      }

      return applyStoredConversationActionReviewState(buildGenericConversationActionPreview({
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
    tags: ['画像更新', '计划重排', '产品实现边界'],
    messages: [
      { id: 'm1', role: 'user', content: '我希望这个产品先把 C 端体验做好，不要像后台系统。' },
      { id: 'm2', role: 'assistant', content: '已将界面原则收敛为“首屏先给动作、少配置先可用、解释优先于炫技”。' },
      { id: 'm3', role: 'system', content: '建议按目标保存独立计划草案，切换主目标时直接切换对应草案，而不是只做展示映射。' },
    ],
    suggestions: ['采纳：计划页直接读取当前目标的 plan draft', '采纳：新目标创建后自动补首版草案', '进行中：真实 AI Provider 生成计划仍待接入'],
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
