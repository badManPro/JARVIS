import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const companionPath = path.resolve(currentDir, 'desktop-companion.tsx');
const companionSource = fs.readFileSync(companionPath, 'utf8');

test('desktop companion defines reminder, celebration, and status-feedback duties without becoming the main entrypoint', () => {
  assert.match(companionSource, /桌面陪伴层/);
  assert.match(companionSource, /提醒/);
  assert.match(companionSource, /庆祝/);
  assert.match(companionSource, /状态反馈/);
  assert.match(companionSource, /陪伴层，不是主入口/);
  assert.match(companionSource, /dashboard\.onboarding/);
  assert.match(companionSource, /dashboard\.riskSignals/);
  assert.match(companionSource, /dashboard\.priorityAction/);
  assert.match(companionSource, /dashboard\.scheduling/);
  assert.match(companionSource, /todayPlan\?\.steps/);
});

test('desktop companion stays wired into shell navigation and change capture actions', () => {
  assert.match(companionSource, /currentPage: string/);
  assert.match(companionSource, /onOpenCoach: \(\) => void/);
  assert.match(companionSource, /onPageChange: \(pageId: string\) => void/);
  assert.match(companionSource, /onClick=\{\(\) => onPageChange\(brief\.actionPageId\)\}/);
  assert.match(companionSource, /onClick=\{onOpenCoach\}/);
  assert.match(companionSource, /desktop-companion-panel/);
  assert.match(companionSource, /desktop-companion-avatar/);
  assert.match(companionSource, /data-duty=/);
});
