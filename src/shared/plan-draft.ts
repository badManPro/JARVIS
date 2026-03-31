import type {
  LearningGoal,
  LearningPlanDraft,
  LearningPlanMilestone,
  LearningPlanSnapshot,
  LearningPlanState,
  UserProfile,
} from './app-state.js';
import { createEmptyTodayPlanningContext } from './app-state.js';
import { buildProgrammingPlanTemplate } from './domain-rules.js';
import { resolveGoalScheduling } from './goal.js';

type PlanDraftMode = 'initial' | 'regenerated';

export function buildDraftId(goalId: string) {
  return `plan-${goalId}`;
}

function buildTaskId(goalId: string, index: number) {
  return `${goalId}-task-${index + 1}`;
}

function buildMilestones(goal: LearningGoal, profile: UserProfile): LearningPlanMilestone[] {
  const windowHint = profile.bestStudyWindow || '你最容易稳定投入的学习窗口';

  return [
    {
      title: '第 1 周：搭好基础环境并确认起点',
      focus: `围绕「${goal.title}」先完成环境、工具或基础概念的最小闭环`,
      outcome: `能在 ${windowHint} 内完成一次低阻力启动，并明确当前短板`,
      status: 'current',
    },
    {
      title: '第 2 周：完成一次关键链路练习',
      focus: '把最核心的技术链路完整走通一次，避免长期停留在准备阶段',
      outcome: '形成 1 个可运行、可验证的小成果',
      status: 'upcoming',
    },
    {
      title: '第 3 周：收束本轮最小成果',
      focus: `围绕「${goal.successMetric}」收敛最小可交付物范围`,
      outcome: '得到下一阶段可以持续推进的明确主线',
      status: 'upcoming',
    },
  ];
}

export function createPlanDraft(goal: LearningGoal, profile: UserProfile, mode: PlanDraftMode = 'initial'): LearningPlanDraft {
  const intensityHint = profile.timeBudget.includes('2 小时') ? '周末安排一个完整学习块' : '继续保持轻量频次';
  const firstStrength = profile.strengths[0] ?? '已有经验可迁移';
  const firstBlocker = profile.blockers[0] ?? '需要控制任务摩擦';
  const firstPlanImpact = profile.planImpact[0] ?? '计划保持低摩擦、可持续';
  const focusTag = goal.role === 'main' ? '主目标' : '副目标';
  const titleSuffix = mode === 'regenerated' ? '重生成计划草案' : '首版计划草案';
  const summaryPrefix = mode === 'regenerated' ? '已根据当前目标与画像重生成一版可执行草案' : '会基于当前基础先生成一份可执行草案';
  const programmingTemplate = goal.domain === 'programming' ? buildProgrammingPlanTemplate(goal, profile) : null;
  const basis = [
    `学习动机：${goal.motivation}`,
    `当前基础：${goal.baseline}`,
    `画像优势：${firstStrength}`,
    `风险提醒：${firstBlocker}`,
    `节奏策略：${firstPlanImpact}；${intensityHint}`,
    ...(programmingTemplate?.basis ?? []),
  ];

  if (mode === 'regenerated') {
    basis.unshift('生成方式：基于当前目标、最新画像和现有学习节奏重新生成。');
  }

  return {
    id: buildDraftId(goal.id),
    goalId: goal.id,
    title: `${goal.title} · ${titleSuffix}`,
    summary: programmingTemplate
      ? `${focusTag}「${goal.title}」${summaryPrefix}“${goal.baseline}”：${programmingTemplate.summary}`
      : `${focusTag}「${goal.title}」${summaryPrefix}“${goal.baseline}”：先拆出低门槛起步动作，再逐步走向“${goal.successMetric}”。`,
    basis,
    stages: programmingTemplate?.stages ?? [
      { title: '阶段 1：校准起点', outcome: `明确「${goal.title}」的当前起点与最小可执行动作`, progress: '进行中' },
      { title: '阶段 2：稳定推进', outcome: `围绕 ${goal.cycle} 周期保持稳定任务节奏`, progress: '未开始' },
      { title: '阶段 3：验证达成', outcome: `用“${goal.successMetric}”检验目标结果`, progress: '未开始' },
    ],
    milestones: programmingTemplate?.milestones ?? buildMilestones(goal, profile),
    tasks: (programmingTemplate?.tasks ?? [
      { title: '安装并验证本地学习环境', duration: '20 分钟', status: 'todo' as const, note: '先把工具和运行方式确认好，避免一开始卡在环境问题。' },
      { title: '完成 2 个最基础概念练习', duration: '30 分钟', status: 'todo' as const, note: `优先选择能在 ${profile.bestStudyWindow || '当前学习窗口'} 内完成的小练习。` },
      { title: '记录一版本周最小成果目标', duration: '15 分钟', status: 'todo' as const, note: '写清楚这周要交付什么，避免只学不落地。' },
    ]).map((task, index) => ({
      id: buildTaskId(goal.id, index),
      ...task,
    })),
    todayPlan: null,
    todayContext: createEmptyTodayPlanningContext(),
    updatedAt: new Date().toISOString(),
  };
}

export function ensurePlanDrafts(goals: LearningGoal[], planState: LearningPlanState, profile: UserProfile): LearningPlanState {
  const scheduled = resolveGoalScheduling(goals, planState.activeGoalId);
  const normalizedGoals = scheduled.goals;
  const snapshots = (planState.snapshots ?? []).filter((snapshot) => normalizedGoals.some((goal) => goal.id === snapshot.goalId));
  const drafts = normalizedGoals.map((goal) => {
    const existingDraft = planState.drafts.find((draft) => draft.goalId === goal.id);
    if (!existingDraft) {
      return createPlanDraft(goal, profile);
    }

    const nextTitle = existingDraft.title.trim() || `${goal.title} · 首版计划草案`;
    return {
      ...existingDraft,
      goalId: goal.id,
      title: nextTitle,
      milestones: existingDraft.milestones?.length ? existingDraft.milestones : buildMilestones(goal, profile),
      todayPlan: existingDraft.todayPlan ?? null,
      todayContext: existingDraft.todayContext ?? createEmptyTodayPlanningContext(),
    };
  });

  return {
    activeGoalId: scheduled.activeGoalId,
    drafts,
    snapshots,
  };
}

export function getActiveDraft(planState: LearningPlanState): LearningPlanDraft | null {
  return planState.drafts.find((draft) => draft.goalId === planState.activeGoalId) ?? planState.drafts[0] ?? null;
}

export function getNextSnapshotVersion(snapshots: LearningPlanSnapshot[], goalId: string) {
  return snapshots.reduce((maxVersion, snapshot) => {
    if (snapshot.goalId !== goalId) return maxVersion;
    return Math.max(maxVersion, snapshot.version);
  }, 0) + 1;
}

export function createPlanSnapshot(draft: LearningPlanDraft, version: number, createdAt = new Date().toISOString()): LearningPlanSnapshot {
  return {
    id: `snapshot-${draft.goalId}-${version}-${Date.now()}`,
    draftId: draft.id,
    goalId: draft.goalId,
    version,
    source: 'regenerated',
    title: draft.title,
    summary: draft.summary,
    basis: [...draft.basis],
    stages: draft.stages.map((stage) => ({ ...stage })),
    milestones: draft.milestones.map((milestone) => ({ ...milestone })),
    tasks: draft.tasks.map((task) => ({ ...task })),
    createdAt,
  };
}
