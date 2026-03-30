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
    completeInitialOnboarding: (payload) => ipcRenderer.invoke('storage:complete-initial-onboarding', payload),
    upsertLearningGoal: (goal) => ipcRenderer.invoke('storage:upsert-learning-goal', goal),
    removeLearningGoal: (goalId) => ipcRenderer.invoke('storage:remove-learning-goal', goalId),
    setActiveGoal: (goalId) => ipcRenderer.invoke('storage:set-active-goal', goalId),
    saveLearningPlanDraft: (draft) => ipcRenderer.invoke('storage:save-learning-plan-draft', draft),
    updatePlanTaskStatus: (payload) => ipcRenderer.invoke('storage:update-plan-task-status', payload),
    updateTodayPlanStepStatus: (payload) => ipcRenderer.invoke('storage:update-today-plan-step-status', payload),
    saveReflectionEntry: (payload) => ipcRenderer.invoke('storage:save-reflection-entry', payload),
    saveTodayPlanningContext: (payload) => ipcRenderer.invoke('storage:save-today-planning-context', payload),
    generateTodayPlan: (payload) => ipcRenderer.invoke('storage:generate-today-plan', payload),
    regenerateLearningPlanDraft: (payload) => ipcRenderer.invoke('storage:regenerate-learning-plan-draft', payload),
    runProfileExtraction: () => ipcRenderer.invoke('storage:run-profile-extraction'),
    generatePlanAdjustmentSuggestions: (payload) => ipcRenderer.invoke('storage:generate-plan-adjustment-suggestions', payload),
    applyAcceptedConversationActionPreviews: () => ipcRenderer.invoke('storage:apply-accepted-conversation-action-previews'),
    listProviderConfigs: () => ipcRenderer.invoke('storage:list-provider-configs'),
    upsertProviderConfig: (payload) => ipcRenderer.invoke('storage:upsert-provider-config', payload),
    saveProviderSecret: (payload) => ipcRenderer.invoke('storage:save-provider-secret', payload),
    clearProviderSecret: (providerId) => ipcRenderer.invoke('storage:clear-provider-secret', providerId),
    runProviderHealthCheck: (providerId) => ipcRenderer.invoke('storage:run-provider-health-check', providerId),
    getAiRuntimeSummary: () => ipcRenderer.invoke('storage:get-ai-runtime-summary'),
    getAiObservability: () => ipcRenderer.invoke('storage:get-ai-observability'),
    getCodexAuthStatus: () => ipcRenderer.invoke('storage:get-codex-auth-status'),
    startCodexLogin: () => ipcRenderer.invoke('storage:start-codex-login'),
    startCodexDeviceLogin: () => ipcRenderer.invoke('storage:start-codex-device-login'),
    logoutCodex: () => ipcRenderer.invoke('storage:logout-codex'),
  },
};

contextBridge.exposeInMainWorld('learningCompanion', learningCompanion);

declare global {
  interface Window {
    learningCompanion: LearningCompanionBridge;
  }
}
