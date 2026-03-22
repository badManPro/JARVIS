import crypto from 'node:crypto';
import { desc } from 'drizzle-orm';
import type { ModelCapability, ProviderId } from '../../shared/app-state.js';
import type { AiCapabilityObservabilitySummary, AiObservabilitySnapshot, AiRequestLogEntry, AiRequestLogStatus } from '../../shared/ai-service.js';
import type { LearningCompanionDatabase } from '../db/client.js';
import { aiRequestLogs } from '../db/schema.js';

const observableCapabilities: ModelCapability[] = [
  'profile_extraction',
  'plan_generation',
  'plan_adjustment',
  'reflection_summary',
  'chat_general',
];

type RecordRequestLogInput = {
  capability: ModelCapability;
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  status: AiRequestLogStatus;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  errorMessage?: string;
};

function toRequestLogEntry(row: typeof aiRequestLogs.$inferSelect): AiRequestLogEntry {
  return {
    id: row.id,
    capability: row.capability as ModelCapability,
    providerId: row.providerId as ProviderId,
    providerLabel: row.providerLabel,
    model: row.model,
    status: row.status as AiRequestLogStatus,
    durationMs: row.durationMs,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt.toISOString(),
    errorMessage: row.errorMessage ?? undefined,
  };
}

function createEmptyCapabilitySummary(capability: ModelCapability): AiCapabilityObservabilitySummary {
  return {
    capability,
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
  };
}

export class AiRequestLogRepository {
  constructor(private readonly db: LearningCompanionDatabase) {}

  record(input: RecordRequestLogInput) {
    this.db
      .insert(aiRequestLogs)
      .values({
        id: `ai-log-${crypto.randomUUID()}`,
        capability: input.capability,
        providerId: input.providerId,
        providerLabel: input.providerLabel,
        model: input.model,
        status: input.status,
        durationMs: Math.max(0, Math.round(input.durationMs)),
        startedAt: new Date(input.startedAt),
        finishedAt: new Date(input.finishedAt),
        errorMessage: input.errorMessage ?? null,
      })
      .run();
  }

  getSnapshot(recentLimit = 10): AiObservabilitySnapshot {
    const rows = this.db
      .select()
      .from(aiRequestLogs)
      .orderBy(desc(aiRequestLogs.finishedAt))
      .all();

    const recentRequests = rows.slice(0, recentLimit).map(toRequestLogEntry);
    const capabilitySummaries = new Map(
      observableCapabilities.map((capability) => [capability, createEmptyCapabilitySummary(capability)]),
    );

    rows.forEach((row) => {
      const summary = capabilitySummaries.get(row.capability as ModelCapability);
      if (!summary) {
        return;
      }

      if (!summary.totalRequests) {
        summary.lastStatus = row.status as AiRequestLogStatus;
        summary.lastRequestedAt = row.finishedAt.toISOString();
        summary.lastDurationMs = row.durationMs;
        summary.lastErrorMessage = row.errorMessage ?? undefined;
      }

      summary.totalRequests += 1;
      if (row.status === 'success') {
        summary.successCount += 1;
      } else {
        summary.failureCount += 1;
      }
    });

    return {
      totalRequests: rows.length,
      successCount: rows.filter((row) => row.status === 'success').length,
      failureCount: rows.filter((row) => row.status === 'error').length,
      lastRequestedAt: rows[0]?.finishedAt.toISOString(),
      capabilitySummaries: observableCapabilities.map((capability) => capabilitySummaries.get(capability) ?? createEmptyCapabilitySummary(capability)),
      recentRequests,
    };
  }
}
