import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createDatabase } from './client.js';
import { LATEST_DATABASE_SCHEMA_VERSION } from './migrations.js';

function getSchemaVersion(sqlite: Database.Database) {
  const row = sqlite.pragma('user_version', { simple: true });
  return Number(row);
}

function createTempDbFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-db-'));
  return path.join(dir, 'learning-companion.sqlite');
}

test('createDatabase sets the latest schema version for a fresh database', () => {
  const { sqlite } = createDatabase(':memory:');

  assert.equal(getSchemaVersion(sqlite), LATEST_DATABASE_SCHEMA_VERSION);

  sqlite.close();
});

test('createDatabase upgrades a legacy database to the latest schema version', () => {
  const dbFilePath = createTempDbFile();
  const sqlite = new Database(dbFilePath);

  sqlite.exec(`
    CREATE TABLE app_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE learning_plans (
      id TEXT PRIMARY KEY NOT NULL,
      summary TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE plan_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      draft_id TEXT NOT NULL,
      title TEXT NOT NULL,
      duration TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  sqlite.close();

  const migrated = createDatabase(dbFilePath).sqlite;
  const planTaskColumns = migrated.prepare('PRAGMA table_info(plan_tasks)').all() as Array<{ name: string }>;
  const learningPlanDraftColumns = migrated.prepare('PRAGMA table_info(learning_plan_drafts)').all() as Array<{ name: string }>;
  const learningPlanColumns = migrated.prepare('PRAGMA table_info(learning_plans)').all() as Array<{ name: string }>;
  const learningGoalColumns = migrated.prepare('PRAGMA table_info(learning_goals)').all() as Array<{ name: string }>;
  const userProfileColumns = migrated.prepare('PRAGMA table_info(user_profiles)').all() as Array<{ name: string }>;

  assert.equal(getSchemaVersion(migrated), LATEST_DATABASE_SCHEMA_VERSION);
  assert.deepEqual(
    planTaskColumns.map((column) => column.name).sort(),
    [
      'draft_id',
      'duration',
      'id',
      'note',
      'sort_order',
      'status',
      'status_note',
      'status_updated_at',
      'title',
      'updated_at',
    ].sort(),
  );
  assert.deepEqual(
    learningPlanDraftColumns.map((column) => column.name).sort(),
    [
      'basis_json',
      'goal_id',
      'id',
      'milestones_json',
      'summary',
      'title',
      'today_context_json',
      'today_plan_json',
      'updated_at',
    ].sort(),
  );
  assert.deepEqual(
    learningPlanColumns.map((column) => column.name),
    ['id', 'active_goal_id', 'updated_at'],
  );
  assert.deepEqual(
    learningGoalColumns.map((column) => column.name).sort(),
    [
      'baseline',
      'cycle',
      'domain',
      'id',
      'motivation',
      'priority',
      'role',
      'schedule_weight',
      'status',
      'success_metric',
      'title',
      'updated_at',
    ].sort(),
  );
  assert.deepEqual(
    userProfileColumns.map((column) => column.name).sort(),
    [
      'age_bracket',
      'best_study_window',
      'blockers_json',
      'feedback_preference',
      'feedback_tone',
      'gender',
      'id',
      'identity',
      'mbti',
      'motivation_style',
      'name',
      'autonomy_preference',
      'decision_support_level',
      'pace_preference',
      'planning_style',
      'personality_traits_json',
      'plan_impact_json',
      'stress_response',
      'strengths_json',
      'time_budget',
      'updated_at',
    ].sort(),
  );

  migrated.close();
});
