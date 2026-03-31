import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const settingsPagePath = path.resolve(currentDir, 'settings-page.tsx');
const advancedPanelPath = path.resolve(currentDir, 'advanced-settings-panel.tsx');
const appStorePath = path.resolve(currentDir, '../../store/app-store.ts');

const settingsPageSource = fs.readFileSync(settingsPagePath, 'utf8');
const appStoreSource = fs.readFileSync(appStorePath, 'utf8');

test('settings page delegates technical controls to an advanced settings panel', () => {
  assert.equal(fs.existsSync(advancedPanelPath), true);
  assert.match(settingsPageSource, /AdvancedSettingsPanel/);
  assert.match(settingsPageSource, /Field label="主题"/);
  assert.match(settingsPageSource, /Field label="启动页"/);
  assert.match(settingsPageSource, /连接 Codex/);
  assert.doesNotMatch(settingsPageSource, /appState\.settings\.providers\.map/);
  assert.doesNotMatch(settingsPageSource, /appState\.aiRuntimeSummary\.map/);
});

test('advanced settings panel restores provider, route, runtime, and observability controls', () => {
  const advancedPanelSource = fs.readFileSync(advancedPanelPath, 'utf8');
  assert.match(advancedPanelSource, /settingsDraft\.routing/);
  assert.match(advancedPanelSource, /state\.settings\.providers\.map/);
  assert.match(advancedPanelSource, /runProviderHealthCheck/);
  assert.match(advancedPanelSource, /refreshAdvancedSettingsData/);
  assert.match(advancedPanelSource, /AI 运行时/);
  assert.match(advancedPanelSource, /观测/);
});

test('app store exposes a single advanced-settings refresh entrypoint', () => {
  assert.match(appStoreSource, /refreshAdvancedSettingsData: \(\) => Promise<void>;/);
  assert.match(appStoreSource, /refreshAdvancedSettingsData: async \(\) => \{/);
});
