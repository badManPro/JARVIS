import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const source = fs.readFileSync(path.resolve(currentDir, 'page-data.ts'), 'utf8');

test('page definitions keep the dashboard-oriented primary navigation and add calendar scheduling', () => {
  assert.match(source, /id:\s*'today'/);
  assert.match(source, /id:\s*'path'/);
  assert.match(source, /id:\s*'profile'/);
  assert.match(source, /id:\s*'calendar'/);
  assert.match(source, /id:\s*'settings'/);
  assert.doesNotMatch(source, /id:\s*'goals'/);
  assert.doesNotMatch(source, /id:\s*'conversation'/);
  assert.doesNotMatch(source, /id:\s*'reflection'/);
});
