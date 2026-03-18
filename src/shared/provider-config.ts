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

export function toSafeProviderConfig(config: ProviderConfigInput, secret: string | null, updatedAt?: string): ProviderConfig {
  return {
    ...config,
    keyPreview: maskSecret(secret),
    hasSecret: Boolean(secret && secret.trim()),
    updatedAt,
  };
}

export function normalizeSecretInput(input: ProviderSecretInput) {
  return {
    providerId: input.providerId,
    secret: input.secret?.trim() ? input.secret.trim() : null,
  };
}
