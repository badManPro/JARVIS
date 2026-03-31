import type { AppState, LearningGoal, LearningPlanDraft, LearningPlanState } from './app-state.js';
import { buildGoalScheduleAllocations } from './goal.js';

function pickSchedulingFocusLabel(draft: LearningPlanDraft | undefined) {
  if (!draft) {
    return '等待生成粗版计划';
  }

  const currentMilestone = draft.milestones.find((item) => item.status === 'current') ?? draft.milestones[0];
  if (currentMilestone) {
    return `${currentMilestone.title}｜${currentMilestone.focus}`;
  }

  const focusTask = draft.tasks.find((task) => task.status === 'in_progress')
    ?? draft.tasks.find((task) => task.status === 'todo')
    ?? draft.tasks[0];
  if (focusTask) {
    return `${focusTask.status === 'in_progress' ? '当前推进' : '下一步'}：${focusTask.title}`;
  }

  return draft.title.trim() || '等待生成粗版计划';
}

function countDelayedCandidates(draft: LearningPlanDraft | undefined) {
  return draft?.todayPlan?.tomorrowCandidates.length ?? 0;
}

export function buildDashboardGoalScheduling(
  goals: LearningGoal[],
  plan: LearningPlanState,
): AppState['dashboard']['scheduling'] {
  const scheduled = buildGoalScheduleAllocations(goals, plan.activeGoalId);
  const primary = scheduled.allocations.find((allocation) => allocation.role === 'main');
  const secondaryTotal = scheduled.allocations
    .filter((allocation) => allocation.role === 'secondary')
    .reduce((sum, allocation) => sum + allocation.scheduledShare, 0);
  const delayedCandidateCount = plan.drafts.reduce((sum, draft) => sum + countDelayedCandidates(draft), 0);

  if (!primary) {
    return {
      primaryGoalId: '',
      primaryGoalTitle: '',
      headline: '先创建主目标，系统才会生成调度预览。',
      guardrail: '当前还没有可持续推进的主线，暂时无法安排主副目标占位。',
      calendarHint: '日历排程需要至少一个主目标后才会生成。',
      delayedCandidateCount: 0,
      allocations: [],
    };
  }

  return {
    primaryGoalId: primary.id,
    primaryGoalTitle: primary.title,
    headline: secondaryTotal
      ? `主目标优先占位 ${primary.scheduledShare}%，副目标补位 ${secondaryTotal}%。当前主线：${primary.title}`
      : `主目标优先占位 ${primary.scheduledShare}%，当前没有副目标补位项。当前主线：${primary.title}`,
    guardrail: secondaryTotal
      ? '系统会先保留主目标的稳定时间块，再让副目标按权重补位并共享剩余时间；同一天尽量不频繁切换。'
      : '当前只有一个主目标，今天与后续日历都会围绕这条主线展开。',
    calendarHint: delayedCandidateCount
      ? `日历排程页将直接消费这组目标分配，并优先重排 ${delayedCandidateCount} 个延期候选步骤。`
      : '日历排程页将直接消费这组主副目标分配与补位顺序。',
    delayedCandidateCount,
    allocations: scheduled.allocations.map((allocation) => {
      const draft = plan.drafts.find((item) => item.goalId === allocation.id);
      return {
        goalId: allocation.id,
        title: allocation.title,
        role: allocation.role,
        lane: allocation.lane,
        rawWeight: allocation.scheduleWeight,
        scheduledShare: allocation.scheduledShare,
        delayedCandidateCount: countDelayedCandidates(draft),
        focusLabel: pickSchedulingFocusLabel(draft),
      };
    }),
  };
}
