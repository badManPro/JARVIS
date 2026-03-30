import Database from 'better-sqlite3';

type Migration = {
  version: number;
  name: string;
  up: (sqlite: Database.Database) => void;
};

function getUserVersion(sqlite: Database.Database) {
  return Number(sqlite.pragma('user_version', { simple: true }));
}

function getTableColumns(sqlite: Database.Database, tableName: string) {
  return sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
}

function createSchemaV1(sqlite: Database.Database) {
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
}

function recreatePlanTablesV1(sqlite: Database.Database) {
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
      sort_order INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(draft_id) REFERENCES learning_plan_drafts(id) ON DELETE CASCADE
    );
  `);
}

function normalizeLegacyPlanSchema(sqlite: Database.Database) {
  const learningPlansColumns = getTableColumns(sqlite, 'learning_plans');
  if (learningPlansColumns.some((column) => column.name === 'summary')) {
    recreatePlanTablesV1(sqlite);
  }
}

function addPlanTaskStatusColumns(sqlite: Database.Database) {
  const planTasksColumns = getTableColumns(sqlite, 'plan_tasks');

  if (!planTasksColumns.some((column) => column.name === 'status_note')) {
    sqlite.exec('ALTER TABLE plan_tasks ADD COLUMN status_note TEXT NOT NULL DEFAULT \'\';');
  }

  if (!planTasksColumns.some((column) => column.name === 'status_updated_at')) {
    sqlite.exec('ALTER TABLE plan_tasks ADD COLUMN status_updated_at INTEGER;');
  }
}

function addEnhancedUserProfileColumns(sqlite: Database.Database) {
  const userProfileColumns = getTableColumns(sqlite, 'user_profiles');

  if (!userProfileColumns.some((column) => column.name === 'age_bracket')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN age_bracket TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'gender')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN gender TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'personality_traits_json')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN personality_traits_json TEXT NOT NULL DEFAULT \'[]\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'mbti')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN mbti TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'motivation_style')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN motivation_style TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'stress_response')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN stress_response TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'feedback_preference')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN feedback_preference TEXT NOT NULL DEFAULT \'\';');
  }
}

function addPlanningConfirmationProfileColumns(sqlite: Database.Database) {
  const userProfileColumns = getTableColumns(sqlite, 'user_profiles');

  if (!userProfileColumns.some((column) => column.name === 'planning_style')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN planning_style TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'decision_support_level')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN decision_support_level TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'feedback_tone')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN feedback_tone TEXT NOT NULL DEFAULT \'\';');
  }

  if (!userProfileColumns.some((column) => column.name === 'autonomy_preference')) {
    sqlite.exec('ALTER TABLE user_profiles ADD COLUMN autonomy_preference TEXT NOT NULL DEFAULT \'\';');
  }
}

function addPlanDraftPlanningColumns(sqlite: Database.Database) {
  const learningPlanDraftColumns = getTableColumns(sqlite, 'learning_plan_drafts');
  if (!learningPlanDraftColumns.some((column) => column.name === 'milestones_json')) {
    sqlite.exec('ALTER TABLE learning_plan_drafts ADD COLUMN milestones_json TEXT NOT NULL DEFAULT \'[]\';');
  }

  if (!learningPlanDraftColumns.some((column) => column.name === 'today_plan_json')) {
    sqlite.exec('ALTER TABLE learning_plan_drafts ADD COLUMN today_plan_json TEXT NOT NULL DEFAULT \'null\';');
  }

  if (!learningPlanDraftColumns.some((column) => column.name === 'today_context_json')) {
    sqlite.exec('ALTER TABLE learning_plan_drafts ADD COLUMN today_context_json TEXT NOT NULL DEFAULT \'{"availableDuration":"","studyWindow":"","note":"","updatedAt":""}\';');
  }

  const learningPlanSnapshotColumns = getTableColumns(sqlite, 'learning_plan_snapshots');
  if (!learningPlanSnapshotColumns.some((column) => column.name === 'milestones_json')) {
    sqlite.exec('ALTER TABLE learning_plan_snapshots ADD COLUMN milestones_json TEXT NOT NULL DEFAULT \'[]\';');
  }
}

function addGoalSchedulingColumns(sqlite: Database.Database) {
  const learningGoalColumns = getTableColumns(sqlite, 'learning_goals');

  if (!learningGoalColumns.some((column) => column.name === 'role')) {
    sqlite.exec('ALTER TABLE learning_goals ADD COLUMN role TEXT NOT NULL DEFAULT \'secondary\';');
  }

  if (!learningGoalColumns.some((column) => column.name === 'schedule_weight')) {
    sqlite.exec('ALTER TABLE learning_goals ADD COLUMN schedule_weight INTEGER NOT NULL DEFAULT 30;');
  }
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'bootstrap structured storage schema',
    up: (sqlite) => {
      createSchemaV1(sqlite);
      normalizeLegacyPlanSchema(sqlite);
    },
  },
  {
    version: 2,
    name: 'add task execution audit columns',
    up: (sqlite) => {
      addPlanTaskStatusColumns(sqlite);
    },
  },
  {
    version: 3,
    name: 'add enhanced learner persona columns',
    up: (sqlite) => {
      addEnhancedUserProfileColumns(sqlite);
    },
  },
  {
    version: 4,
    name: 'add rough-plan milestones and daily planning columns',
    up: (sqlite) => {
      addPlanDraftPlanningColumns(sqlite);
    },
  },
  {
    version: 5,
    name: 'add planning confirmation profile columns',
    up: (sqlite) => {
      addPlanningConfirmationProfileColumns(sqlite);
    },
  },
  {
    version: 6,
    name: 'add primary secondary goal scheduling columns',
    up: (sqlite) => {
      addGoalSchedulingColumns(sqlite);
    },
  },
];

export const LATEST_DATABASE_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

export function applyDatabaseMigrations(sqlite: Database.Database) {
  const currentVersion = getUserVersion(sqlite);
  if (currentVersion > LATEST_DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `数据库 schema 版本 ${currentVersion} 高于当前应用支持的 ${LATEST_DATABASE_SCHEMA_VERSION}。`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    sqlite.transaction(() => {
      migration.up(sqlite);
      sqlite.pragma(`user_version = ${migration.version}`);
    })();
  }
}
