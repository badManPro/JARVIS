/// <reference types="vite/client" />

import type { LearningCompanionBridge } from '@shared/bridge';

declare global {
  interface Window {
    learningCompanion: LearningCompanionBridge;
  }
}

export {};
