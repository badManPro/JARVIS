import type { ProviderConfig, ProviderSecretInput } from './app-state.js';

export type ProviderConfigInput = Omit<ProviderConfig, 'keyPreview' | 'hasSecret' | 'updatedAt'>;

export function maskSecret(secret: string | null | undefined) {
  if (!secret) return '未配置';
  const trimmed = secret.trim();
  if (!trimmed) return '未配置';
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****`;
  }
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
}

function describeNoSecretPreview(config: ProviderConfigInput) {
  if (config.id === 'codex') {
    return '复用本机 Codex 登录';
  }

  return '无需 Secret';
}

export function toSafeProviderConfig(config: ProviderConfigInput, secret: string | null, updatedAt?: string): ProviderConfig {
  const usesStaticSecret = config.authMode !== 'none';
  return {
    ...config,
    keyPreview: usesStaticSecret ? maskSecret(secret) : describeNoSecretPreview(config),
    hasSecret: usesStaticSecret ? Boolean(secret && secret.trim()) : false,
    updatedAt,
  };
}

export function normalizeSecretInput(input: ProviderSecretInput) {
  return {
    providerId: input.providerId,
    secret: input.secret?.trim() ? input.secret.trim() : null,
  };
}
