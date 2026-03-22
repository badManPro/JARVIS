import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { applyDatabaseMigrations } from './migrations.js';
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
  applyDatabaseMigrations(sqlite);

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
