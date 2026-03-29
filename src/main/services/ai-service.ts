import type { AppState, ModelCapability, ProviderConfig, ProviderId } from '../../shared/app-state.js';
import type { AiProviderAdapter, AiProviderHealthCheckResult, AiProviderRuntimeConfig, AiRequest, AiResult, AiRuntimeSummaryItem } from '../../shared/ai-service.js';
import { CodexCliProviderAdapter } from './codex-cli-provider-adapter.js';
import { OpenAiCompatibleProviderAdapter } from './openai-compatible-provider-adapter.js';

const capabilityRouteKeyMap = {
  profile_extraction: 'profileExtraction',
  plan_generation: 'planGeneration',
  plan_adjustment: 'planAdjustment',
  reflection_summary: 'reflectionSummary',
  chat_general: 'generalChat',
} satisfies Record<ModelCapability, keyof AppState['settings']['routing']>;

const runtimeCapabilities = Object.keys(capabilityRouteKeyMap) as ModelCapability[];

export type AiRuntimeService = {
  getRuntimeSummary: (settings: AppState['settings']) => AiRuntimeSummaryItem[];
  checkProviderHealth: (settings: AppState['settings'], providerId: ProviderId) => Promise<AiProviderHealthCheckResult>;
  execute: (settings: AppState['settings'], request: AiRequest) => Promise<AiResult>;
};

type AiServiceOptions = {
  getSecret: (providerId: ProviderId) => string | null;
  getProviderLoginState?: (providerId: ProviderId) => { connected: boolean; blockedReason?: string } | null;
  adapters?: AiProviderAdapter[];
};

type ProviderReadiness = {
  providerId: ProviderId;
  providerLabel: string;
  model: string;
  ready: boolean;
  blockedReason?: string;
};

export class AiService implements AiRuntimeService {
  private readonly adapters: AiProviderAdapter[];

  constructor(
    private readonly options: AiServiceOptions,
  ) {
    this.adapters = options.adapters ?? [new CodexCliProviderAdapter(), new OpenAiCompatibleProviderAdapter()];
  }

  getRuntimeSummary(settings: AppState['settings']) {
    return runtimeCapabilities.map((capability) => {
      const providerId = settings.routing[capabilityRouteKeyMap[capability]];
      const readiness = this.evaluateProviderReadiness(settings, capability);
      const provider = settings.providers.find((item) => item.id === providerId);

      return {
        capability,
        providerId,
        providerLabel: readiness.providerLabel,
        model: readiness.model,
        ready: readiness.ready,
        healthStatus: provider?.healthStatus ?? 'unknown',
        healthHint: this.describeHealthStatus(provider?.healthStatus ?? 'unknown'),
        blockedReason: readiness.blockedReason,
      } satisfies AiRuntimeSummaryItem;
    });
  }

  async checkProviderHealth(settings: AppState['settings'], providerId: ProviderId) {
    const checkedAt = new Date().toISOString();
    const provider = settings.providers.find((item) => item.id === providerId);

    if (!provider) {
      return {
        providerId,
        providerLabel: providerId,
        healthStatus: 'warning',
        message: '缺少 Provider 配置。',
        checkedAt,
      } satisfies AiProviderHealthCheckResult;
    }

    if (!provider.enabled) {
      return {
        providerId: provider.id,
        providerLabel: provider.label,
        healthStatus: 'warning',
        message: 'Provider 未启用，暂无法执行健康检查。',
        checkedAt,
      } satisfies AiProviderHealthCheckResult;
    }

    const loginState = this.options.getProviderLoginState?.(provider.id);
    if (loginState && !loginState.connected) {
      return {
        providerId: provider.id,
        providerLabel: provider.label,
        healthStatus: 'warning',
        message: loginState.blockedReason ?? `${provider.label} 当前未连接。`,
        checkedAt,
      } satisfies AiProviderHealthCheckResult;
    }

    if (provider.authMode !== 'none' && !this.options.getSecret(provider.id)?.trim()) {
      return {
        providerId: provider.id,
        providerLabel: provider.label,
        healthStatus: 'warning',
        message: '缺少 Secret，暂无法执行健康检查。',
        checkedAt,
      } satisfies AiProviderHealthCheckResult;
    }

    const runtimeProvider = this.toRuntimeProviderConfig(provider);
    const adapter = this.adapters.find((item) => item.supports(runtimeProvider));

    if (!adapter) {
      return {
        providerId: provider.id,
        providerLabel: provider.label,
        healthStatus: 'warning',
        message: `当前没有可处理 ${provider.label} 的 Provider adapter。`,
        checkedAt,
      } satisfies AiProviderHealthCheckResult;
    }

    const result = await adapter.checkHealth({
      provider: runtimeProvider,
    });

    return {
      providerId: provider.id,
      providerLabel: provider.label,
      healthStatus: result.ok ? 'ready' : 'warning',
      message: result.message,
      checkedAt,
    } satisfies AiProviderHealthCheckResult;
  }

  async execute(settings: AppState['settings'], request: AiRequest) {
    const provider = this.resolveProvider(settings, request.capability);
    const adapter = this.adapters.find((item) => item.supports(provider));

    if (!adapter) {
      throw new Error(`当前没有可处理 ${provider.label} 的 Provider adapter。`);
    }

    try {
      return await adapter.execute({
        provider,
        request,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知 Provider 错误。';
      throw new Error(`${provider.label} 执行 ${request.capability} 失败：${message} 请在设置页检查 Endpoint、Secret 和健康状态。`);
    }
  }

  private resolveProvider(settings: AppState['settings'], capability: ModelCapability): AiProviderRuntimeConfig {
    const routeKey = capabilityRouteKeyMap[capability];
    const providerId = settings.routing[routeKey];
    const provider = settings.providers.find((item) => item.id === providerId);
    const readiness = this.evaluateProviderReadiness(settings, capability);

    if (!provider) {
      throw new Error(`用途 ${capability} 当前没有可用的 Provider 配置。`);
    }

    if (!readiness.ready) {
      throw new Error(`${provider.label} 当前无法执行 ${capability}：${readiness.blockedReason ?? '缺少运行时前置条件'}。请前往设置页检查用途路由、Secret 和 Provider 状态。`);
    }

    return this.toRuntimeProviderConfig(provider);
  }

  private evaluateProviderReadiness(settings: AppState['settings'], capability: ModelCapability): ProviderReadiness {
    const routeKey = capabilityRouteKeyMap[capability];
    const providerId = settings.routing[routeKey];
    const provider = settings.providers.find((item) => item.id === providerId);

    if (!provider) {
      return {
        providerId,
        providerLabel: providerId,
        model: 'unknown',
        ready: false,
        blockedReason: '缺少 Provider 配置',
      };
    }

    if (!provider.enabled) {
      return this.blocked(provider, 'Provider 未启用');
    }

    if (!provider.capabilityTags.includes(capability)) {
      return this.blocked(provider, `Provider 未声明 ${capability} capability`);
    }

    if (provider.authMode !== 'none' && !this.options.getSecret(provider.id)?.trim()) {
      return this.blocked(provider, '缺少 Secret');
    }

    const loginState = this.options.getProviderLoginState?.(provider.id);
    if (loginState && !loginState.connected) {
      return this.blocked(provider, loginState.blockedReason ?? `${provider.label} 当前未连接`);
    }

    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      ready: true,
    };
  }

  private blocked(provider: ProviderConfig, blockedReason: string): ProviderReadiness {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      model: provider.model,
      ready: false,
      blockedReason,
    };
  }

  private toRuntimeProviderConfig(provider: ProviderConfig): AiProviderRuntimeConfig {
    return {
      id: provider.id,
      label: provider.label,
      endpoint: provider.endpoint,
      model: provider.model,
      authMode: provider.authMode,
      capabilityTags: provider.capabilityTags,
      healthStatus: provider.healthStatus,
      secret: this.options.getSecret(provider.id),
    };
  }

  private describeHealthStatus(healthStatus: ProviderConfig['healthStatus']) {
    switch (healthStatus) {
      case 'ready':
        return '最近一次健康检查或模型调用成功。';
      case 'warning':
        return '最近一次健康检查或模型调用失败，请优先检查当前 Provider。';
      default:
        return '尚未执行健康检查。';
    }
  }
}
