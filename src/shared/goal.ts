import type { GoalStatus, LearningGoal, LearningGoalRole } from './app-state.js';

export const DEFAULT_MAIN_GOAL_WEIGHT = 70;
export const DEFAULT_SECONDARY_GOAL_WEIGHT = 30;
export const MIN_MAIN_GOAL_SHARE = 60;
const MIN_GOAL_WEIGHT = 10;
const MAX_GOAL_WEIGHT = 100;

export type LearningGoalInput = {
  id?: string;
  title: string;
  motivation: string;
  baseline: string;
  cycle: string;
  successMetric: string;
  priority: LearningGoal['priority'];
  status: GoalStatus;
  role?: LearningGoalRole;
  scheduleWeight?: number;
};

export function normalizeLearningGoalRole(role?: string): LearningGoalRole {
  return role === 'secondary' ? 'secondary' : 'main';
}

export function normalizeGoalScheduleWeight(weight: number | undefined, role: LearningGoalRole) {
  if (!Number.isFinite(weight) || (weight ?? 0) <= 0) {
    return role === 'main' ? DEFAULT_MAIN_GOAL_WEIGHT : DEFAULT_SECONDARY_GOAL_WEIGHT;
  }

  return Math.max(MIN_GOAL_WEIGHT, Math.min(MAX_GOAL_WEIGHT, Math.round(weight ?? 0)));
}

export function getMainGoalId<T extends { id: string; role?: LearningGoalRole }>(
  goals: T[],
  preferredMainGoalId?: string,
) {
  if (preferredMainGoalId && goals.some((goal) => goal.id === preferredMainGoalId)) {
    return preferredMainGoalId;
  }

  return goals.find((goal) => goal.role === 'main')?.id ?? goals[0]?.id ?? '';
}

export function resolveGoalScheduling<T extends {
  id: string;
  role?: LearningGoalRole;
  scheduleWeight?: number;
}>(
  goals: T[],
  preferredMainGoalId?: string,
): {
  goals: Array<T & { role: LearningGoalRole; scheduleWeight: number }>;
  activeGoalId: string;
} {
  const activeGoalId = getMainGoalId(goals, preferredMainGoalId);

  return {
    activeGoalId,
    goals: goals.map((goal) => {
      const role: LearningGoalRole = goal.id === activeGoalId ? 'main' : 'secondary';
      return {
        ...goal,
        role,
        scheduleWeight: normalizeGoalScheduleWeight(goal.scheduleWeight, role),
      };
    }),
  };
}

export function buildGoalScheduleAllocations<T extends {
  id: string;
  title: string;
  role?: LearningGoalRole;
  scheduleWeight?: number;
}>(
  goals: T[],
  preferredMainGoalId?: string,
): {
  activeGoalId: string;
  allocations: Array<T & {
    role: LearningGoalRole;
    scheduleWeight: number;
    scheduledShare: number;
    lane: 'anchor' | 'support';
  }>;
} {
  const resolved = resolveGoalScheduling(goals, preferredMainGoalId);
  const scheduledGoals = resolved.goals;
  const mainGoal = scheduledGoals.find((goal) => goal.role === 'main');
  const secondaryGoals = scheduledGoals.filter((goal) => goal.role === 'secondary');

  if (!mainGoal) {
    return {
      activeGoalId: resolved.activeGoalId,
      allocations: [],
    };
  }

  if (!secondaryGoals.length) {
    return {
      activeGoalId: resolved.activeGoalId,
      allocations: [
        {
          ...mainGoal,
          lane: 'anchor',
          scheduledShare: 100,
        },
      ],
    };
  }

  const totalWeight = scheduledGoals.reduce((sum, goal) => sum + goal.scheduleWeight, 0) || 1;
  const rawMainShare = Math.round((mainGoal.scheduleWeight / totalWeight) * 100);
  const mainShare = Math.min(
    Math.max(rawMainShare, MIN_MAIN_GOAL_SHARE),
    100 - secondaryGoals.length,
  );
  const remainingShare = Math.max(0, 100 - mainShare);
  const secondaryWeightTotal = secondaryGoals.reduce((sum, goal) => sum + goal.scheduleWeight, 0) || secondaryGoals.length;
  const draftedSecondary = secondaryGoals.map((goal) => {
    const exactShare = secondaryWeightTotal
      ? (goal.scheduleWeight / secondaryWeightTotal) * remainingShare
      : remainingShare / secondaryGoals.length;
    return {
      goal,
      exactShare,
      scheduledShare: Math.floor(exactShare),
    };
  });
  let remainingPoints = remainingShare - draftedSecondary.reduce((sum, item) => sum + item.scheduledShare, 0);
  const secondaryWithRemainder = draftedSecondary
    .slice()
    .sort((left, right) => {
      const remainderDiff = (right.exactShare - right.scheduledShare) - (left.exactShare - left.scheduledShare);
      if (remainderDiff !== 0) {
        return remainderDiff;
      }
      return right.goal.scheduleWeight - left.goal.scheduleWeight;
    })
    .map((item) => {
      if (remainingPoints <= 0) {
        return item;
      }
      remainingPoints -= 1;
      return {
        ...item,
        scheduledShare: item.scheduledShare + 1,
      };
    });
  const secondaryShareById = new Map(
    secondaryWithRemainder.map((item) => [item.goal.id, item.scheduledShare]),
  );

  return {
    activeGoalId: resolved.activeGoalId,
    allocations: scheduledGoals
      .map((goal) => (
        goal.role === 'main'
          ? {
            ...goal,
            lane: 'anchor' as const,
            scheduledShare: mainShare,
          }
          : {
            ...goal,
            lane: 'support' as const,
            scheduledShare: secondaryShareById.get(goal.id) ?? 0,
          }
      ))
      .sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === 'main' ? -1 : 1;
        }
        return right.scheduledShare - left.scheduledShare;
      }),
  };
}

export function goalRoleLabel(role: LearningGoalRole) {
  return role === 'main' ? '主目标' : '副目标';
}
