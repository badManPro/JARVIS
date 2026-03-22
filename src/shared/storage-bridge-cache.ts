import type { LearningCompanionBridge } from './bridge.js';

type WindowLike = {
  learningCompanion?: LearningCompanionBridge;
};

let cachedStorageBridge: LearningCompanionBridge['storage'] | null = null;

export function getCachedStorageBridge(windowLike?: WindowLike | null) {
  const liveBridge = windowLike?.learningCompanion?.storage ?? null;

  if (liveBridge) {
    cachedStorageBridge = liveBridge;
    return liveBridge;
  }

  return cachedStorageBridge;
}

export function resetCachedStorageBridgeForTests() {
  cachedStorageBridge = null;
}
