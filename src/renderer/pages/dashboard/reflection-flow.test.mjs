import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const todayPagePath = path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/today-page.tsx');
const pathPagePath = path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/path-page.tsx');
const reflectionSheetPath = path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/reflection-sheet.tsx');
const appStorePath = path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/store/app-store.ts');

const todayPageSource = fs.readFileSync(todayPagePath, 'utf8');
const pathPageSource = fs.readFileSync(pathPagePath, 'utf8');
const appStoreSource = fs.readFileSync(appStorePath, 'utf8');

test('today page opens a reflection sheet after task completion, delay, or skip', () => {
  assert.equal(fs.existsSync(reflectionSheetPath), true);
  assert.match(todayPageSource, /ReflectionSheet/);
  assert.match(todayPageSource, /status === 'done' \|\| status === 'delayed' \|\| status === 'skipped'/);
  assert.match(todayPageSource, /period="daily"/);
});

test('path page keeps the first screen focused on current stage and moves basis into progressive disclosure', () => {
  const reflectionSheetSource = fs.readFileSync(reflectionSheetPath, 'utf8');
  assert.match(reflectionSheetSource, /saveReflectionEntry/);
  assert.match(pathPageSource, /SectionTitle>当前阶段</);
  assert.match(pathPageSource, /ReflectionSheet/);
  assert.match(pathPageSource, /period="stage"/);
  assert.doesNotMatch(pathPageSource, /<SectionTitle>路径依据<\/SectionTitle>/);
});

test('app store returns the updated state from task status changes', () => {
  assert.match(appStoreSource, /updatePlanTaskStatus: \(payload: UpdatePlanTaskStatusInput\) => Promise<AppState>;/);
  assert.match(appStoreSource, /const persistedState = await bridge.updatePlanTaskStatus\(payload\);/);
  assert.match(appStoreSource, /return persistedState;/);
});
