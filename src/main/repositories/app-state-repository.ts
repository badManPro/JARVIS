import { eq } from 'drizzle-orm';
import type { AppState } from '../../shared/app-state.js';
import { appSnapshots } from '../db/schema.js';
import type { LearningCompanionDatabase } from '../db/client.js';

const SNAPSHOT_ID = 'default';
const SNAPSHOT_VERSION = 2;

type ReducedAppSnapshotPayload = {
  version: typeof SNAPSHOT_VERSION;
  conversation: AppState['conversation'];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLegacyAppState(value: unknown): value is AppState {
  return isRecord(value)
    && 'profile' in value
    && 'dashboard' in value
    && 'goals' in value
    && 'plan' in value
    && 'conversation' in value
    && 'reflection' in value
    && 'settings' in value;
}

function isReducedAppSnapshotPayload(value: unknown): value is ReducedAppSnapshotPayload {
  return isRecord(value)
    && value.version === SNAPSHOT_VERSION
    && 'conversation' in value;
}

export class AppStateRepository {
  constructor(private readonly db: LearningCompanionDatabase) {}

  transaction<T>(operation: () => T) {
    return this.db.transaction(() => operation());
  }

  private loadPayload() {
    const row = this.db.select().from(appSnapshots).where(eq(appSnapshots.id, SNAPSHOT_ID)).get();
    if (!row) return null;
    return JSON.parse(row.payload) as unknown;
  }

  loadLegacyState() {
    const payload = this.loadPayload();
    return isLegacyAppState(payload) ? payload : null;
  }

  loadConversationState() {
    const payload = this.loadPayload();
    if (isLegacyAppState(payload)) {
      return payload.conversation;
    }

    if (isReducedAppSnapshotPayload(payload)) {
      return payload.conversation;
    }

    return null;
  }

  save(state: AppState) {
    this.saveRaw({
      version: SNAPSHOT_VERSION,
      conversation: state.conversation,
    } satisfies ReducedAppSnapshotPayload);
    return state;
  }

  saveRaw(payload: unknown) {
    const now = new Date();
    this.db
      .insert(appSnapshots)
      .values({
        id: SNAPSHOT_ID,
        payload: JSON.stringify(payload),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: appSnapshots.id,
        set: {
          payload: JSON.stringify(payload),
          updatedAt: now,
        },
      })
      .run();

    return payload;
  }
}
