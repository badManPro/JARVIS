import type {
  LearningGoal,
  LearningPlanDraft,
  LearningPlanSnapshot,
  LearningPlanState,
  UserProfile,
} from './app-state.js';

type PlanDraftMode = 'initial' | 'regenerated';

export function buildDraftId(goalId: string) {
  return `plan-${goalId}`;
}

function buildTaskId(goalId: string, index: number) {
  return `${goalId}-task-${index + 1}`;
}

export function createPlanDraft(goal: LearningGoal, profile: UserProfile, mode: PlanDraftMode = 'initial'): LearningPlanDraft {
  const intensityHint = profile.timeBudget.includes('2 小时') ? '周末安排一个完整学习块' : '继续保持轻量频次';
  const firstStrength = profile.strengths[0] ?? '已有经验可迁移';
  const firstBlocker = profile.blockers[0] ?? '需要控制任务摩擦';
  const firstPlanImpact = profile.planImpact[0] ?? '计划保持低摩擦、可持续';
  const focusTag = goal.priority === 'P1' ? '主线目标' : '并行目标';
  const titleSuffix = mode === 'regenerated' ? '重生成计划草案' : '首版计划草案';
  const summaryPrefix = mode === 'regenerated' ? '已根据当前目标与画像重生成一版可执行草案' : '会基于当前基础先生成一份可执行草案';
  const basis = [
    `学习动机：${goal.motivation}`,
    `当前基础：${goal.baseline}`,
    `画像优势：${firstStrength}`,
    `风险提醒：${firstBlocker}`,
    `节奏策略：${firstPlanImpact}；${intensityHint}`,
  ];

  if (mode === 'regenerated') {
    basis.unshift('生成方式：基于当前目标、最新画像和现有学习节奏重新生成。');
  }

  return {
    id: buildDraftId(goal.id),
    goalId: goal.id,
    title: `${goal.title} · ${titleSuffix}`,
    summary: `${focusTag}「${goal.title}」${summaryPrefix}“${goal.baseline}”：先拆出低门槛起步动作，再逐步走向“${goal.successMetric}”。`,
    basis,
    stages: [
      { title: '阶段 1：校准起点', outcome: `明确「${goal.title}」的当前起点与最小可执行动作`, progress: '进行中' },
      { title: '阶段 2：稳定推进', outcome: `围绕 ${goal.cycle} 周期保持稳定任务节奏`, progress: '未开始' },
      { title: '阶段 3：验证达成', outcome: `用“${goal.successMetric}”检验目标结果`, progress: '未开始' },
    ],
    tasks: [
      { id: buildTaskId(goal.id, 0), title: `拆解「${goal.title}」的最小行动`, duration: '20 分钟', status: 'todo', note: '把目标变成一周内可以直接开始的动作。' },
      { id: buildTaskId(goal.id, 1), title: '安排本周第一次执行窗口', duration: '10 分钟', status: 'todo', note: `优先利用 ${profile.bestStudyWindow}。` },
      { id: buildTaskId(goal.id, 2), title: '完成一次真实练习并记录反馈', duration: '30-45 分钟', status: 'todo', note: '先形成执行闭环，再考虑进一步精细化。' },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function ensurePlanDrafts(goals: LearningGoal[], planState: LearningPlanState, profile: UserProfile): LearningPlanState {
  const snapshots = (planState.snapshots ?? []).filter((snapshot) => goals.some((goal) => goal.id === snapshot.goalId));
  const drafts = goals.map((goal) => {
    const existingDraft = planState.drafts.find((draft) => draft.goalId === goal.id);
    if (!existingDraft) {
      return createPlanDraft(goal, profile);
    }

    const nextTitle = existingDraft.title.trim() || `${goal.title} · 首版计划草案`;
    return {
      ...existingDraft,
      goalId: goal.id,
      title: nextTitle,
    };
  });

  const activeGoalId = goals.some((goal) => goal.id === planState.activeGoalId)
    ? planState.activeGoalId
    : goals[0]?.id ?? '';

  return {
    activeGoalId,
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
    tasks: draft.tasks.map((task) => ({ ...task })),
    createdAt,
  };
}
