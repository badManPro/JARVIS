import { desc, eq } from 'drizzle-orm';
import type { ProviderId } from '../../shared/app-state.js';
import { providerSecrets } from '../db/schema.js';
import type { LearningCompanionDatabase } from '../db/client.js';

export class ProviderSecretRepository {
  constructor(private readonly db: LearningCompanionDatabase) {}

  get(providerId: ProviderId) {
    return this.db.select().from(providerSecrets).where(eq(providerSecrets.providerId, providerId)).get() ?? null;
  }

  list() {
    return this.db.select().from(providerSecrets).orderBy(desc(providerSecrets.updatedAt)).all();
  }

  upsert(providerId: ProviderId, secret: string | null) {
    const now = new Date();
    this.db
      .insert(providerSecrets)
      .values({ providerId, secret, updatedAt: now })
      .onConflictDoUpdate({
        target: providerSecrets.providerId,
        set: { secret, updatedAt: now },
      })
      .run();
  }

  clear(providerId: ProviderId) {
    this.db.delete(providerSecrets).where(eq(providerSecrets.providerId, providerId)).run();
  }
}
