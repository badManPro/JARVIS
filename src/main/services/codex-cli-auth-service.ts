import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CodexAuthMode, CodexAuthStatus } from '../../shared/codex-auth.js';
import { createDefaultCodexAuthStatus } from '../../shared/codex-auth.js';

const execFileAsync = promisify(execFile);

export type CodexCliRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type CodexCliAuthServiceOptions = {
  run?: (args: string[]) => Promise<CodexCliRunResult>;
};

export type CodexAuthRuntimeService = {
  getCachedStatus: () => CodexAuthStatus;
  getStatus: () => Promise<CodexAuthStatus>;
  startBrowserLogin: () => Promise<CodexAuthStatus>;
  startDeviceLogin: () => Promise<CodexAuthStatus>;
  logout: () => Promise<CodexAuthStatus>;
};

async function defaultRun(args: string[]): Promise<CodexCliRunResult> {
  try {
    const result = await execFileAsync('codex', args, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
      },
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (/ENOENT|not found/i.test(error.message)) {
        throw error;
      }

      const execError = error as Error & { stdout?: string; stderr?: string; code?: number | string };
      return {
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? execError.message,
        exitCode: typeof execError.code === 'number' ? execError.code : 1,
      };
    }

    return {
      stdout: '',
      stderr: 'Codex CLI 调用失败。',
      exitCode: 1,
    };
  }
}

function combineOutput(result: CodexCliRunResult) {
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
}

function describeStatus(output: string, loginMode?: CodexAuthMode): CodexAuthStatus {
  const checkedAt = new Date().toISOString();
  const normalized = output.trim();

  if (/Logged in using ChatGPT/i.test(normalized) || /logged in/i.test(normalized)) {
    return createDefaultCodexAuthStatus({
      state: 'connected',
      message: /ChatGPT/i.test(normalized) ? 'Codex 已连接，当前登录方式为 ChatGPT。' : 'Codex 已连接。',
      checkedAt,
      loginMode,
      rawStatus: normalized,
    });
  }

  if (/expired|revoked|invalid|re-auth/i.test(normalized)) {
    return createDefaultCodexAuthStatus({
      state: 'expired',
      message: 'Codex 登录已失效，需要重新验证。',
      checkedAt,
      loginMode,
      rawStatus: normalized,
    });
  }

  if (/opening browser|device code|enter the device code|continue in your browser/i.test(normalized)) {
    return createDefaultCodexAuthStatus({
      state: 'connecting',
      message: loginMode === 'device-auth' ? 'Codex 设备码登录已启动，请完成验证。' : 'Codex 浏览器登录已启动，请在浏览器完成验证。',
      checkedAt,
      loginMode,
      rawStatus: normalized,
    });
  }

  if (/not logged in|login required|sign in|signed out|authenticate/i.test(normalized)) {
    return createDefaultCodexAuthStatus({
      state: 'disconnected',
      message: 'Codex 尚未连接，请先完成登录。',
      checkedAt,
      loginMode,
      rawStatus: normalized,
    });
  }

  return createDefaultCodexAuthStatus({
    state: 'disconnected',
    message: normalized || '暂未检测到有效的 Codex 登录状态。',
    checkedAt,
    loginMode,
    rawStatus: normalized,
  });
}

function describeUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return createDefaultCodexAuthStatus({
    state: 'unavailable',
    message: '当前机器未安装 Codex CLI，或 CLI 暂不可用。',
    checkedAt: new Date().toISOString(),
    rawStatus: message,
  });
}

export class CodexCliAuthService implements CodexAuthRuntimeService {
  private readonly run: (args: string[]) => Promise<CodexCliRunResult>;
  private cachedStatus: CodexAuthStatus = createDefaultCodexAuthStatus();

  constructor(options: CodexCliAuthServiceOptions = {}) {
    this.run = options.run ?? defaultRun;
  }

  getCachedStatus() {
    return this.cachedStatus;
  }

  async getStatus() {
    try {
      const result = await this.run(['login', 'status']);
      this.cachedStatus = describeStatus(combineOutput(result));
      return this.cachedStatus;
    } catch (error) {
      if (error instanceof Error && /ENOENT|not found/i.test(error.message)) {
        this.cachedStatus = describeUnavailable(error);
        return this.cachedStatus;
      }

      throw error;
    }
  }

  async startBrowserLogin() {
    return this.startLoginFlow(['login'], 'browser');
  }

  async startDeviceLogin() {
    return this.startLoginFlow(['login', '--device-auth'], 'device-auth');
  }

  async logout() {
    try {
      await this.run(['logout']);
      this.cachedStatus = createDefaultCodexAuthStatus({
        state: 'disconnected',
        message: 'Codex 已断开连接。',
        checkedAt: new Date().toISOString(),
      });
      return this.cachedStatus;
    } catch (error) {
      if (error instanceof Error && /ENOENT|not found/i.test(error.message)) {
        this.cachedStatus = describeUnavailable(error);
        return this.cachedStatus;
      }

      throw error;
    }
  }

  private async startLoginFlow(args: string[], loginMode: CodexAuthMode) {
    try {
      const startResult = await this.run(args);
      const status = await this.getStatus();

      if (status.state === 'connected') {
        this.cachedStatus = {
          ...status,
          loginMode,
        };
        return this.cachedStatus;
      }

      this.cachedStatus = describeStatus(combineOutput(startResult), loginMode);
      return this.cachedStatus;
    } catch (error) {
      if (error instanceof Error && /ENOENT|not found/i.test(error.message)) {
        this.cachedStatus = describeUnavailable(error);
        return this.cachedStatus;
      }

      throw error;
    }
  }
}
