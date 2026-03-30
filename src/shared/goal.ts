import type { GoalStatus, LearningGoal, LearningGoalRole } from './app-state.js';

export const DEFAULT_MAIN_GOAL_WEIGHT = 70;
export const DEFAULT_SECONDARY_GOAL_WEIGHT = 30;
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

export function goalRoleLabel(role: LearningGoalRole) {
  return role === 'main' ? '主目标' : '副目标';
}
