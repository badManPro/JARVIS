import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/page-data.ts'),
  'utf8',
);

test('page definitions are reduced to the dashboard-oriented primary navigation', () => {
  assert.match(source, /id:\s*'today'/);
  assert.match(source, /id:\s*'path'/);
  assert.match(source, /id:\s*'profile'/);
  assert.match(source, /id:\s*'settings'/);
  assert.doesNotMatch(source, /id:\s*'goals'/);
  assert.doesNotMatch(source, /id:\s*'conversation'/);
  assert.doesNotMatch(source, /id:\s*'reflection'/);
});
