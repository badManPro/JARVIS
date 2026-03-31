import type {
  LearningGoal,
  LearningPlanDraft,
  LearningPlanMilestone,
  LearningPlanStage,
  PlanTask,
  TodayPlanPractice,
  TodayPlanResource,
  TodayPlanStep,
  UserProfile,
} from './app-state.js';
import { normalizeLearningGoalDomain } from './goal.js';

type DomainPromptGoal = Pick<LearningGoal, 'title' | 'baseline' | 'successMetric' | 'domain'>;

type DomainPlanTemplate = {
  summary: string;
  basis: string[];
  stages: LearningPlanStage[];
  milestones: LearningPlanMilestone[];
  tasks: Array<Pick<PlanTask, 'title' | 'duration' | 'status' | 'note'>>;
};

type DomainTodayPlanTemplate = {
  todayGoal: string;
  deliverable: string;
  estimatedDuration: string;
  steps: Array<Pick<TodayPlanStep, 'title' | 'detail' | 'duration'>>;
  resources: TodayPlanResource[];
  practice: TodayPlanPractice[];
};

type ProgrammingTopic = {
  label: string;
  docTitle: string;
  docUrl: string;
  exampleTitle: string;
  exampleUrl: string;
  runtimeHint: string;
  keywords: string[];
};

type InstrumentTopic = {
  label: string;
  foundationTitle: string;
  foundationUrl: string;
  warmupHint: string;
  practiceFocus: string;
  performanceHint: string;
  keywords: string[];
};

const defaultProgrammingTopic: ProgrammingTopic = {
  label: '当前技术栈',
  docTitle: '当前技术栈官方文档',
  docUrl: '',
  exampleTitle: '当前技术栈 README / Quickstart',
  exampleUrl: '',
  runtimeHint: '把示例真正运行起来并确认输入输出',
  keywords: [],
};

const programmingTopics: ProgrammingTopic[] = [
  {
    label: 'Python',
    docTitle: 'Python 官方教程',
    docUrl: 'https://docs.python.org/3/tutorial/',
    exampleTitle: 'Python 官方入门示例',
    exampleUrl: 'https://docs.python.org/3/tutorial/introduction.html',
    runtimeHint: '用 python3 运行脚本并确认输出',
    keywords: ['python', 'py', '脚本', '命令行'],
  },
  {
    label: 'TypeScript',
    docTitle: 'TypeScript Handbook',
    docUrl: 'https://www.typescriptlang.org/docs/',
    exampleTitle: 'TypeScript Playground',
    exampleUrl: 'https://www.typescriptlang.org/play',
    runtimeHint: '完成类型检查并确认运行结果',
    keywords: ['typescript', 'ts'],
  },
  {
    label: 'JavaScript / Node.js',
    docTitle: 'Node.js 官方文档',
    docUrl: 'https://nodejs.org/docs/latest/api/',
    exampleTitle: 'MDN JavaScript 指南',
    exampleUrl: 'https://developer.mozilla.org/docs/Web/JavaScript/Guide',
    runtimeHint: '用 node 运行代码并确认输出',
    keywords: ['javascript', 'node', 'node.js', 'js'],
  },
  {
    label: 'React',
    docTitle: 'React 官方文档',
    docUrl: 'https://react.dev/learn',
    exampleTitle: 'React Quick Start',
    exampleUrl: 'https://react.dev/learn',
    runtimeHint: '在本地页面中确认组件真实渲染',
    keywords: ['react', 'jsx', 'tsx'],
  },
  {
    label: 'SQL / 数据库',
    docTitle: 'SQLBolt',
    docUrl: 'https://sqlbolt.com/',
    exampleTitle: 'SQLite 官方文档',
    exampleUrl: 'https://www.sqlite.org/docs.html',
    runtimeHint: '执行查询并验证返回结果',
    keywords: ['sql', 'sqlite', 'mysql', 'postgres', '数据库'],
  },
];

const defaultInstrumentTopic: InstrumentTopic = {
  label: '当前乐器',
  foundationTitle: '基础示范与姿势校准',
  foundationUrl: '',
  warmupHint: '先完成调音、持琴或坐姿检查，再做 3-5 分钟低强度热身',
  practiceFocus: '用节拍器从慢速拆练 1 个短段落或 1 个节奏型',
  performanceHint: '录一段 30-60 秒练习片段回听，记下节拍、音准或动作问题',
  keywords: [],
};

const instrumentTopics: InstrumentTopic[] = [
  {
    label: '吉他',
    foundationTitle: '吉他基础和弦与右手节奏示范',
    foundationUrl: '',
    warmupHint: '先调音，再检查左手按弦和右手拨弦/扫弦姿势',
    practiceFocus: '围绕 2-4 个和弦切换或 1 个扫弦型慢练，避免一开始整首硬撑',
    performanceHint: '录一段 8 小节和弦切换或弹唱片段，检查换和弦是否抢拍',
    keywords: ['吉他', 'guitar', '弹唱', '指弹', '扫弦', '和弦'],
  },
  {
    label: '钢琴',
    foundationTitle: '钢琴五指音型与基础和弦示范',
    foundationUrl: '',
    warmupHint: '先确认坐姿、手型和触键放松，避免一开始就用力过猛',
    practiceFocus: '围绕 1 组指法、和弦连接或 4-8 小节旋律慢练',
    performanceHint: '录一段 4-8 小节连贯演奏，检查节拍稳定和断句',
    keywords: ['钢琴', 'piano', '键盘', '电子琴', '练琴'],
  },
  {
    label: '架子鼓',
    foundationTitle: '基础节拍与单击控制示范',
    foundationUrl: '',
    warmupHint: '先确认握棒、坐姿和节拍器速度，再进入正式练习',
    practiceFocus: '围绕 1 个基本 groove 或单击/双击组合做慢速重复',
    performanceHint: '录一段 30 秒 groove，检查拍点是否稳定、手脚是否同步',
    keywords: ['架子鼓', '鼓', 'drum', 'drums', '练鼓'],
  },
  {
    label: '小提琴',
    foundationTitle: '空弦发音与一把位音准示范',
    foundationUrl: '',
    warmupHint: '先检查调音、持琴姿势和运弓角度',
    practiceFocus: '围绕 1 组弓法或 2-4 小节音准段落做慢练',
    performanceHint: '录一段连弓片段，检查音准、换弦和弓速控制',
    keywords: ['小提琴', 'violin', '运弓'],
  },
  {
    label: '尤克里里',
    foundationTitle: '尤克里里基础和弦与扫弦示范',
    foundationUrl: '',
    warmupHint: '先调音，再确认左手按弦和右手扫弦动作是否放松',
    practiceFocus: '围绕 2-3 个基础和弦和 1 个扫弦型慢练',
    performanceHint: '录一段 8 小节节奏片段，检查和弦切换是否连贯',
    keywords: ['尤克里里', 'ukulele'],
  },
];

function inferProgrammingTopic(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const combined = [goal.title, goal.baseline, goal.successMetric].join(' ').toLowerCase();
  return programmingTopics.find((topic) => topic.keywords.some((keyword) => combined.includes(keyword))) ?? defaultProgrammingTopic;
}

function inferInstrumentTopic(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const combined = [goal.title, goal.baseline, goal.successMetric].join(' ').toLowerCase();
  return instrumentTopics.find((topic) => topic.keywords.some((keyword) => combined.includes(keyword))) ?? defaultInstrumentTopic;
}

function buildProgrammingPromptLines(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const topic = inferProgrammingTopic(goal);
  const lines = [
    '目标领域：编程',
    '编程执行规则：先明确最小可运行代码结果，再按“阅读官方文档 -> 复现示例 -> 修改示例 -> 运行验证 -> 记录结果”组织计划。',
    '编程资源建议：优先推荐官方文档、标准教程或当前技术栈 README；不要只给泛泛课程名。',
    '编程任务原子：环境检查、阅读文档、复现示例、编写/修改代码、运行验证、记录报错与结论。',
    `当前识别技术：${topic.label}`,
    `运行验证要求：${topic.runtimeHint}。`,
  ];

  if (topic.docUrl) {
    lines.push(`优先资源入口：${topic.docTitle} ${topic.docUrl}`);
  }

  return lines;
}

function buildInstrumentPromptLines(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const topic = inferInstrumentTopic(goal);
  const lines = [
    '目标领域：乐器',
    '乐器执行规则：先做调音与姿势检查，再按“示范对照 -> 节拍器慢练 -> 分段重复 -> 连贯演奏 -> 录音回听”组织计划。',
    '乐器资源建议：优先推荐对应乐器的基础示范、节拍器/调音器、简化曲谱或练习段落，不要只给泛泛课程名。',
    '乐器任务原子：调音、热身、节拍器慢练、分段重复、难点循环、整段连贯、录音自检。',
    `当前识别乐器：${topic.label}`,
    `今日练习焦点：${topic.practiceFocus}。`,
    `练习校验方式：${topic.performanceHint}。`,
  ];

  if (topic.foundationUrl) {
    lines.push(`优先资源入口：${topic.foundationTitle} ${topic.foundationUrl}`);
  }

  return lines;
}

export function buildGoalDomainPromptLines(goal: DomainPromptGoal) {
  switch (normalizeLearningGoalDomain(goal.domain)) {
    case 'programming':
      return buildProgrammingPromptLines(goal);
    case 'instrument':
      return buildInstrumentPromptLines(goal);
    case 'fitness':
      return [
        '目标领域：健身',
        '健身专属执行规则仍待补齐，当前先沿用通用计划结构，但仍需优先保证动作安全、负荷渐进和恢复节奏。',
      ];
    case 'general':
    default:
      return ['目标领域：通用'];
  }
}

export function buildProgrammingPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  profile: Pick<UserProfile, 'bestStudyWindow'>,
): DomainPlanTemplate {
  const topic = inferProgrammingTopic(goal);
  const windowHint = profile.bestStudyWindow || '你最容易稳定投入的学习窗口';

  return {
    summary: `编程主线「${goal.title}」会先锁定 ${topic.label} 的环境、官方文档入口和最小可运行代码结果，再逐步靠近“${goal.successMetric}”。`,
    basis: [
      `编程领域优先围绕 ${topic.docTitle}、README 和可运行示例组织入口。`,
      '每个阶段都要落到代码运行验证，而不是只停留在概念阅读。',
      `默认把任务控制在 ${windowHint} 内可以完成的一小段代码闭环。`,
    ],
    stages: [
      { title: '阶段 1：校准环境与文档入口', outcome: `完成 ${topic.label} 环境检查，并确认后续主要查阅入口`, progress: '进行中' },
      { title: '阶段 2：打通关键代码链路', outcome: '先复现 1 条核心示例，再做最小改造和运行验证', progress: '未开始' },
      { title: '阶段 3：收束最小可运行成果', outcome: `围绕“${goal.successMetric}”沉淀 1 个可展示的最小代码结果`, progress: '未开始' },
    ],
    milestones: [
      {
        title: `第 1 周：搭好 ${topic.label} 环境并确认入口`,
        focus: `完成环境检查、运行方式确认和 ${topic.docTitle} 入口建立`,
        outcome: '能独立跑通 1 个最小示例，并知道后续查哪里',
        status: 'current',
      },
      {
        title: '第 2 周：复现并改造 1 个关键示例',
        focus: '先复现最小示例，再做 1 次针对目标的真实改动',
        outcome: '形成 1 个可运行、可验证的小结果',
        status: 'upcoming',
      },
      {
        title: '第 3 周：收束最小代码交付',
        focus: `围绕「${goal.title}」只保留能证明进展的最小代码闭环`,
        outcome: '得到 1 个能展示当前进展的最小代码成果',
        status: 'upcoming',
      },
    ],
    tasks: [
      {
        title: `安装并验证 ${topic.label} 开发环境`,
        duration: '20 分钟',
        status: 'todo',
        note: `先跑通最小命令或脚本，确认环境和执行入口都可用。${topic.runtimeHint}。`,
      },
      {
        title: `阅读 ${topic.docTitle} 并复现 1 个示例`,
        duration: '30 分钟',
        status: 'todo',
        note: '不要只浏览概念，必须把示例跑起来；如果有 README，也一起确认最小启动方式。',
      },
      {
        title: '完成 1 个最小可运行代码结果',
        duration: '35 分钟',
        status: 'todo',
        note: `围绕“${goal.successMetric}”先做能运行、能验证的最小代码闭环。`,
      },
    ],
  };
}

export function buildInstrumentPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  profile: Pick<UserProfile, 'bestStudyWindow'>,
): DomainPlanTemplate {
  const topic = inferInstrumentTopic(goal);
  const windowHint = profile.bestStudyWindow || '你最容易稳定投入的学习窗口';

  return {
    summary: `乐器主线「${goal.title}」会先校准 ${topic.label} 的调音、姿势和固定练习段落，再通过节拍器慢练与录音回听逐步靠近“${goal.successMetric}”。`,
    basis: [
      `乐器领域优先把「${topic.warmupHint}」变成每次开始前的固定动作。`,
      '每次只攻一个短段落、一个节奏型或一个换指难点，避免一上来整首反复。',
      `默认把任务控制在 ${windowHint} 内能完成的一轮慢练 + 回听闭环。`,
    ],
    stages: [
      { title: '阶段 1：校准姿势、调音与起点', outcome: `完成 ${topic.label} 基础姿势检查，并固定热身与调音流程`, progress: '进行中' },
      { title: '阶段 2：分段慢练并稳定节拍', outcome: '围绕 1 个关键段落或节奏型做节拍器慢练和难点循环', progress: '未开始' },
      { title: '阶段 3：连贯演奏并做录音回听', outcome: `围绕“${goal.successMetric}”沉淀 1 段可回放的练习结果`, progress: '未开始' },
    ],
    milestones: [
      {
        title: `第 1 周：校准 ${topic.label} 基础动作`,
        focus: `固定调音、姿势与热身流程，并确认本轮主要练习段落`,
        outcome: '知道每次练习前要先检查什么，也能稳定进入状态',
        status: 'current',
      },
      {
        title: '第 2 周：攻克 1 个关键段落或节奏型',
        focus: '用节拍器拆成小段慢练，把最容易卡住的位置练顺',
        outcome: '形成 1 段更稳定的小片段，不再只靠整段硬撑',
        status: 'upcoming',
      },
      {
        title: '第 3 周：完成 1 段可回放演奏',
        focus: `围绕「${goal.title}」录下 1 段连贯演奏，并根据回放继续修正`,
        outcome: '得到 1 份能反映当前音准、节拍和动作质量的练习记录',
        status: 'upcoming',
      },
    ],
    tasks: [
      {
        title: `完成 ${topic.label} 调音、姿势检查和热身`,
        duration: '15 分钟',
        status: 'todo',
        note: topic.warmupHint,
      },
      {
        title: '用节拍器慢练 1 个关键段落',
        duration: '25 分钟',
        status: 'todo',
        note: topic.practiceFocus,
      },
      {
        title: '录一段练习片段并记下 2 个问题',
        duration: '15 分钟',
        status: 'todo',
        note: topic.performanceHint,
      },
    ],
  };
}

export function buildDomainPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric' | 'domain'>,
  profile: Pick<UserProfile, 'bestStudyWindow'>,
): DomainPlanTemplate | null {
  switch (normalizeLearningGoalDomain(goal.domain)) {
    case 'programming':
      return buildProgrammingPlanTemplate(goal, profile);
    case 'instrument':
      return buildInstrumentPlanTemplate(goal, profile);
    case 'general':
    case 'fitness':
    default:
      return null;
  }
}

export function buildProgrammingTodayPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  draft: Pick<LearningPlanDraft, 'todayContext' | 'tasks'>,
  profile: Pick<UserProfile, 'timeBudget'>,
): DomainTodayPlanTemplate {
  const topic = inferProgrammingTopic(goal);
  const estimatedDuration = draft.todayContext.availableDuration || draft.tasks[0]?.duration || profile.timeBudget || '30 分钟';

  return {
    todayGoal: `围绕「${goal.title}」打通一个最小可运行代码结果`,
    deliverable: '保留一份可运行代码结果，并记录 1 条运行验证结论',
    estimatedDuration,
    steps: [
      {
        title: '先定义今天的最小输入 / 输出',
        detail: '用一句话写清楚今天要让哪段代码跑起来，避免临时扩 scope。',
        duration: '5 分钟',
      },
      {
        title: `阅读 ${topic.docTitle} 并圈出关键 API`,
        detail: '只看今天要用到的那一小段文档或 README，然后立刻进入动手。',
        duration: '10 分钟',
      },
      {
        title: '编写或修改代码并实际运行验证',
        detail: topic.runtimeHint,
        duration: draft.tasks[0]?.duration || estimatedDuration,
      },
    ],
    resources: [
      {
        title: topic.docTitle,
        url: topic.docUrl,
        reason: '先用官方文档确认最小正确用法，减少在二手资料里反复比较。',
      },
      {
        title: topic.exampleTitle,
        url: topic.exampleUrl,
        reason: '先复现一个最小示例，再基于它改成自己的目标结果。',
      },
    ].filter((resource) => resource.title || resource.url),
    practice: [
      {
        title: '复现 1 个示例并做 1 次改动',
        detail: '先保证示例可以运行，再把变量、输入或输出改成自己的目标场景。',
        output: '一份可运行代码结果与 1 条运行验证记录',
      },
    ],
  };
}

export function buildInstrumentTodayPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  draft: Pick<LearningPlanDraft, 'todayContext' | 'tasks'>,
  profile: Pick<UserProfile, 'timeBudget'>,
): DomainTodayPlanTemplate {
  const topic = inferInstrumentTopic(goal);
  const estimatedDuration = draft.todayContext.availableDuration || draft.tasks[0]?.duration || profile.timeBudget || '30 分钟';

  return {
    todayGoal: `围绕「${goal.title}」完成一次可回放的 ${topic.label} 分段练习`,
    deliverable: '保留 1 段 30-60 秒练习录音，并记下 1-2 个下次继续修正的问题',
    estimatedDuration,
    steps: [
      {
        title: '先调音、检查姿势并做热身',
        detail: topic.warmupHint,
        duration: '8 分钟',
      },
      {
        title: '用节拍器慢练今天的关键段落',
        detail: topic.practiceFocus,
        duration: '12 分钟',
      },
      {
        title: '连起来演奏并录音回听',
        detail: topic.performanceHint,
        duration: draft.tasks[1]?.duration || draft.tasks[0]?.duration || estimatedDuration,
      },
    ],
    resources: [
      {
        title: topic.foundationTitle,
        url: topic.foundationUrl,
        reason: '先对照示范确认今天的指法、节拍和动作要求，避免练错再返工。',
      },
      {
        title: '节拍器',
        url: '',
        reason: '慢练时先把速度压低，固定拍点后再逐步提速。',
      },
      {
        title: '练习录音回放',
        url: '',
        reason: '通过回放快速发现节拍、音准和动作不稳的位置。',
      },
    ].filter((resource) => resource.title || resource.url),
    practice: [
      {
        title: '节拍器慢练 + 录音回听',
        detail: '只练 1 个短段落或 1 个节奏型，从低速开始，把问题听出来再继续。',
        output: '1 段可回放练习录音 + 1 条节拍/音准/动作自评',
      },
    ],
  };
}

export function buildDomainTodayPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric' | 'domain'>,
  draft: Pick<LearningPlanDraft, 'todayContext' | 'tasks'>,
  profile: Pick<UserProfile, 'timeBudget'>,
): DomainTodayPlanTemplate | null {
  switch (normalizeLearningGoalDomain(goal.domain)) {
    case 'programming':
      return buildProgrammingTodayPlanTemplate(goal, draft, profile);
    case 'instrument':
      return buildInstrumentTodayPlanTemplate(goal, draft, profile);
    case 'general':
    case 'fitness':
    default:
      return null;
  }
}
