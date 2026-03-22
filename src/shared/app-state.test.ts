import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAcceptedConversationActionPreviews,
  resolveConversationState,
  seedState,
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
