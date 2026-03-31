import test from 'node:test';
import assert from 'node:assert/strict';

import type { LearningGoal } from './app-state.js';
import { buildDashboardGoalScheduling } from './scheduling.js';

function createGoal(id: string, title: string, role: 'main' | 'secondary', scheduleWeight: number): LearningGoal {
  return {
    id,
    title,
    motivation: '',
    baseline: '',
    cycle: '6 周',
    successMetric: '',
    priority: role === 'main' ? 'P1' : 'P2',
    status: 'active' as const,
    domain: 'general',
    role,
    scheduleWeight,
  };
}

test('buildDashboardGoalScheduling remaps delayed steps into weekly anchor/support lanes and tracks remaining time', () => {
  const scheduling = buildDashboardGoalScheduling(
    [
      createGoal('goal-main', '主目标', 'main', 70),
      createGoal('goal-support', '副目标', 'secondary', 30),
    ],
    {
      activeGoalId: 'goal-main',
      drafts: [
        {
          id: 'draft-main',
          goalId: 'goal-main',
          title: '主目标草案',
          summary: '',
          basis: [],
          stages: [],
          milestones: [],
          tasks: [],
          todayContext: {
            availableDuration: '45 分钟',
            studyWindow: '今晚 20:30 - 21:15',
            note: '',
            updatedAt: '2026-03-31T10:00:00.000Z',
          },
          todayPlan: {
            date: '2026-03-31',
            status: 'ready',
            todayGoal: '推进主目标',
            deliverable: '完成主线补回',
            estimatedDuration: '45 分钟',
            milestoneRef: '第 1 周',
            steps: [],
            tomorrowCandidates: [
              {
                id: 'delayed-main',
                title: '补回主目标步骤',
                detail: '主线不能继续断档',
                duration: '20 分钟',
                status: 'delayed',
                statusNote: '今晚时间不够，顺延到明天。',
                dependencyStrategy: 'compress_continue',
              },
            ],
            resources: [],
            practice: [],
            generatedFromContext: {
              availableDuration: '45 分钟',
              studyWindow: '今晚 20:30 - 21:15',
              note: '',
            },
          },
        },
        {
          id: 'draft-support',
          goalId: 'goal-support',
          title: '副目标草案',
          summary: '',
          basis: [],
          stages: [],
          milestones: [],
          tasks: [],
          todayContext: {
            availableDuration: '45 分钟',
            studyWindow: '明晚 20:30 - 21:15',
            note: '',
            updatedAt: '2026-03-31T10:00:00.000Z',
          },
          todayPlan: {
            date: '2026-03-31',
            status: 'ready',
            todayGoal: '推进副目标',
            deliverable: '完成副线补回',
            estimatedDuration: '45 分钟',
            milestoneRef: '第 1 周',
            steps: [],
            tomorrowCandidates: [
              {
                id: 'delayed-support',
                title: '补回副目标步骤',
                detail: '副线动作顺延到后续补位窗口',
                duration: '10 分钟',
                status: 'delayed',
                statusNote: '顺延到后续补位时间。',
                dependencyStrategy: 'auto_reorder',
              },
            ],
            resources: [],
            practice: [],
            generatedFromContext: {
              availableDuration: '45 分钟',
              studyWindow: '明晚 20:30 - 21:15',
              note: '',
            },
          },
        },
      ],
      snapshots: [],
    },
    '45 分钟',
  );

  assert.equal(scheduling.weeklyPlan.length, 7);
  assert.equal(scheduling.delayedPlacements.length, 2);

  const delayedMain = scheduling.delayedPlacements.find((item) => item.stepId === 'delayed-main');
  const delayedSupport = scheduling.delayedPlacements.find((item) => item.stepId === 'delayed-support');
  const wednesday = scheduling.weeklyPlan.find((day) => day.label === '周三');

  assert.equal(delayedMain?.assignedLane, 'anchor');
  assert.equal(delayedMain?.assignedDayLabel, '周三');
  assert.equal(delayedSupport?.assignedLane, 'support');
  assert.equal(delayedSupport?.assignedDayLabel, '周三');
  assert.equal(wednesday?.anchorCarryovers[0]?.stepId, 'delayed-main');
  assert.equal(wednesday?.supportCarryovers[0]?.stepId, 'delayed-support');
  assert.ok((wednesday?.remainingAnchorMinutes ?? 0) < (wednesday?.anchorMinutes ?? 0));
  assert.ok((wednesday?.remainingSupportMinutes ?? 0) < (wednesday?.supportMinutes ?? 0));
});

test('buildDashboardGoalScheduling moves delayed secondary work to a later support day when the preferred day conflicts', () => {
  const scheduling = buildDashboardGoalScheduling(
    [
      createGoal('goal-main', '主目标', 'main', 60),
      createGoal('goal-writing', '写作副目标', 'secondary', 25),
      createGoal('goal-fitness', '健身副目标', 'secondary', 15),
    ],
    {
      activeGoalId: 'goal-main',
      drafts: [
        {
          id: 'draft-main',
          goalId: 'goal-main',
          title: '主目标草案',
          summary: '',
          basis: [],
          stages: [],
          milestones: [],
          tasks: [],
          todayContext: {
            availableDuration: '45 分钟',
            studyWindow: '今晚 20:30 - 21:15',
            note: '',
            updatedAt: '2026-03-31T10:00:00.000Z',
          },
          todayPlan: null,
        },
        {
          id: 'draft-writing',
          goalId: 'goal-writing',
          title: '写作副目标草案',
          summary: '',
          basis: [],
          stages: [],
          milestones: [],
          tasks: [],
          todayContext: {
            availableDuration: '45 分钟',
            studyWindow: '周四晚间',
            note: '',
            updatedAt: '2026-03-31T10:00:00.000Z',
          },
          todayPlan: {
            date: '2026-03-31',
            status: 'ready',
            todayGoal: '推进写作副目标',
            deliverable: '完成一次顺延写作',
            estimatedDuration: '45 分钟',
            milestoneRef: '第 1 周',
            steps: [],
            tomorrowCandidates: [
              {
                id: 'delayed-writing',
                title: '补回一次写作',
                detail: '优先找属于写作副目标的补位窗口',
                duration: '10 分钟',
                status: 'delayed',
                statusNote: '今天先跳过，顺延到后续补位时间。',
                dependencyStrategy: 'wait_recovery',
              },
            ],
            resources: [],
            practice: [],
            generatedFromContext: {
              availableDuration: '45 分钟',
              studyWindow: '周四晚间',
              note: '',
            },
          },
        },
        {
          id: 'draft-fitness',
          goalId: 'goal-fitness',
          title: '健身副目标草案',
          summary: '',
          basis: [],
          stages: [],
          milestones: [],
          tasks: [],
          todayContext: {
            availableDuration: '45 分钟',
            studyWindow: '周五晚间',
            note: '',
            updatedAt: '2026-03-31T10:00:00.000Z',
          },
          todayPlan: null,
        },
      ],
      snapshots: [],
    },
    '45 分钟',
  );

  const delayedWriting = scheduling.delayedPlacements.find((item) => item.stepId === 'delayed-writing');
  const thursday = scheduling.weeklyPlan.find((day) => day.label === '周四');

  assert.equal(delayedWriting?.assignedLane, 'support');
  assert.equal(delayedWriting?.movedFromDayLabel, '周三');
  assert.equal(delayedWriting?.assignedDayLabel, '周四');
  assert.match(delayedWriting?.movedReason ?? '', /冲突|补位/);
  assert.equal(thursday?.supportCarryovers[0]?.stepId, 'delayed-writing');
});
