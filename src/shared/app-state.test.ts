import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAcceptedConversationActionPreviews,
  resolveConversationState,
  saveReflectionEntry,
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
  assert.match(skippedState.dashboard.priorityAction.title, /继续推进：用 requests 或 fetch 封装一次模型调用/);
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
  assert.match(completedState.dashboard.todayFocus, /规划本地优先 MVP 的最小功能清单|查看复盘/);
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
  assert.equal(seedState.dashboard.priorityAction.title, '继续推进：用 requests 或 fetch 封装一次模型调用');
  assert.equal(seedState.dashboard.priorityAction.duration, '45 分钟');
  assert.match(seedState.dashboard.priorityAction.reason, /进行中|当前阶段/);
  assert.ok(seedState.dashboard.riskSignals.length >= 1);
  assert.equal(seedState.dashboard.riskSignals[0]?.level, 'medium');
  assert.match(seedState.dashboard.riskSignals[0]?.detail ?? '', /临时事务打断|可交付物/);
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
