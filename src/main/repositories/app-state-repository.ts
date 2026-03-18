import { eq } from 'drizzle-orm';
import type { AppState } from '../../shared/app-state.js';
import { appSnapshots } from '../db/schema.js';
import type { LearningCompanionDatabase } from '../db/client.js';

const SNAPSHOT_ID = 'default';

export class AppStateRepository {
  constructor(private readonly db: LearningCompanionDatabase) {}

  load() {
    const row = this.db.select().from(appSnapshots).where(eq(appSnapshots.id, SNAPSHOT_ID)).get();
    if (!row) return null;
    return JSON.parse(row.payload) as AppState;
  }

  save(state: AppState) {
    const now = new Date();
    this.db
      .insert(appSnapshots)
      .values({
        id: SNAPSHOT_ID,
        payload: JSON.stringify(state),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: appSnapshots.id,
        set: {
          payload: JSON.stringify(state),
          updatedAt: now,
        },
      })
      .run();

    return state;
  }
}
