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

type ProgrammingTopic = {
  label: string;
  docTitle: string;
  docUrl: string;
  exampleTitle: string;
  exampleUrl: string;
  runtimeHint: string;
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

function inferProgrammingTopic(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>) {
  const combined = [goal.title, goal.baseline, goal.successMetric].join(' ').toLowerCase();
  return programmingTopics.find((topic) => topic.keywords.some((keyword) => combined.includes(keyword))) ?? defaultProgrammingTopic;
}

export function buildGoalDomainPromptLines(goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric' | 'domain'>) {
  if (normalizeLearningGoalDomain(goal.domain) !== 'programming') {
    return ['目标领域：通用'];
  }

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

export function buildProgrammingPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  profile: Pick<UserProfile, 'bestStudyWindow'>,
): {
  summary: string;
  basis: string[];
  stages: LearningPlanStage[];
  milestones: LearningPlanMilestone[];
  tasks: Array<Pick<PlanTask, 'title' | 'duration' | 'status' | 'note'>>;
} {
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
        note: `不要只浏览概念，必须把示例跑起来；如果有 README，也一起确认最小启动方式。`,
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

export function buildProgrammingTodayPlanTemplate(
  goal: Pick<LearningGoal, 'title' | 'baseline' | 'successMetric'>,
  draft: Pick<LearningPlanDraft, 'todayContext' | 'tasks'>,
  profile: Pick<UserProfile, 'timeBudget'>,
): {
  todayGoal: string;
  deliverable: string;
  estimatedDuration: string;
  steps: Array<Pick<TodayPlanStep, 'title' | 'detail' | 'duration'>>;
  resources: TodayPlanResource[];
  practice: TodayPlanPractice[];
} {
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
