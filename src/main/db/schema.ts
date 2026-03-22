import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appSnapshots = sqliteTable('app_snapshots', {
  id: text('id').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  identity: text('identity').notNull(),
  timeBudget: text('time_budget').notNull(),
  pacePreference: text('pace_preference').notNull(),
  strengthsJson: text('strengths_json').notNull(),
  blockersJson: text('blockers_json').notNull(),
  bestStudyWindow: text('best_study_window').notNull(),
  planImpactJson: text('plan_impact_json').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const learningGoals = sqliteTable('learning_goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  motivation: text('motivation').notNull(),
  baseline: text('baseline').notNull(),
  cycle: text('cycle').notNull(),
  successMetric: text('success_metric').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const learningPlans = sqliteTable('learning_plans', {
  id: text('id').primaryKey(),
  activeGoalId: text('active_goal_id').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const learningPlanDrafts = sqliteTable('learning_plan_drafts', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  basisJson: text('basis_json').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const planStages = sqliteTable('plan_stages', {
  id: text('id').primaryKey(),
  draftId: text('draft_id').notNull(),
  title: text('title').notNull(),
  outcome: text('outcome').notNull(),
  progress: text('progress').notNull(),
  sortOrder: integer('sort_order').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const planTasks = sqliteTable('plan_tasks', {
  id: text('id').primaryKey(),
  draftId: text('draft_id').notNull(),
  title: text('title').notNull(),
  duration: text('duration').notNull(),
  status: text('status').notNull(),
  note: text('note').notNull(),
  statusNote: text('status_note').notNull(),
  statusUpdatedAt: integer('status_updated_at', { mode: 'timestamp_ms' }),
  sortOrder: integer('sort_order').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const learningPlanSnapshots = sqliteTable('learning_plan_snapshots', {
  id: text('id').primaryKey(),
  draftId: text('draft_id').notNull(),
  goalId: text('goal_id').notNull(),
  version: integer('version').notNull(),
  source: text('source').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  basisJson: text('basis_json').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const planSnapshotStages = sqliteTable('plan_snapshot_stages', {
  id: text('id').primaryKey(),
  snapshotId: text('snapshot_id').notNull(),
  title: text('title').notNull(),
  outcome: text('outcome').notNull(),
  progress: text('progress').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const planSnapshotTasks = sqliteTable('plan_snapshot_tasks', {
  id: text('id').primaryKey(),
  snapshotId: text('snapshot_id').notNull(),
  title: text('title').notNull(),
  duration: text('duration').notNull(),
  status: text('status').notNull(),
  note: text('note').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const reflectionEntries = sqliteTable('reflection_entries', {
  period: text('period').primaryKey(),
  obstacle: text('obstacle').notNull(),
  difficultyFit: text('difficulty_fit').notNull(),
  timeFit: text('time_fit').notNull(),
  moodScore: integer('mood_score').notNull(),
  confidenceScore: integer('confidence_score').notNull(),
  accomplishmentScore: integer('accomplishment_score').notNull(),
  insight: text('insight').notNull(),
  followUpActionsJson: text('follow_up_actions_json').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  theme: text('theme').notNull(),
  startPage: text('start_page').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const providerConfigs = sqliteTable('provider_configs', {
  providerId: text('provider_id').primaryKey(),
  label: text('label').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  endpoint: text('endpoint').notNull(),
  model: text('model').notNull(),
  authMode: text('auth_mode').notNull(),
  capabilityTagsJson: text('capability_tags_json').notNull(),
  healthStatus: text('health_status').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const modelRouting = sqliteTable('model_routing', {
  routeKey: text('route_key').primaryKey(),
  providerId: text('provider_id').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const providerSecrets = sqliteTable('provider_secrets', {
  providerId: text('provider_id').primaryKey(),
  secret: text('secret'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const aiRequestLogs = sqliteTable('ai_request_logs', {
  id: text('id').primaryKey(),
  capability: text('capability').notNull(),
  providerId: text('provider_id').notNull(),
  providerLabel: text('provider_label').notNull(),
  model: text('model').notNull(),
  status: text('status').notNull(),
  durationMs: integer('duration_ms').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp_ms' }).notNull(),
  errorMessage: text('error_message'),
});
