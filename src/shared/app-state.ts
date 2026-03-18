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

export type LearningPlanState = {
  activeGoalId: string;
  drafts: LearningPlanDraft[];
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
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

export const seedState: AppState = {
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
