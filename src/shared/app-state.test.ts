import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAcceptedConversationActionPreviews,
  resolveConversationState,
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
});
