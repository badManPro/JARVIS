export type CodexAuthState = 'disconnected' | 'connecting' | 'connected' | 'expired' | 'unavailable';
export type CodexAuthMode = 'browser' | 'device-auth';

export type CodexAuthStatus = {
  providerId: 'codex';
  providerLabel: string;
  state: CodexAuthState;
  message: string;
  checkedAt: string;
  loginMode?: CodexAuthMode;
  rawStatus?: string;
};

export function createDefaultCodexAuthStatus(
  overrides: Partial<CodexAuthStatus> = {},
): CodexAuthStatus {
  return {
    providerId: 'codex',
    providerLabel: 'OpenAI / Codex',
    state: 'disconnected',
    message: '尚未检查 Codex 登录状态。',
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}
