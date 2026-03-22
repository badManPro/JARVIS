import { eq } from 'drizzle-orm';
import type { AppState, ModelCapability, ProviderConfig, ProviderId } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import { appSettings, modelRouting, providerConfigs } from '../db/schema.js';
import type { LearningCompanionDatabase } from '../db/client.js';

const SETTINGS_ID = 'default';
const routeKeys = Object.keys(seedState.settings.routing) as Array<keyof AppState['settings']['routing']>;

function parseJsonArray<T>(value: string): T[] {
  return JSON.parse(value) as T[];
}

function toProviderConfig(row: typeof providerConfigs.$inferSelect): ProviderConfig {
  return {
    id: row.providerId as ProviderId,
    label: row.label,
    enabled: row.enabled,
    endpoint: row.endpoint,
    model: row.model,
    authMode: row.authMode as ProviderConfig['authMode'],
    capabilityTags: parseJsonArray<ModelCapability>(row.capabilityTagsJson),
    healthStatus: row.healthStatus as ProviderConfig['healthStatus'],
    keyPreview: '未配置',
    hasSecret: false,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class SettingsRepository {
  constructor(private readonly db: LearningCompanionDatabase) {}

  loadSettings(): AppState['settings'] | null {
    const settingsRow = this.db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)).get();
    const providerRows = this.db.select().from(providerConfigs).all();
    const routingRows = this.db.select().from(modelRouting).all();

    if (!settingsRow && !providerRows.length && !routingRows.length) {
      return null;
    }

    const providersById = new Map(providerRows.map((row) => [row.providerId as ProviderId, toProviderConfig(row)]));
    const seedProviderIds = seedState.settings.providers.map((provider) => provider.id);
    const extraProviderIds = providerRows
      .map((row) => row.providerId as ProviderId)
      .filter((providerId) => !seedProviderIds.includes(providerId));
    const orderedProviderIds = [...seedProviderIds, ...extraProviderIds];

    const providers = orderedProviderIds.map((providerId) => {
      const structuredProvider = providersById.get(providerId);
      if (structuredProvider) {
        return structuredProvider;
      }

      const fallback = seedState.settings.providers.find((provider) => provider.id === providerId);
      if (!fallback) {
        return {
          id: providerId,
          label: providerId,
          enabled: false,
          endpoint: '',
          model: '',
          authMode: 'none',
          capabilityTags: [],
          healthStatus: 'unknown',
          keyPreview: '未配置',
          hasSecret: false,
        } satisfies ProviderConfig;
      }

      return {
        ...fallback,
        keyPreview: '未配置',
        hasSecret: false,
      };
    });

    const routing = {
      ...seedState.settings.routing,
    };

    routingRows.forEach((row) => {
      if (routeKeys.includes(row.routeKey as keyof AppState['settings']['routing'])) {
        routing[row.routeKey as keyof AppState['settings']['routing']] = row.providerId as ProviderId;
      }
    });

    return {
      theme: settingsRow?.theme ?? seedState.settings.theme,
      startPage: settingsRow?.startPage ?? seedState.settings.startPage,
      providers,
      routing,
    };
  }

  saveSettings(settings: AppState['settings']) {
    const now = new Date();

    this.db
      .insert(appSettings)
      .values({
        id: SETTINGS_ID,
        theme: settings.theme,
        startPage: settings.startPage,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: {
          theme: settings.theme,
          startPage: settings.startPage,
          updatedAt: now,
        },
      })
      .run();

    this.db.delete(providerConfigs).run();
    if (settings.providers.length) {
      this.db
        .insert(providerConfigs)
        .values(
          settings.providers.map((provider) => ({
            providerId: provider.id,
            label: provider.label,
            enabled: provider.enabled,
            endpoint: provider.endpoint,
            model: provider.model,
            authMode: provider.authMode,
            capabilityTagsJson: JSON.stringify(provider.capabilityTags),
            healthStatus: provider.healthStatus,
            updatedAt: now,
          })),
        )
        .run();
    }

    this.db.delete(modelRouting).run();
    this.db
      .insert(modelRouting)
      .values(
        routeKeys.map((routeKey) => ({
          routeKey,
          providerId: settings.routing[routeKey],
          updatedAt: now,
        })),
      )
      .run();
  }
}
