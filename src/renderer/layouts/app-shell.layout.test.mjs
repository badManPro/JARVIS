import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/layouts/app-shell.tsx'),
  'utf8',
);

test('AppShell keeps desktop sidebar and main content in independent scroll containers', () => {
  assert.match(source, /className="[^"]*relative h-screen overflow-hidden[^"]*"/);
  assert.match(source, /className="[^"]*relative flex h-full flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6[^"]*"/);
  assert.match(source, /aside className="[^"]*lg:h-full[^"]*lg:overflow-y-auto[^"]*"/);
  assert.match(source, /main className="[^"]*lg:min-w-0[^"]*lg:h-full[^"]*lg:overflow-y-auto[^"]*"/);
});
