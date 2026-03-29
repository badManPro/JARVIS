import test from 'node:test';
import assert from 'node:assert/strict';
import type { LearningCompanionBridge } from './bridge.js';
import { getCachedStorageBridge, resetCachedStorageBridgeForTests } from './storage-bridge-cache.js';

function createStorageBridge(): LearningCompanionBridge['storage'] {
  return {
    loadAppState: async () => { throw new Error('not implemented'); },
    saveAppState: async () => { throw new Error('not implemented'); },
    loadUserProfile: async () => { throw new Error('not implemented'); },
    saveUserProfile: async () => { throw new Error('not implemented'); },
    completeInitialOnboarding: async () => { throw new Error('not implemented'); },
    upsertLearningGoal: async () => { throw new Error('not implemented'); },
    removeLearningGoal: async () => { throw new Error('not implemented'); },
    setActiveGoal: async () => { throw new Error('not implemented'); },
    saveLearningPlanDraft: async () => { throw new Error('not implemented'); },
    updatePlanTaskStatus: async () => { throw new Error('not implemented'); },
    saveReflectionEntry: async () => { throw new Error('not implemented'); },
    regenerateLearningPlanDraft: async () => { throw new Error('not implemented'); },
    runProfileExtraction: async () => { throw new Error('not implemented'); },
    generatePlanAdjustmentSuggestions: async () => { throw new Error('not implemented'); },
    applyAcceptedConversationActionPreviews: async () => { throw new Error('not implemented'); },
    listProviderConfigs: async () => { throw new Error('not implemented'); },
    upsertProviderConfig: async () => { throw new Error('not implemented'); },
    saveProviderSecret: async () => { throw new Error('not implemented'); },
    clearProviderSecret: async () => { throw new Error('not implemented'); },
    runProviderHealthCheck: async () => { throw new Error('not implemented'); },
    getAiRuntimeSummary: async () => { throw new Error('not implemented'); },
    getAiObservability: async () => { throw new Error('not implemented'); },
    getCodexAuthStatus: async () => { throw new Error('not implemented'); },
    startCodexLogin: async () => { throw new Error('not implemented'); },
    startCodexDeviceLogin: async () => { throw new Error('not implemented'); },
    logoutCodex: async () => { throw new Error('not implemented'); },
  };
}

test('returns null when the bridge was never available', () => {
  resetCachedStorageBridgeForTests();

  const bridge = getCachedStorageBridge({});

  assert.equal(bridge, null);
});

test('reuses the last known bridge when the live window bridge temporarily disappears', () => {
  resetCachedStorageBridgeForTests();
  const liveBridge = createStorageBridge();

  const firstBridge = getCachedStorageBridge({
    learningCompanion: {
      platform: 'darwin',
      version: '0.1.0',
      storage: liveBridge,
    },
  });
  const secondBridge = getCachedStorageBridge({});

  assert.equal(firstBridge, liveBridge);
  assert.equal(secondBridge, liveBridge);
});
