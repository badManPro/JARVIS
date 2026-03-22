import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import type { AiRuntimeSummaryItem } from '../../shared/ai-service.js';
import { createDatabase } from '../db/client.js';
import { AppStateRepository } from '../repositories/app-state-repository.js';
import { EntitiesRepository } from '../repositories/entities-repository.js';
import { ProviderSecretRepository } from '../repositories/provider-secret-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import { AppStorageService } from './app-storage-service.js';

function cloneState(overrides?: Partial<AppState>): AppState {
  return {
    ...JSON.parse(JSON.stringify(seedState)) as AppState,
    ...overrides,
  };
}

function createRuntimeSummary(settings: AppState['settings']): AiRuntimeSummaryItem[] {
  const routes: Array<AiRuntimeSummaryItem['capability']> = [
    'profile_extraction',
    'plan_generation',
    'plan_adjustment',
    'reflection_summary',
    'chat_general',
  ];

  const routeKeyByCapability = {
    profile_extraction: 'profileExtraction',
    plan_generation: 'planGeneration',
    plan_adjustment: 'planAdjustment',
    reflection_summary: 'reflectionSummary',
    chat_general: 'generalChat',
  } as const;

  return routes.map((capability) => {
    const routeKey = routeKeyByCapability[capability];
    const providerId = settings.routing[routeKey];
    const provider = settings.providers.find((item) => item.id === providerId);
    const ready = Boolean(
      provider
      && provider.enabled
      && provider.capabilityTags.includes(capability)
      && (provider.authMode === 'none' || provider.hasSecret),
    );

    return {
      capability,
      providerId,
      providerLabel: provider?.label ?? providerId,
      model: provider?.model ?? 'unknown',
      ready,
      blockedReason: ready
        ? undefined
        : (!provider
          ? '缺少 Provider 配置'
          : (!provider.enabled
            ? 'Provider 未启用'
            : (!provider.capabilityTags.includes(capability)
              ? 'Provider 未声明该 capability'
              : '缺少 Secret'))),
    } satisfies AiRuntimeSummaryItem;
  });
}

function createHarness(snapshotState?: AppState) {
  const { db } = createDatabase(':memory:');
  const appStateRepository = new AppStateRepository(db);
  const entitiesRepository = new EntitiesRepository(db);
  const providerSecretRepository = new ProviderSecretRepository(db);
  const settingsRepository = new SettingsRepository(db);

  if (snapshotState) {
    appStateRepository.save(snapshotState);
  }

  const service = new AppStorageService(
    appStateRepository,
    entitiesRepository,
    settingsRepository,
    providerSecretRepository,
    {
      getRuntimeSummary: (settings) => createRuntimeSummary(settings),
      execute: async () => {
        throw new Error('execute is not used in this test');
      },
    },
  );

  return {
    service,
    settingsRepository,
  };
}

test('initialize migrates snapshot settings into structured settings tables', () => {
  const snapshot = cloneState({
    settings: {
      ...seedState.settings,
      theme: '浅色主题',
      startPage: '计划页',
      providers: seedState.settings.providers.map((provider) => (
        provider.id === 'openai'
          ? { ...provider, label: 'OpenAI / GPT 备用', model: 'gpt-4.1', enabled: false }
          : provider
      )),
      routing: {
        ...seedState.settings.routing,
        planGeneration: 'glm',
      },
    },
  });
  const { service, settingsRepository } = createHarness(snapshot);

  service.initialize();

  const persistedSettings = settingsRepository.loadSettings();
  assert.ok(persistedSettings);
  assert.equal(persistedSettings.theme, '浅色主题');
  assert.equal(persistedSettings.startPage, '计划页');
  assert.equal(persistedSettings.routing.planGeneration, 'glm');
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'openai')?.label, 'OpenAI / GPT 备用');
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'openai')?.enabled, false);
});

test('saveAppState persists provider configs and routing into structured settings', () => {
  const { service, settingsRepository } = createHarness();
  service.initialize();

  const nextState = cloneState({
    settings: {
      ...seedState.settings,
      theme: '纸感主题',
      startPage: '设置页',
      providers: seedState.settings.providers.map((provider) => (
        provider.id === 'deepseek'
          ? { ...provider, enabled: true, model: 'deepseek-reasoner', healthStatus: 'ready' }
          : provider
      )),
      routing: {
        ...seedState.settings.routing,
        planGeneration: 'deepseek',
        reflectionSummary: 'openai',
      },
    },
  });

  service.saveAppState(nextState);

  const persistedSettings = settingsRepository.loadSettings();
  assert.ok(persistedSettings);
  assert.equal(persistedSettings.theme, '纸感主题');
  assert.equal(persistedSettings.startPage, '设置页');
  assert.equal(persistedSettings.routing.planGeneration, 'deepseek');
  assert.equal(persistedSettings.routing.reflectionSummary, 'openai');
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'deepseek')?.enabled, true);
  assert.equal(persistedSettings.providers.find((provider) => provider.id === 'deepseek')?.model, 'deepseek-reasoner');
});

test('getAiRuntimeSummary reflects structured route changes and secret readiness', () => {
  const { service } = createHarness();
  service.initialize();

  const initialSummary = service.getAiRuntimeSummary();
  const initialPlanGeneration = initialSummary.find((item) => item.capability === 'plan_generation');
  assert.ok(initialPlanGeneration);
  assert.equal(initialPlanGeneration.providerId, 'deepseek');
  assert.equal(initialPlanGeneration.ready, false);

  void service.upsertProviderConfig({
    config: {
      id: 'deepseek',
      label: 'DeepSeek',
      enabled: true,
      endpoint: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      authMode: 'apiKey',
      capabilityTags: ['plan_generation', 'plan_adjustment'],
      healthStatus: 'ready',
    },
    secret: 'sk-deepseek',
  });

  const readySummary = service.getAiRuntimeSummary();
  const readyPlanGeneration = readySummary.find((item) => item.capability === 'plan_generation');
  assert.ok(readyPlanGeneration);
  assert.equal(readyPlanGeneration.providerId, 'deepseek');
  assert.equal(readyPlanGeneration.ready, true);

  const currentState = service.loadAppState();
  service.saveAppState({
    ...currentState,
    settings: {
      ...currentState.settings,
      routing: {
        ...currentState.settings.routing,
        planGeneration: 'openai',
      },
    },
  });

  const reroutedSummary = service.getAiRuntimeSummary();
  const reroutedPlanGeneration = reroutedSummary.find((item) => item.capability === 'plan_generation');
  assert.ok(reroutedPlanGeneration);
  assert.equal(reroutedPlanGeneration.providerId, 'openai');
});
