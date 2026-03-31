import type {
  AppState,
  DashboardDelayedPlacement,
  DashboardGoalSchedulingItem,
  DashboardWeeklyScheduleDay,
  LearningGoal,
  LearningGoalRole,
  LearningPlanDraft,
  LearningPlanState,
  TodayPlanDependencyStrategy,
} from './app-state.js';
import { buildGoalScheduleAllocations } from './goal.js';

const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
const DEFAULT_DAY_MINUTES = 45;
const MIN_DAY_MINUTES = 30;
const MAX_DAY_MINUTES = 180;

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

function dependencyStrategyLabel(strategy?: TodayPlanDependencyStrategy) {
  switch (strategy) {
    case 'compress_continue':
      return '压缩继续';
    case 'wait_recovery':
      return '等待补回';
    case 'auto_reorder':
    default:
      return '自动重排';
  }
}

function parseDurationMinutes(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return 0;
  }

  const hourRangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*小时/u);
  if (hourRangeMatch) {
    const start = Number(hourRangeMatch[1]);
    const end = Number(hourRangeMatch[2]);
    return Math.round(((start + end) / 2) * 60);
  }

  const minuteRangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-~到至]\s*(\d+(?:\.\d+)?)\s*分钟?/u);
  if (minuteRangeMatch) {
    const start = Number(minuteRangeMatch[1]);
    const end = Number(minuteRangeMatch[2]);
    return Math.round((start + end) / 2);
  }

  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*小时/u);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*分钟?/u);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  if (hours || minutes) {
    return Math.round((hours * 60) + minutes);
  }

  const fallbackNumber = normalized.match(/\d+(?:\.\d+)?/u);
  return fallbackNumber ? Math.round(Number(fallbackNumber[0])) : 0;
}

function resolveSchedulingDayMinutes(timeBudget?: string, plan?: LearningPlanState) {
  const durationCandidates = [
    parseDurationMinutes(timeBudget),
    ...(plan?.drafts ?? []).flatMap((draft) => [
      parseDurationMinutes(draft.todayContext.availableDuration),
      parseDurationMinutes(draft.todayPlan?.estimatedDuration),
      ...(draft.todayPlan?.tomorrowCandidates ?? []).map((step) => parseDurationMinutes(step.duration)),
    ]),
  ].filter((value) => value > 0);

  const resolved = durationCandidates.length ? Math.max(...durationCandidates) : DEFAULT_DAY_MINUTES;
  return Math.max(MIN_DAY_MINUTES, Math.min(MAX_DAY_MINUTES, resolved));
}

function resolveDayIndex(date: string | undefined) {
  const normalized = date?.trim() ?? '';
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) {
    return 0;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (weekday + 6) % 7;
}

function buildSupportRotation(allocations: DashboardGoalSchedulingItem[]) {
  const secondaryAllocations = allocations.filter((allocation) => allocation.role === 'secondary');
  if (!secondaryAllocations.length) {
    return weekLabels.map(() => null);
  }

  const slotCount = weekLabels.length;
  const totalShare = secondaryAllocations.reduce((sum, allocation) => sum + allocation.scheduledShare, 0) || 1;
  const drafted = secondaryAllocations.map((allocation) => {
    const exactCount = (allocation.scheduledShare / totalShare) * slotCount;
    return {
      allocation,
      exactCount,
      count: Math.floor(exactCount),
    };
  });

  let remainingSlots = slotCount - drafted.reduce((sum, item) => sum + item.count, 0);
  while (remainingSlots > 0) {
    drafted.sort((left, right) => (right.exactCount - right.count) - (left.exactCount - left.count));
    drafted[0]!.count += 1;
    remainingSlots -= 1;
  }

  const rotation: DashboardGoalSchedulingItem[] = [];
  const queue = drafted.map((item) => ({ ...item }));
  while (rotation.length < slotCount && queue.some((item) => item.count > 0)) {
    for (const item of queue) {
      if (item.count > 0) {
        rotation.push(item.allocation);
        item.count -= 1;
      }
      if (rotation.length === slotCount) {
        break;
      }
    }
  }

  while (rotation.length < slotCount) {
    rotation.push(queue[0]?.allocation ?? secondaryAllocations[0]);
  }

  return rotation;
}

type InternalDelayedCandidate = {
  stepId: string;
  title: string;
  detail: string;
  duration: string;
  durationMinutes: number;
  statusNote: string;
  goalId: string;
  goalTitle: string;
  goalRole: LearningGoalRole;
  strategyLabel: string;
  preferredDayIndex: number;
};

function collectDelayedCandidates(
  plan: LearningPlanState,
  allocations: DashboardGoalSchedulingItem[],
): InternalDelayedCandidate[] {
  const allocationByGoalId = new Map(allocations.map((allocation) => [allocation.goalId, allocation]));

  return plan.drafts.flatMap((draft) => {
    const allocation = allocationByGoalId.get(draft.goalId);
    return (draft.todayPlan?.tomorrowCandidates ?? []).map((step) => ({
      stepId: step.id,
      title: step.title,
      detail: step.detail,
      duration: step.duration,
      durationMinutes: parseDurationMinutes(step.duration),
      statusNote: step.statusNote,
      goalId: draft.goalId,
      goalTitle: allocation?.title ?? draft.title,
      goalRole: allocation?.role ?? 'secondary',
      strategyLabel: dependencyStrategyLabel(step.dependencyStrategy),
      preferredDayIndex: Math.min(resolveDayIndex(draft.todayPlan?.date) + 1, weekLabels.length - 1),
    }));
  });
}

function buildWeeklyPlanSkeleton(
  primaryAllocation: DashboardGoalSchedulingItem,
  allocations: DashboardGoalSchedulingItem[],
  dayMinutes: number,
) {
  const supportRotation = buildSupportRotation(allocations);
  const anchorMinutes = Math.max(1, Math.round(dayMinutes * (primaryAllocation.scheduledShare / 100)));
  const supportMinutes = Math.max(0, dayMinutes - anchorMinutes);

  return weekLabels.map((label, index) => {
    const supportGoal = supportRotation[index] ?? null;
    return {
      label,
      anchorGoalId: primaryAllocation.goalId,
      anchorGoalTitle: primaryAllocation.title,
      supportGoalId: supportGoal?.goalId ?? null,
      supportGoalTitle: supportGoal?.title ?? '',
      supportGoalRole: supportGoal?.role ?? null,
      supportGoalFocusLabel: supportGoal?.focusLabel ?? '',
      anchorShare: primaryAllocation.scheduledShare,
      supportShare: Math.max(100 - primaryAllocation.scheduledShare, 0),
      anchorMinutes,
      supportMinutes,
      remainingAnchorMinutes: anchorMinutes,
      remainingSupportMinutes: supportMinutes,
      anchorCarryovers: [],
      supportCarryovers: [],
      note: '',
    } satisfies DashboardWeeklyScheduleDay;
  });
}

function buildSupportConflictReason(
  candidate: InternalDelayedCandidate,
  fromDayLabel: string,
  toDayLabel: string,
  preferredSupportTitle: string,
) {
  return `${fromDayLabel} 的补位窗口先服务「${preferredSupportTitle}」，系统因补位冲突把「${candidate.title}」挪到 ${toDayLabel}。`;
}

function buildCapacityConflictReason(
  candidate: InternalDelayedCandidate,
  fromDayLabel: string,
  toDayLabel: string,
  laneLabel: string,
) {
  return `${fromDayLabel} 的${laneLabel}时间不足以容纳「${candidate.title}」，系统把它顺延到 ${toDayLabel}。`;
}

function placeDelayedCandidates(
  weeklyPlan: DashboardWeeklyScheduleDay[],
  delayedCandidates: InternalDelayedCandidate[],
): DashboardDelayedPlacement[] {
  const placements: DashboardDelayedPlacement[] = [];

  for (const candidate of delayedCandidates) {
    const assignedLane = candidate.goalRole === 'main' ? 'anchor' : 'support';
    const candidateMinutes = Math.max(candidate.durationMinutes, 1);
    const preferredDayIndex = Math.max(0, Math.min(candidate.preferredDayIndex, weeklyPlan.length - 1));
    const candidateDayRange = weeklyPlan.slice(preferredDayIndex);
    let assignedIndex = preferredDayIndex;
    let movedFromDayLabel: string | undefined;
    let movedReason: string | undefined;

    if (assignedLane === 'anchor') {
      const fitIndex = candidateDayRange.findIndex((day) => day.remainingAnchorMinutes >= candidateMinutes);
      if (fitIndex >= 0) {
        assignedIndex = preferredDayIndex + fitIndex;
      }

      if (assignedIndex !== preferredDayIndex) {
        movedFromDayLabel = weeklyPlan[preferredDayIndex]?.label;
        movedReason = buildCapacityConflictReason(
          candidate,
          weeklyPlan[preferredDayIndex]?.label ?? weekLabels[preferredDayIndex],
          weeklyPlan[assignedIndex]?.label ?? weekLabels[assignedIndex],
          '主线连续',
        );
      }
    } else {
      const preferredSupportMatchIndex = candidateDayRange.findIndex((day) => day.supportGoalId === candidate.goalId && day.remainingSupportMinutes >= candidateMinutes);
      if (preferredSupportMatchIndex >= 0) {
        assignedIndex = preferredDayIndex + preferredSupportMatchIndex;
        if (assignedIndex !== preferredDayIndex) {
          movedFromDayLabel = weeklyPlan[preferredDayIndex]?.label;
          movedReason = buildSupportConflictReason(
            candidate,
            weeklyPlan[preferredDayIndex]?.label ?? weekLabels[preferredDayIndex],
            weeklyPlan[assignedIndex]?.label ?? weekLabels[assignedIndex],
            weeklyPlan[preferredDayIndex]?.supportGoalTitle || '当前补位目标',
          );
        }
      } else {
        const sameGoalIndex = candidateDayRange.findIndex((day) => day.supportGoalId === candidate.goalId);
        if (sameGoalIndex >= 0) {
          assignedIndex = preferredDayIndex + sameGoalIndex;
          if (assignedIndex !== preferredDayIndex) {
            movedFromDayLabel = weeklyPlan[preferredDayIndex]?.label;
            movedReason = buildSupportConflictReason(
              candidate,
              weeklyPlan[preferredDayIndex]?.label ?? weekLabels[preferredDayIndex],
              weeklyPlan[assignedIndex]?.label ?? weekLabels[assignedIndex],
              weeklyPlan[preferredDayIndex]?.supportGoalTitle || '当前补位目标',
            );
          }
        } else {
          const firstFitIndex = candidateDayRange.findIndex((day) => day.remainingSupportMinutes >= candidateMinutes);
          assignedIndex = firstFitIndex >= 0 ? preferredDayIndex + firstFitIndex : preferredDayIndex;
          if (assignedIndex !== preferredDayIndex) {
            movedFromDayLabel = weeklyPlan[preferredDayIndex]?.label;
            movedReason = buildCapacityConflictReason(
              candidate,
              weeklyPlan[preferredDayIndex]?.label ?? weekLabels[preferredDayIndex],
              weeklyPlan[assignedIndex]?.label ?? weekLabels[assignedIndex],
              '补位',
            );
          }
        }
      }
    }

    const assignedDay = weeklyPlan[assignedIndex] ?? weeklyPlan[weeklyPlan.length - 1];
    const availableMinutes = assignedLane === 'anchor'
      ? assignedDay.remainingAnchorMinutes
      : assignedDay.remainingSupportMinutes;
    const overflowMinutes = Math.max(candidateMinutes - availableMinutes, 0);

    const placement: DashboardDelayedPlacement = {
      stepId: candidate.stepId,
      title: candidate.title,
      detail: candidate.detail,
      duration: candidate.duration,
      durationMinutes: candidateMinutes,
      statusNote: candidate.statusNote,
      goalId: candidate.goalId,
      goalTitle: candidate.goalTitle,
      goalRole: candidate.goalRole,
      strategyLabel: candidate.strategyLabel,
      assignedDayLabel: assignedDay.label,
      assignedLane,
      movedFromDayLabel,
      movedReason,
      overflowMinutes,
    };

    if (assignedLane === 'anchor') {
      assignedDay.anchorCarryovers.push(placement);
      assignedDay.remainingAnchorMinutes = Math.max(0, assignedDay.remainingAnchorMinutes - candidateMinutes);
    } else {
      assignedDay.supportCarryovers.push(placement);
      assignedDay.remainingSupportMinutes = Math.max(0, assignedDay.remainingSupportMinutes - candidateMinutes);
    }

    placements.push(placement);
  }

  return placements;
}

function buildWeeklyPlanNotes(
  weeklyPlan: DashboardWeeklyScheduleDay[],
  primaryAllocation: DashboardGoalSchedulingItem,
) {
  return weeklyPlan.map((day) => {
    const anchorCarryoverCount = day.anchorCarryovers.length;
    const supportCarryoverCount = day.supportCarryovers.length;
    const supportTitle = day.supportGoalTitle || primaryAllocation.title;

    let note = '';
    if (anchorCarryoverCount || supportCarryoverCount) {
      const leading = [
        anchorCarryoverCount ? `先补回 ${anchorCarryoverCount} 个主目标延期步骤` : '',
        supportCarryoverCount ? `再补回 ${supportCarryoverCount} 个副目标延期步骤` : '',
      ].filter(Boolean).join('，');
      note = `${leading}，然后把剩余时间继续留给「${supportTitle}」。`;
    } else if (day.supportGoalId) {
      note = `这一天先保留主目标连续块，剩余补位时间交给「${supportTitle}」。`;
    } else {
      note = '当前没有副目标补位项，整天围绕主目标连续推进。';
    }

    const overflowMinutes = [...day.anchorCarryovers, ...day.supportCarryovers]
      .reduce((sum, item) => sum + item.overflowMinutes, 0);
    if (overflowMinutes > 0) {
      note = `${note} 当前仍有 ${overflowMinutes} 分钟需要后续继续挪动。`;
    }

    return {
      ...day,
      note,
    };
  });
}

export function buildDashboardGoalScheduling(
  goals: LearningGoal[],
  plan: LearningPlanState,
  timeBudget?: string,
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
      delayedPlacements: [],
      weeklyPlan: [],
    };
  }

  const allocations = scheduled.allocations.map((allocation) => {
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
    } satisfies DashboardGoalSchedulingItem;
  });
  const dayMinutes = resolveSchedulingDayMinutes(timeBudget, plan);
  const weeklyPlanSkeleton = buildWeeklyPlanSkeleton(
    allocations.find((allocation) => allocation.role === 'main') ?? {
      goalId: primary.id,
      title: primary.title,
      role: 'main',
      lane: 'anchor',
      rawWeight: primary.scheduleWeight,
      scheduledShare: primary.scheduledShare,
      delayedCandidateCount: delayedCandidateCount,
      focusLabel: '等待生成粗版计划',
    },
    allocations,
    dayMinutes,
  );
  const delayedPlacements = placeDelayedCandidates(
    weeklyPlanSkeleton,
    collectDelayedCandidates(plan, allocations).sort((left, right) => {
      if (left.goalRole !== right.goalRole) {
        return left.goalRole === 'main' ? -1 : 1;
      }
      if (left.preferredDayIndex !== right.preferredDayIndex) {
        return left.preferredDayIndex - right.preferredDayIndex;
      }
      return left.durationMinutes - right.durationMinutes;
    }),
  );
  const weeklyPlan = buildWeeklyPlanNotes(
    weeklyPlanSkeleton,
    allocations[0] ?? {
      goalId: primary.id,
      title: primary.title,
      role: 'main',
      lane: 'anchor',
      rawWeight: primary.scheduleWeight,
      scheduledShare: primary.scheduledShare,
      delayedCandidateCount: delayedCandidateCount,
      focusLabel: '等待生成粗版计划',
    },
  );

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
      ? `日历排程页将把 ${delayedCandidateCount} 个延期候选重新塞回主线连续块和副目标补位窗口。`
      : '日历排程页将直接消费这组主副目标分配与补位顺序。',
    delayedCandidateCount,
    allocations,
    delayedPlacements,
    weeklyPlan,
  };
}
