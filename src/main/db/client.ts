import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  aiRequestLogs,
  appSettings,
  appSnapshots,
  learningGoals,
  learningPlanDrafts,
  learningPlans,
  learningPlanSnapshots,
  modelRouting,
  reflectionEntries,
  planSnapshotStages,
  planSnapshotTasks,
  planStages,
  planTasks,
  providerConfigs,
  providerSecrets,
  userProfiles,
} from './schema.js';

export type LearningCompanionDatabase = BetterSQLite3Database<{
  appSnapshots: typeof appSnapshots;
  userProfiles: typeof userProfiles;
  learningGoals: typeof learningGoals;
  learningPlans: typeof learningPlans;
  learningPlanDrafts: typeof learningPlanDrafts;
  learningPlanSnapshots: typeof learningPlanSnapshots;
  planStages: typeof planStages;
  planTasks: typeof planTasks;
  planSnapshotStages: typeof planSnapshotStages;
  planSnapshotTasks: typeof planSnapshotTasks;
  reflectionEntries: typeof reflectionEntries;
  appSettings: typeof appSettings;
  providerConfigs: typeof providerConfigs;
  modelRouting: typeof modelRouting;
  providerSecrets: typeof providerSecrets;
  aiRequestLogs: typeof aiRequestLogs;
}>;

export type DatabaseContext = {
  sqlite: Database.Database;
  db: LearningCompanionDatabase;
};

export function createDatabase(dbFilePath: string): DatabaseContext {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

  const sqlite = new Database(dbFilePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      identity TEXT NOT NULL,
      time_budget TEXT NOT NULL,
      pace_preference TEXT NOT NULL,
      strengths_json TEXT NOT NULL,
      blockers_json TEXT NOT NULL,
      best_study_window TEXT NOT NULL,
      plan_impact_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_goals (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      motivation TEXT NOT NULL,
      baseline TEXT NOT NULL,
      cycle TEXT NOT NULL,
      success_metric TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_plans (
      id TEXT PRIMARY KEY NOT NULL,
      active_goal_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_plan_drafts (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      basis_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plan_stages (
      id TEXT PRIMARY KEY NOT NULL,
      draft_id TEXT NOT NULL,
      title TEXT NOT NULL,
      outcome TEXT NOT NULL,
      progress TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(draft_id) REFERENCES learning_plan_drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plan_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      draft_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL,
      status_note TEXT NOT NULL DEFAULT '',
      status_updated_at INTEGER,
      sort_order INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(draft_id) REFERENCES learning_plan_drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS learning_plan_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      draft_id TEXT NOT NULL,
      goal_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      basis_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plan_snapshot_stages (
      id TEXT PRIMARY KEY NOT NULL,
      snapshot_id TEXT NOT NULL,
      title TEXT NOT NULL,
      outcome TEXT NOT NULL,
      progress TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY(snapshot_id) REFERENCES learning_plan_snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plan_snapshot_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      snapshot_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY(snapshot_id) REFERENCES learning_plan_snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reflection_entries (
      period TEXT PRIMARY KEY NOT NULL,
      obstacle TEXT NOT NULL,
      difficulty_fit TEXT NOT NULL,
      time_fit TEXT NOT NULL,
      mood_score INTEGER NOT NULL,
      confidence_score INTEGER NOT NULL,
      accomplishment_score INTEGER NOT NULL,
      insight TEXT NOT NULL,
      follow_up_actions_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY NOT NULL,
      theme TEXT NOT NULL,
      start_page TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_configs (
      provider_id TEXT PRIMARY KEY NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      model TEXT NOT NULL,
      auth_mode TEXT NOT NULL,
      capability_tags_json TEXT NOT NULL,
      health_status TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS model_routing (
      route_key TEXT PRIMARY KEY NOT NULL,
      provider_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_secrets (
      provider_id TEXT PRIMARY KEY NOT NULL,
      secret TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id TEXT PRIMARY KEY NOT NULL,
      capability TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_label TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER NOT NULL,
      error_message TEXT
    );
  `);

  const learningPlansColumns = sqlite.prepare('PRAGMA table_info(learning_plans)').all() as Array<{ name: string }>;
  if (learningPlansColumns.some((column) => column.name === 'summary')) {
    sqlite.exec(`
      DROP TABLE IF EXISTS plan_tasks;
      DROP TABLE IF EXISTS plan_stages;
      DROP TABLE IF EXISTS learning_plan_drafts;
      DROP TABLE IF EXISTS learning_plans;

      CREATE TABLE learning_plans (
        id TEXT PRIMARY KEY NOT NULL,
        active_goal_id TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE learning_plan_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        goal_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        basis_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE plan_stages (
        id TEXT PRIMARY KEY NOT NULL,
        draft_id TEXT NOT NULL,
        title TEXT NOT NULL,
        outcome TEXT NOT NULL,
        progress TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(draft_id) REFERENCES learning_plan_drafts(id) ON DELETE CASCADE
      );

      CREATE TABLE plan_tasks (
        id TEXT PRIMARY KEY NOT NULL,
        draft_id TEXT NOT NULL,
        title TEXT NOT NULL,
        duration TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT NOT NULL,
        status_note TEXT NOT NULL DEFAULT '',
        status_updated_at INTEGER,
        sort_order INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(draft_id) REFERENCES learning_plan_drafts(id) ON DELETE CASCADE
      );
    `);
  }

  const planTasksColumns = sqlite.prepare('PRAGMA table_info(plan_tasks)').all() as Array<{ name: string }>;
  if (!planTasksColumns.some((column) => column.name === 'status_note')) {
    sqlite.exec('ALTER TABLE plan_tasks ADD COLUMN status_note TEXT NOT NULL DEFAULT \'\';');
  }

  if (!planTasksColumns.some((column) => column.name === 'status_updated_at')) {
    sqlite.exec('ALTER TABLE plan_tasks ADD COLUMN status_updated_at INTEGER;');
  }

  return {
    sqlite,
    db: drizzle(sqlite, {
      schema: {
        appSnapshots,
        userProfiles,
        learningGoals,
        learningPlans,
        learningPlanDrafts,
        learningPlanSnapshots,
        planStages,
        planTasks,
        planSnapshotStages,
        planSnapshotTasks,
        reflectionEntries,
        appSettings,
        providerConfigs,
        modelRouting,
        providerSecrets,
        aiRequestLogs,
      },
    }),
  };
}
