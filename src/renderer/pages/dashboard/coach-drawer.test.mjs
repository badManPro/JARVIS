import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const coachDrawerSource = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard/coach-drawer.tsx'),
  'utf8',
);
const appShellSource = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/layouts/app-shell.tsx'),
  'utf8',
);
const appStoreSource = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/store/app-store.ts'),
  'utf8',
);

test('coach drawer surfaces action previews and review/apply controls', () => {
  assert.match(coachDrawerSource, /onPageChange:\s*\(pageId: string\) => void;/);
  assert.match(coachDrawerSource, /conversation\.actionPreviews/);
  assert.match(coachDrawerSource, /reviewConversationActionPreview/);
  assert.match(coachDrawerSource, /applyAcceptedConversationActionPreviews/);
  assert.match(coachDrawerSource, /接受预览/);
  assert.match(coachDrawerSource, /暂不采纳/);
  assert.match(coachDrawerSource, /应用已接受变更/);
});

test('app shell passes page navigation into the coach drawer', () => {
  assert.match(appShellSource, /<CoachDrawer open=\{coachOpen\} onClose=\{\(\) => setCoachOpen\(false\)\} onPageChange=\{onPageChange\} \/>/);
});

test('app store resyncs derived execution state after applying accepted previews', () => {
  assert.match(appStoreSource, /syncExecutionDerivedState/);
  assert.match(appStoreSource, /const nextState = syncExecutionDerivedState\(result\.state\);/);
});
