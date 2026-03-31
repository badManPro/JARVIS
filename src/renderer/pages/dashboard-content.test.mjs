import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve('/Users/casper/Documents/project/JARVIS/src/renderer/pages/dashboard-content.tsx'),
  'utf8',
);

test('dashboard-content delegates each dashboard surface to extracted page modules', () => {
  assert.match(source, /from ['"]@\/pages\/dashboard\/coach-drawer['"]/);
  assert.match(source, /from ['"]@\/pages\/dashboard\/today-page['"]/);
  assert.match(source, /from ['"]@\/pages\/dashboard\/path-page['"]/);
  assert.match(source, /from ['"]@\/pages\/dashboard\/profile-page['"]/);
  assert.match(source, /from ['"]@\/pages\/dashboard\/calendar-page['"]/);
  assert.match(source, /from ['"]@\/pages\/dashboard\/settings-page['"]/);
  assert.match(source, /case 'today':\s*return <TodayPage onOpenCoach=\{onOpenCoach\} onPageChange=\{onPageChange\} \/>;/s);
  assert.match(source, /case 'path':\s*return <PathPage onOpenCoach=\{onOpenCoach\} \/>;/s);
  assert.match(source, /case 'profile':\s*return <ProfilePage \/>;/s);
  assert.match(source, /case 'calendar':\s*return <CalendarPage \/>;/s);
  assert.match(source, /case 'settings':\s*return <SettingsPage onPageChange=\{onPageChange\} \/>;/s);
});

test('dashboard-content no longer keeps page implementations inline', () => {
  assert.doesNotMatch(source, /function TodayContent\(/);
  assert.doesNotMatch(source, /function PathContent\(/);
  assert.doesNotMatch(source, /function ProfileContent\(/);
  assert.doesNotMatch(source, /function CalendarContent\(/);
  assert.doesNotMatch(source, /function SettingsContent\(/);
});
