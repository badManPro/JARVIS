import test from 'node:test';
import assert from 'node:assert/strict';
import * as appStateModule from './app-state.js';
import {
  appendConversationMessage,
  createEmptyAppState,
  applyAcceptedConversationActionPreviews,
  resolveConversationState,
  saveReflectionEntry,
  syncExecutionDerivedState,
  seedState,
  updatePlanTaskStatus,
  updateConversationActionPreviewReview,
} from './app-state.js';

test('resolveConversationState records source metadata and creation time for new action previews', () => {
  const before = Date.now();
  const conversation = resolveConversationState({
    profile: seedState.profile,
    goals: seedState.goals,
    plan: seedState.plan,
    settings: seedState.settings,
    conversation: {
      ...seedState.conversation,
      suggestions: ['采纳：把学习窗口调整到周末上午 09:00 - 11:00'],
      actionPreviews: [],
    },
  });
  const after = Date.now();

  assert.equal(conversation.actionPreviews.length, 1);

  const [preview] = conversation.actionPreviews;
  assert.equal(preview.sourceType, 'conversation_suggestion');
  assert.equal(preview.sourceLabel, '对话建议');
  assert.match(preview.createdAt, /\d{4}-\d{2}-\d{2}T/);
  assert.equal(preview.appliedAt, undefined);

  const createdAtMs = new Date(preview.createdAt).getTime();
  assert.ok(createdAtMs >= before && createdAtMs <= after);
});

test('applyAcceptedConversationActionPreviews records appliedAt and preserves source metadata', () => {
  const resolvedConversation = resolveConversationState({
    profile: seedState.profile,
    goals: seedState.goals,
    plan: seedState.plan,
    settings: seedState.settings,
    conversation: {
      ...seedState.conversation,
      suggestions: ['采纳：把学习窗口调整到周末上午 09:00 - 11:00'],
      actionPreviews: [],
    },
  });

  const acceptedConversation = updateConversationActionPreviewReview(resolvedConversation, {
    actionId: resolvedConversation.actionPreviews[0].id,
    reviewStatus: 'accepted',
    reviewedAt: '2026-03-22T10:00:00.000Z',
  });

  const result = applyAcceptedConversationActionPreviews({
    ...seedState,
    conversation: acceptedConversation,
  });

  assert.equal(result.appliedActionIds.length, 1);

  const appliedPreview = result.state.conversation.actionPreviews.find(
    (preview) => preview.id === resolvedConversation.actionPreviews[0].id,
  );

  assert.ok(appliedPreview);
  assert.equal(appliedPreview.sourceType, 'conversation_suggestion');
  assert.equal(appliedPreview.sourceLabel, '对话建议');
  assert.equal(appliedPreview.reviewStatus, 'accepted');
  assert.equal(appliedPreview.reviewedAt, '2026-03-22T10:00:00.000Z');
  assert.equal(appliedPreview.status, 'applied');
  assert.match(appliedPreview.appliedAt ?? '', /\d{4}-\d{2}-\d{2}T/);
});

test('appendConversationMessage appends a trimmed user message without clearing existing suggestions', () => {
  const resolvedConversation = resolveConversationState({
    profile: seedState.profile,
    goals: seedState.goals,
    plan: seedState.plan,
    settings: seedState.settings,
    conversation: {
      ...seedState.conversation,
      messages: [],
      suggestions: ['采纳：把学习窗口调整到周末上午 09:00 - 11:00'],
      actionPreviews: [],
    },
  });

  const nextState = appendConversationMessage(
    {
      ...seedState,
      conversation: resolvedConversation,
    },
    {
      role: 'user',
      content: '  我最近工作日只够学 30 分钟，想压缩目标周期。  ',
    },
  );

  assert.equal(nextState.conversation.messages.length, 1);
  assert.equal(nextState.conversation.messages[0]?.role, 'user');
  assert.equal(nextState.conversation.messages[0]?.content, '我最近工作日只够学 30 分钟，想压缩目标周期。');
  assert.equal(nextState.conversation.suggestions[0], '采纳：把学习窗口调整到周末上午 09:00 - 11:00');
  assert.equal(nextState.conversation.actionPreviews.length, 1);
});

test('updateTodayPlanStepStatus moves delayed steps into tomorrow candidates and advances focus', () => {
  const activeDraftId = seedState.plan.drafts[0]?.id ?? 'plan-goal-python-ai';
  const stateWithTodayPlan = {
    ...JSON.parse(JSON.stringify(seedState)),
    plan: {
      ...seedState.plan,
      drafts: seedState.plan.drafts.map((draft) => (
        draft.id === activeDraftId
          ? {
            ...draft,
            todayPlan: {
              date: '2026-03-31',
              status: 'ready',
              todayGoal: '完成 Python 环境安装与第一个脚本',
              deliverable: '跑通 hello_cli.py',
              estimatedDuration: '30 分钟',
              milestoneRef: '第 1 周：搭好 Python 本地环境',
              steps: [
                { id: 'today-step-1', title: '安装并验证 Python', detail: '确认 python3 --version', duration: '10 分钟' },
                { id: 'today-step-2', title: '创建 hello_cli.py', detail: '先写最小输入输出', duration: '10 分钟' },
                { id: 'today-step-3', title: '运行并记录结果', detail: '确认脚本可以执行', duration: '10 分钟' },
              ],
              tomorrowCandidates: [],
              resources: [],
              practice: [],
              generatedFromContext: {
                availableDuration: '今天 30 分钟',
                studyWindow: '今晚 20:30 - 21:00',
                note: '',
              },
            },
          }
          : draft
      )),
    },
  };

  const updateTodayPlanStepStatus = (appStateModule as unknown as {
    updateTodayPlanStepStatus: (
      state: typeof stateWithTodayPlan,
      input: { draftId: string; stepId: string; status: string; statusNote?: string },
    ) => typeof stateWithTodayPlan;
  }).updateTodayPlanStepStatus;

  const startedState = updateTodayPlanStepStatus(stateWithTodayPlan, {
    draftId: activeDraftId,
    stepId: 'today-step-1',
    status: 'in_progress',
    statusNote: '从今日页开始推进。',
  });

  const startedDraft = startedState.plan.drafts.find((draft: { id: string }) => draft.id === activeDraftId);
  const startedStep = startedDraft?.todayPlan?.steps[0] as { status?: string; statusNote?: string; statusUpdatedAt?: string } | undefined;
  assert.equal(startedStep?.status, 'in_progress');
  assert.equal(startedStep?.statusNote, '从今日页开始推进。');
  assert.match(startedStep?.statusUpdatedAt ?? '', /\d{4}-\d{2}-\d{2}T/);

  const delayedState = updateTodayPlanStepStatus(startedState, {
    draftId: activeDraftId,
    stepId: 'today-step-1',
    status: 'delayed',
    statusNote: '今晚时间不够，顺延到明天候选区。',
  });

  const delayedDraft = delayedState.plan.drafts.find((draft: { id: string }) => draft.id === activeDraftId);
  const remainingSteps = delayedDraft?.todayPlan?.steps as Array<{
    id?: string;
    status?: string;
    title?: string;
    statusNote?: string;
    dependencyStrategy?: string;
  }> | undefined;
  const tomorrowCandidates = (delayedDraft?.todayPlan as {
    tomorrowCandidates?: Array<{ id?: string; status?: string; title?: string; statusNote?: string }>;
  } | undefined)?.tomorrowCandidates;

  assert.equal(remainingSteps?.some((step) => step.id === 'today-step-1'), false);
  assert.equal(remainingSteps?.[0]?.id, 'today-step-2');
  assert.equal(remainingSteps?.[0]?.dependencyStrategy, 'compress_continue');
  assert.match(remainingSteps?.[0]?.statusNote ?? '', /压缩继续/);
  assert.match(remainingSteps?.[0]?.statusNote ?? '', /安装并验证 Python/);
  assert.equal(remainingSteps?.[1]?.dependencyStrategy, 'auto_reorder');
  assert.match(remainingSteps?.[1]?.statusNote ?? '', /自动重排/);
  assert.equal(tomorrowCandidates?.[0]?.id, 'today-step-1');
  assert.equal(tomorrowCandidates?.[0]?.status, 'delayed');
  assert.equal(tomorrowCandidates?.[0]?.statusNote, '今晚时间不够，顺延到明天候选区。');
});

test('updateTodayPlanStepStatus reorders skipped steps and marks downstream recovery strategy', () => {
  const activeDraftId = seedState.plan.drafts[0]?.id ?? 'plan-goal-python-ai';
  const stateWithTodayPlan = {
    ...JSON.parse(JSON.stringify(seedState)),
    plan: {
      ...seedState.plan,
      drafts: seedState.plan.drafts.map((draft) => (
        draft.id === activeDraftId
          ? {
            ...draft,
            todayPlan: {
              date: '2026-03-31',
              status: 'ready',
              todayGoal: '完成 Python 环境安装与第一个脚本',
              deliverable: '跑通 hello_cli.py',
              estimatedDuration: '30 分钟',
              milestoneRef: '第 1 周：搭好 Python 本地环境',
              steps: [
                { id: 'today-step-1', title: '安装并验证 Python', detail: '确认 python3 --version', duration: '10 分钟' },
                { id: 'today-step-2', title: '创建 hello_cli.py', detail: '先写最小输入输出', duration: '10 分钟' },
                { id: 'today-step-3', title: '运行并记录结果', detail: '确认脚本可以执行', duration: '10 分钟' },
              ],
              tomorrowCandidates: [],
              resources: [],
              practice: [],
              generatedFromContext: {
                availableDuration: '今天 30 分钟',
                studyWindow: '今晚 20:30 - 21:00',
                note: '',
              },
            },
          }
          : draft
      )),
    },
  };

  const updateTodayPlanStepStatus = (appStateModule as unknown as {
    updateTodayPlanStepStatus: (
      state: typeof stateWithTodayPlan,
      input: { draftId: string; stepId: string; status: string; statusNote?: string },
    ) => typeof stateWithTodayPlan;
  }).updateTodayPlanStepStatus;

  const skippedState = updateTodayPlanStepStatus(stateWithTodayPlan, {
    draftId: activeDraftId,
    stepId: 'today-step-1',
    status: 'skipped',
    statusNote: '今晚先保留最小脚手架，不做环境安装。',
  });

  const skippedDraft = skippedState.plan.drafts.find((draft: { id: string }) => draft.id === activeDraftId);
  const reorderedSteps = skippedDraft?.todayPlan?.steps as Array<{
    id?: string;
    status?: string;
    statusNote?: string;
    dependencyStrategy?: string;
  }> | undefined;
  const lastStep = reorderedSteps?.[reorderedSteps.length - 1];

  assert.equal(reorderedSteps?.[0]?.id, 'today-step-2');
  assert.equal(reorderedSteps?.[0]?.dependencyStrategy, 'wait_recovery');
  assert.match(reorderedSteps?.[0]?.statusNote ?? '', /等待补回/);
  assert.match(reorderedSteps?.[0]?.statusNote ?? '', /安装并验证 Python/);
  assert.equal(reorderedSteps?.[1]?.dependencyStrategy, 'auto_reorder');
  assert.match(reorderedSteps?.[1]?.statusNote ?? '', /自动重排/);
  assert.equal(lastStep?.id, 'today-step-1');
  assert.equal(lastStep?.status, 'skipped');
  assert.equal(lastStep?.statusNote, '今晚先保留最小脚手架，不做环境安装。');
});

test('updatePlanTaskStatus records execution metadata and refreshes dashboard/reflection inputs', () => {
  const before = Date.now();
  const skippedState = updatePlanTaskStatus(seedState, {
    draftId: 'plan-goal-python-ai',
    taskId: 'task-python-ai-3',
    status: 'skipped',
    statusNote: '本周先处理 runtime 诊断，暂不进入 MVP 清单拆解。',
  });
  const after = Date.now();

  const skippedDraft = skippedState.plan.drafts.find((draft) => draft.id === 'plan-goal-python-ai');
  const skippedTask = skippedDraft?.tasks.find((task) => task.id === 'task-python-ai-3');

  assert.ok(skippedTask);
  assert.equal(skippedTask.status, 'skipped');
  assert.equal(skippedTask.statusNote, '本周先处理 runtime 诊断，暂不进入 MVP 清单拆解。');
  assert.match(skippedTask.statusUpdatedAt ?? '', /\d{4}-\d{2}-\d{2}T/);

  const skippedUpdatedAt = new Date(skippedTask.statusUpdatedAt ?? '').getTime();
  assert.ok(skippedUpdatedAt >= before && skippedUpdatedAt <= after);
  assert.match(skippedState.dashboard.reflectionSummary, /跳过 1 项/);
  assert.match(skippedState.reflection.deviation, /跳过/);
  assert.match(skippedState.dashboard.priorityAction.title, /生成今日计划/);
  assert.equal(
    skippedState.dashboard.riskSignals.some((risk) => risk.title.includes('跳过') && risk.detail.includes('runtime 诊断')),
    true,
  );
  assert.equal(
    skippedState.reflection.recentTaskExecutions.some((item) => item.taskId === 'task-python-ai-3' && item.status === 'skipped'),
    true,
  );

  const completedState = updatePlanTaskStatus(skippedState, {
    draftId: 'plan-goal-python-ai',
    taskId: 'task-python-ai-2',
    status: 'done',
    statusNote: '已完成真实模型调用链路验证。',
  });

  assert.equal(completedState.reflection.completedTasks, 2);
  assert.match(completedState.reflection.actualDuration, /小时|分钟/);
  assert.match(completedState.dashboard.todayFocus, /生成今日计划/);
  assert.ok(completedState.dashboard.riskSignals.length >= 1);
});

test('saveReflectionEntry writes structured feedback into the selected reflection period', () => {
  const nextState = saveReflectionEntry(seedState, {
    period: 'weekly',
    obstacle: '工作日被临时会议切碎，进入任务前很难连续投入。',
    difficultyFit: 'too_hard',
    timeFit: 'insufficient',
    moodScore: 2,
    confidenceScore: 3,
    accomplishmentScore: 2,
    insight: '当前任务粒度仍偏大，应该先把每次投入压到 30 分钟内。',
    followUpActions: ['把任务拆成 30 分钟内可完成的小步', '把最难的一项前置到周末完整时段'],
  });

  const weeklyEntry = nextState.reflection.entries.find((entry) => entry.period === 'weekly');

  assert.ok(weeklyEntry);
  assert.equal(weeklyEntry.obstacle, '工作日被临时会议切碎，进入任务前很难连续投入。');
  assert.equal(weeklyEntry.difficultyFit, 'too_hard');
  assert.equal(weeklyEntry.timeFit, 'insufficient');
  assert.equal(weeklyEntry.moodScore, 2);
  assert.equal(weeklyEntry.confidenceScore, 3);
  assert.equal(weeklyEntry.accomplishmentScore, 2);
  assert.equal(weeklyEntry.insight, '当前任务粒度仍偏大，应该先把每次投入压到 30 分钟内。');
  assert.deepEqual(weeklyEntry.followUpActions, ['把任务拆成 30 分钟内可完成的小步', '把最难的一项前置到周末完整时段']);
  assert.match(weeklyEntry.updatedAt ?? '', /\d{4}-\d{2}-\d{2}T/);
  assert.equal(
    weeklyEntry.nextActions.some((item) => item.includes('把任务拆成 30 分钟内可完成的小步')),
    true,
  );
  assert.equal(
    nextState.dashboard.riskSignals.some((risk) => risk.title.includes('时间') && risk.action.includes('减少并行事项')),
    true,
  );
  assert.equal(
    nextState.dashboard.riskSignals.some((risk) => risk.title.includes('难度') && risk.action.includes('拆成更小')),
    true,
  );
});

test('seedState derives a structured home priority action and top risk summary', () => {
  assert.equal(seedState.dashboard.priorityAction.title, '生成今日计划');
  assert.equal(seedState.dashboard.priorityAction.duration, '10 分钟');
  assert.match(seedState.dashboard.priorityAction.reason, /粗版路径已经准备好|细版执行安排仍未生成/);
  assert.ok(seedState.dashboard.riskSignals.length >= 1);
  assert.equal(seedState.dashboard.riskSignals[0]?.level, 'medium');
  assert.match(seedState.dashboard.riskSignals[0]?.detail ?? '', /临时事务打断|可交付物/);
});

test('seedState stores weekly rough milestones and keeps today detail empty until user generates it', () => {
  const activeDraft = seedState.plan.drafts.find((draft) => draft.goalId === seedState.plan.activeGoalId);

  assert.ok(activeDraft);
  assert.ok((activeDraft.milestones?.length ?? 0) >= 3);
  assert.match(activeDraft.milestones?.[0]?.title ?? '', /第 1 周|Week 1/);
  assert.equal(activeDraft.todayPlan, null);
  assert.deepEqual(activeDraft.todayContext, {
    availableDuration: '',
    studyWindow: '',
    note: '',
    updatedAt: '',
  });
});

test('createEmptyAppState includes the enhanced learner persona profile fields', () => {
  const state = createEmptyAppState();

  assert.deepEqual(state.profile, {
    name: '',
    identity: '',
    timeBudget: '',
    pacePreference: '',
    strengths: [],
    blockers: [],
    bestStudyWindow: '',
    planImpact: [],
    ageBracket: '',
    gender: '',
    personalityTraits: [],
    mbti: '',
    motivationStyle: '',
    stressResponse: '',
    feedbackPreference: '',
    planningStyle: '',
    decisionSupportLevel: '',
    feedbackTone: '',
    autonomyPreference: '',
  });
});

test('syncExecutionDerivedState derives onboarding guidance for a first-run empty state', () => {
  const emptyLikeState = syncExecutionDerivedState({
    ...JSON.parse(JSON.stringify(seedState)),
    profile: {
      name: '',
      identity: '',
      timeBudget: '',
      pacePreference: '',
      strengths: [],
      blockers: [],
      bestStudyWindow: '',
      planImpact: [],
      ageBracket: '',
      gender: '',
      personalityTraits: [],
      mbti: '',
      motivationStyle: '',
      stressResponse: '',
      feedbackPreference: '',
      planningStyle: '',
      decisionSupportLevel: '',
      feedbackTone: '',
      autonomyPreference: '',
    },
    goals: [],
    plan: {
      activeGoalId: '',
      drafts: [],
      snapshots: [],
    },
    conversation: {
      ...seedState.conversation,
      title: '开始你的第一次学习规划',
      relatedGoal: '暂未设置目标',
      relatedPlan: '暂无计划草案',
      tags: [],
      messages: [],
      suggestions: [],
      actionPreviews: [],
    },
    reflection: {
      ...seedState.reflection,
      period: '阶段复盘',
      completedTasks: 0,
      actualDuration: '0 分钟',
      deviation: '当前周期还没有真实执行记录。',
      insight: '',
      nextActions: [],
      recentTaskExecutions: [],
      entries: [
        {
          ...seedState.reflection.entries[0],
          obstacle: '',
          insight: '',
          nextActions: [],
          followUpActions: [],
          recentTaskExecutions: [],
          updatedAt: undefined,
        },
        {
          ...seedState.reflection.entries[1],
          obstacle: '',
          insight: '',
          nextActions: [],
          followUpActions: [],
          recentTaskExecutions: [],
          updatedAt: undefined,
        },
        {
          ...seedState.reflection.entries[2],
          obstacle: '',
          insight: '',
          nextActions: [],
          followUpActions: [],
          recentTaskExecutions: [],
          updatedAt: undefined,
        },
      ],
    },
  });

  const onboarding = (emptyLikeState.dashboard as typeof emptyLikeState.dashboard & {
    onboarding?: {
      active: boolean;
      completedCount: number;
      totalCount: number;
      steps: Array<{ id: string; status: string }>;
    };
  }).onboarding;

  assert.ok(onboarding);
  assert.equal(onboarding.active, true);
  assert.equal(onboarding.completedCount, 0);
  assert.equal(onboarding.totalCount >= 3, true);
  assert.equal(onboarding.steps[0]?.id, 'profile');
  assert.equal(onboarding.steps[0]?.status, 'current');
  assert.equal(onboarding.steps.some((step) => step.id === 'goal' && step.status === 'pending'), true);
  assert.equal(onboarding.steps.some((step) => step.id === 'execution' && step.status === 'pending'), true);
  assert.match(emptyLikeState.dashboard.priorityAction.title, /首次设置|补全画像|创建首个目标/);
});

test('syncExecutionDerivedState asks the user to generate a daily plan when only the rough path exists', () => {
  const roughOnlyState = syncExecutionDerivedState({
    ...JSON.parse(JSON.stringify(seedState)),
    plan: {
      ...seedState.plan,
      drafts: seedState.plan.drafts.map((draft, index) => (
        index === 0
          ? {
            ...draft,
            todayPlan: null,
          }
          : draft
      )),
    },
  });

  assert.match(roughOnlyState.dashboard.todayFocus, /生成今日计划/);
  assert.match(roughOnlyState.dashboard.priorityAction.title, /生成今日计划/);
  assert.match(roughOnlyState.dashboard.priorityAction.detail, /仅今天有效|学习步骤|资源/);
});

test('resolveConversationState parses reflection-driven profile suggestions into executable previews', () => {
  const suggestions = [
    '采纳：把时间预算调整为工作日 30 分钟，周末 2 小时',
    '采纳：把节奏偏好调整为更轻量、每次 30 分钟推进',
    '采纳：把阻力因素补充为「工作日连续时间不足」',
    '采纳：把计划影响说明补充为「后续计划优先拆成 30 分钟内的小步」',
  ];
  const conversation = resolveConversationState({
    profile: seedState.profile,
    goals: seedState.goals,
    plan: seedState.plan,
    settings: seedState.settings,
    conversation: {
      ...seedState.conversation,
      suggestions,
      actionPreviews: [],
    },
  });

  const timeBudgetPreview = conversation.actionPreviews.find((preview) => preview.sourceSuggestion === suggestions[0]);
  const pacePreview = conversation.actionPreviews.find((preview) => preview.sourceSuggestion === suggestions[1]);
  const blockerPreview = conversation.actionPreviews.find((preview) => preview.sourceSuggestion === suggestions[2]);
  const planImpactPreview = conversation.actionPreviews.find((preview) => preview.sourceSuggestion === suggestions[3]);

  assert.equal(timeBudgetPreview?.execution?.type, 'profile_update');
  assert.equal(timeBudgetPreview?.changes.some((change) => change.field === 'profile.timeBudget' && change.after === '工作日 30 分钟，周末 2 小时'), true);

  assert.equal(pacePreview?.execution?.type, 'profile_update');
  assert.equal(pacePreview?.changes.some((change) => change.field === 'profile.pacePreference' && change.after === '更轻量、每次 30 分钟推进'), true);

  assert.equal(blockerPreview?.execution?.type, 'profile_update');
  assert.equal(blockerPreview?.changes.some((change) => change.field === 'profile.blockers' && change.after === '工作日连续时间不足'), true);

  assert.equal(planImpactPreview?.execution?.type, 'profile_update');
  assert.equal(planImpactPreview?.changes.some((change) => change.field === 'profile.planImpact' && change.after === '后续计划优先拆成 30 分钟内的小步'), true);
});
