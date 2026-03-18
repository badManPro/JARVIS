import type { GoalStatus, LearningGoal } from './app-state.js';

export type LearningGoalInput = {
  id?: string;
  title: string;
  motivation: string;
  baseline: string;
  cycle: string;
  successMetric: string;
  priority: LearningGoal['priority'];
  status: GoalStatus;
};
