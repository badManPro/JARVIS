import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db/client.js';
import { AppStateRepository } from './repositories/app-state-repository.js';
import { EntitiesRepository } from './repositories/entities-repository.js';
import { ProviderSecretRepository } from './repositories/provider-secret-repository.js';
import { AppStorageService } from './services/app-storage-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

let storageService: AppStorageService | null = null;

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#F8FAFC',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    window.loadURL('http://localhost:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

function registerIpcHandlers() {
  ipcMain.handle('storage:load-app-state', async () => getStorageService().loadAppState());
  ipcMain.handle('storage:save-app-state', async (_event, state) => getStorageService().saveAppState(state));
  ipcMain.handle('storage:load-user-profile', async () => getStorageService().loadUserProfile());
  ipcMain.handle('storage:save-user-profile', async (_event, profile) => getStorageService().saveUserProfile(profile));
  ipcMain.handle('storage:upsert-learning-goal', async (_event, goal) => getStorageService().upsertLearningGoal(goal));
  ipcMain.handle('storage:set-active-goal', async (_event, goalId) => getStorageService().setActiveGoal(goalId));
  ipcMain.handle('storage:save-learning-plan-draft', async (_event, draft) => getStorageService().saveLearningPlanDraft(draft));
  ipcMain.handle('storage:list-provider-configs', async () => getStorageService().listProviderConfigs());
  ipcMain.handle('storage:upsert-provider-config', async (_event, payload) => getStorageService().upsertProviderConfig(payload));
  ipcMain.handle('storage:save-provider-secret', async (_event, payload) => getStorageService().saveProviderSecret(payload));
  ipcMain.handle('storage:clear-provider-secret', async (_event, providerId) => getStorageService().clearProviderSecret(providerId));
}

function getStorageService() {
  if (storageService) return storageService;

  const dbFilePath = path.join(app.getPath('userData'), 'learning-companion.sqlite');
  const { db } = createDatabase(dbFilePath);
  storageService = new AppStorageService(new AppStateRepository(db), new EntitiesRepository(db), new ProviderSecretRepository(db));
  storageService.initialize();
  return storageService;
}

app.whenReady().then(() => {
  getStorageService();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
