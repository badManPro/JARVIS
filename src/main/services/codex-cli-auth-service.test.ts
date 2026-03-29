import test from 'node:test';
import assert from 'node:assert/strict';
import { CodexCliAuthService } from './codex-cli-auth-service.js';

test('CodexCliAuthService reports connected status from official codex login status output', async () => {
  const service = new CodexCliAuthService({
    run: async () => ({
      stdout: 'Logged in using ChatGPT',
      stderr: '',
      exitCode: 0,
    }),
  });

  const status = await service.getStatus();

  assert.equal(status.state, 'connected');
  assert.match(status.message, /ChatGPT|已连接/);
});

test('CodexCliAuthService marks missing codex cli as unavailable', async () => {
  const service = new CodexCliAuthService({
    run: async () => {
      throw new Error('spawn codex ENOENT');
    },
  });

  const status = await service.getStatus();

  assert.equal(status.state, 'unavailable');
  assert.match(status.message, /未安装|不可用/);
});

test('CodexCliAuthService starts browser login via codex login and refreshes status', async () => {
  const calls: string[][] = [];
  const service = new CodexCliAuthService({
    run: async (args) => {
      calls.push(args);
      if (args[0] === 'login' && args[1] === 'status') {
        return {
          stdout: 'Logged in using ChatGPT',
          stderr: '',
          exitCode: 0,
        };
      }

      return {
        stdout: 'Opening browser for authentication',
        stderr: '',
        exitCode: 0,
      };
    },
  });

  const status = await service.startBrowserLogin();

  assert.equal(status.state, 'connected');
  assert.deepEqual(calls, [
    ['login'],
    ['login', 'status'],
  ]);
});

test('CodexCliAuthService starts device login via codex login --device-auth', async () => {
  const calls: string[][] = [];
  const service = new CodexCliAuthService({
    run: async (args) => {
      calls.push(args);
      if (args[0] === 'login' && args[1] === 'status') {
        return {
          stdout: 'Logged in using ChatGPT',
          stderr: '',
          exitCode: 0,
        };
      }

      return {
        stdout: 'Open this URL and enter the device code',
        stderr: '',
        exitCode: 0,
      };
    },
  });

  const status = await service.startDeviceLogin();

  assert.equal(status.state, 'connected');
  assert.deepEqual(calls, [
    ['login', '--device-auth'],
    ['login', 'status'],
  ]);
});
