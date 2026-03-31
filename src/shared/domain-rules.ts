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

type FitnessTopic = {
  label: string;
  foundationTitle: string;
  foundationUrl: string;
  warmupHint: string;
  sessionFocus: string;
  intensityHint: string;
  recoveryHint: string;
  validationHint: string;
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

const defaultFitnessTopic: FitnessTopic = {
  label: '综合体能',
  foundationTitle: '基础动作库与安全提示',
  foundationUrl: '',
  warmupHint: '先做 5-8 分钟低强度热身，并用空手或轻重量确认动作轨迹再进入正式训练',
  sessionFocus: '围绕 1 个主训练动作或 1 组短间歇训练完成今天的主训练组',
  intensityHint: '记录组数、次数、重量/配速和主观强度（RPE），先保证动作稳定再加量',
  recoveryHint: '训练后安排 3-5 分钟收操拉伸，并明确明天是主动恢复、轻练还是休息',
  validationHint: '保留一条训练记录，确认今天的动作标准、负荷和恢复安排都清楚',
  keywords: [],
};

const fitnessTopics: FitnessTopic[] = [
  {
    label: '力量训练',
    foundationTitle: '基础力量动作库与安全提示',
    foundationUrl: '',
    warmupHint: '先做关节活动和空手/空杠热身组，再进入正式重量训练',
    sessionFocus: '围绕 1-2 个复合动作完成主训练组，避免同一节里塞太多动作',
    intensityHint: '记录每组的重量、次数和 RPE，动作稳定前不要急着加重量',
    recoveryHint: '训练后做肩髋腿放松，补水并给目标肌群留出恢复日',
    validationHint: '保留组数、次数、重量和 RPE 记录，作为下次加量依据',
    keywords: ['力量训练', '增肌', '深蹲', '卧推', '硬拉', '杠铃', '哑铃', '引体向上', 'bench', 'squat', 'deadlift', 'pull-up', '肌肉'],
  },
  {
    label: '跑步 / 心肺',
    foundationTitle: '跑步动作与配速基础',
    foundationUrl: '',
    warmupHint: '先快走或慢跑 5-8 分钟，再做踝髋激活和轻量加速跑',
    sessionFocus: '围绕 1 段稳态跑或 1 轮间歇跑完成今天的主训练',
    intensityHint: '记录距离、配速、心率或体感强度，避免一开始就冲到失控',
    recoveryHint: '结束后做小腿和髋部放松，观察呼吸与疲劳恢复情况',
    validationHint: '保留距离、配速和体感强度记录，确认本次负荷是否合适',
    keywords: ['跑步', '慢跑', '马拉松', '配速', '5k', '10k', '心肺', '有氧', 'cardio', 'run', 'running'],
  },
  {
    label: '自重训练',
    foundationTitle: '自重动作示范与进阶模板',
    foundationUrl: '',
    warmupHint: '先激活肩、髋和核心，再用低次数试做一轮动作',
    sessionFocus: '围绕 2-3 个自重动作完成循环训练，控制动作质量优先于速度',
    intensityHint: '记录每轮次数、完成轮数和动作是否变形，必要时及时降级',
    recoveryHint: '训练后拉伸肩胸和髋腿，根据第二天酸痛决定是否降量',
    validationHint: '保留轮数、次数和动作质量备注，作为下次进阶依据',
    keywords: ['俯卧撑', '平板支撑', '波比', '自重', '徒手', '居家健身', '核心', 'burpee', 'push-up', 'pushup', 'plank'],
  },
  {
    label: '瑜伽 / 灵活性',
    foundationTitle: '拉伸与灵活性动作库',
    foundationUrl: '',
    warmupHint: '先做轻柔呼吸和关节活动，避免冷状态直接压伸',
    sessionFocus: '围绕 1 组灵活性序列或瑜伽流完成今天训练',
    intensityHint: '记录停留时长、呼吸节奏和左右侧差异，不要只追求幅度',
    recoveryHint: '结束后补水，并避免同部位连续高强度拉伸',
    validationHint: '保留序列完成情况和身体感受，判断是否需要继续放松或休息',
    keywords: ['瑜伽', '拉伸', 'mobility', '柔韧', '柔韧性', '开肩', '开髋', '伸展'],
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

function inferFitnessTopic(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const combined = [goal.title, goal.baseline, goal.successMetric].join(' ').toLowerCase();
  return fitnessTopics.find((topic) => topic.keywords.some((keyword) => combined.includes(keyword))) ?? defaultFitnessTopic;
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

function buildFitnessPromptLines(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const topic = inferFitnessTopic(goal);
  return [
    '目标领域：健身',
    '健身执行规则：先做热身和动作标准校准，再按“主训练组 -> 记录组数/次数/重量/配速/RPE -> 收操拉伸 -> 恢复安排”组织计划。',
    '健身资源建议：优先推荐动作库、训练模板、热身/收操和安全提示，不要只给泛泛课程名。',
    '健身任务原子：热身、动作示范核对、主训练组、记录组数/次数/重量/配速/心率/RPE、收操拉伸、恢复安排。',
    `当前识别训练方向：${topic.label}`,
    `今日训练焦点：${topic.sessionFocus}。`,
    `强度记录要求：${topic.intensityHint}。`,
    `恢复校验方式：${topic.recoveryHint}。`,
    `优先资源入口：${topic.foundationTitle}${topic.foundationUrl ? ` ${topic.foundationUrl}` : ''}`,
  ];
}

export function buildGoalDomainPromptLines(goal: DomainPromptGoal) {
  switch (normalizeLearningGoalDomain(goal.domain)) {
    case 'programming':
      return buildProgrammingPromptLines(goal);
    case 'instrument':
      return buildInstrumentPromptLines(goal);
    case 'fitness':
      return buildFitnessPromptLines(goal);
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

export function buildFitnessPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  profile: Pick<UserProfile, 'bestStudyWindow'>,
): DomainPlanTemplate {
  const topic = inferFitnessTopic(goal);
  const windowHint = profile.bestStudyWindow || '你最容易稳定投入的学习窗口';

  return {
    summary: `健身主线「${goal.title}」会先校准 ${topic.label} 的热身、动作标准和起始负荷，再通过主训练组记录与恢复安排逐步靠近“${goal.successMetric}”。`,
    basis: [
      `健身领域优先把「${topic.warmupHint}」变成每次开始前的固定动作。`,
      `训练任务要明确主训练组和记录方式：${topic.intensityHint}。`,
      `默认把任务控制在 ${windowHint} 内完成一次热身 -> 主训练 -> 收操恢复的闭环。`,
    ],
    stages: [
      { title: '阶段 1：校准热身、动作标准与起点', outcome: `完成 ${topic.label} 的热身流程和动作标准检查，并确认当前起始负荷`, progress: '进行中' },
      { title: '阶段 2：稳定主训练组与强度记录', outcome: '围绕 1 组主训练动作或间歇任务稳定记录组数、次数、重量/配速与 RPE', progress: '未开始' },
      { title: '阶段 3：收束恢复节奏并验证结果', outcome: `围绕“${goal.successMetric}”沉淀可复盘的训练记录和恢复安排`, progress: '未开始' },
    ],
    milestones: [
      {
        title: `第 1 周：校准 ${topic.label} 起点`,
        focus: '固定热身、动作标准和起始负荷，避免每次训练都从混乱开始',
        outcome: '知道今天该怎么热身、该练哪组动作，以及当前起点负荷',
        status: 'current',
      },
      {
        title: '第 2 周：稳定主训练闭环',
        focus: '围绕 1 组主训练动作或间歇任务建立连续记录',
        outcome: '形成可对比的组数、次数、重量/配速或 RPE 记录',
        status: 'upcoming',
      },
      {
        title: '第 3 周：把恢复节奏纳入计划',
        focus: `围绕「${goal.title}」记录疲劳、酸痛和恢复安排，避免只堆训练量`,
        outcome: '得到 1 套兼顾训练推进和恢复节奏的最小训练闭环',
        status: 'upcoming',
      },
    ],
    tasks: [
      {
        title: `完成 ${topic.label} 热身和动作标准检查`,
        duration: '15 分钟',
        status: 'todo',
        note: topic.warmupHint,
      },
      {
        title: '完成 1 轮主训练组并记录强度',
        duration: '25 分钟',
        status: 'todo',
        note: `${topic.sessionFocus}。${topic.intensityHint}。`,
      },
      {
        title: '收操拉伸并写下恢复安排',
        duration: '10 分钟',
        status: 'todo',
        note: `${topic.recoveryHint}。${topic.validationHint}。`,
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
    case 'fitness':
      return buildFitnessPlanTemplate(goal, profile);
    case 'general':
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

export function buildFitnessTodayPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  draft: Pick<LearningPlanDraft, 'todayContext' | 'tasks'>,
  profile: Pick<UserProfile, 'timeBudget'>,
): DomainTodayPlanTemplate {
  const topic = inferFitnessTopic(goal);
  const estimatedDuration = draft.todayContext.availableDuration || draft.tasks[0]?.duration || profile.timeBudget || '30 分钟';

  return {
    todayGoal: `围绕「${goal.title}」完成一次可记录的 ${topic.label} 训练闭环`,
    deliverable: '记录今天的组数/次数/重量/配速/RPE，并写下 1 条恢复安排',
    estimatedDuration,
    steps: [
      {
        title: '先热身并核对动作标准',
        detail: topic.warmupHint,
        duration: '8 分钟',
      },
      {
        title: '完成今天的主训练组并记录强度',
        detail: `${topic.sessionFocus}；${topic.intensityHint}`,
        duration: '15 分钟',
      },
      {
        title: '收操拉伸并写下恢复备注',
        detail: topic.recoveryHint,
        duration: draft.tasks[1]?.duration || draft.tasks[0]?.duration || estimatedDuration,
      },
    ],
    resources: [
      {
        title: topic.foundationTitle,
        url: topic.foundationUrl,
        reason: '先对照动作示范和安全提示，避免动作变形或负荷上头。',
      },
      {
        title: '训练记录表 / 计时器',
        url: '',
        reason: '把组数、次数、重量、配速或 RPE 记下来，下一次才知道是否该加量。',
      },
      {
        title: '收操拉伸与恢复提醒',
        url: '',
        reason: '训练结束后安排放松和恢复，避免把疲劳直接带进下一次训练。',
      },
    ].filter((resource) => resource.title || resource.url),
    practice: [
      {
        title: '完成 1 次主训练闭环',
        detail: '按热身 -> 主训练组 -> 收操的顺序完成，过程中记录强度与动作质量。',
        output: '1 条训练记录（组数/次数/重量/配速/RPE）+ 1 条恢复安排',
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
    case 'fitness':
      return buildFitnessTodayPlanTemplate(goal, draft, profile);
    case 'general':
    default:
      return null;
  }
}
