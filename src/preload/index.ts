import { contextBridge, ipcRenderer } from 'electron';
import type { LearningCompanionBridge } from '../shared/bridge.js';

const learningCompanion: LearningCompanionBridge = {
  platform: process.platform,
  version: '0.1.0',
  storage: {
    loadAppState: () => ipcRenderer.invoke('storage:load-app-state'),
    saveAppState: (state) => ipcRenderer.invoke('storage:save-app-state', state),
    loadUserProfile: () => ipcRenderer.invoke('storage:load-user-profile'),
    saveUserProfile: (profile) => ipcRenderer.invoke('storage:save-user-profile', profile),
    upsertLearningGoal: (goal) => ipcRenderer.invoke('storage:upsert-learning-goal', goal),
    removeLearningGoal: (goalId) => ipcRenderer.invoke('storage:remove-learning-goal', goalId),
    setActiveGoal: (goalId) => ipcRenderer.invoke('storage:set-active-goal', goalId),
    saveLearningPlanDraft: (draft) => ipcRenderer.invoke('storage:save-learning-plan-draft', draft),
    regenerateLearningPlanDraft: (payload) => ipcRenderer.invoke('storage:regenerate-learning-plan-draft', payload),
    applyAcceptedConversationActionPreviews: () => ipcRenderer.invoke('storage:apply-accepted-conversation-action-previews'),
    listProviderConfigs: () => ipcRenderer.invoke('storage:list-provider-configs'),
    upsertProviderConfig: (payload) => ipcRenderer.invoke('storage:upsert-provider-config', payload),
    saveProviderSecret: (payload) => ipcRenderer.invoke('storage:save-provider-secret', payload),
    clearProviderSecret: (providerId) => ipcRenderer.invoke('storage:clear-provider-secret', providerId),
    getAiRuntimeSummary: () => ipcRenderer.invoke('storage:get-ai-runtime-summary'),
  },
};

contextBridge.exposeInMainWorld('learningCompanion', learningCompanion);

declare global {
  interface Window {
    learningCompanion: LearningCompanionBridge;
  }
}
