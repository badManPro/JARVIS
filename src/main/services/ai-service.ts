import type { AppState, ModelCapability, ProviderConfig, ProviderId } from '../../shared/app-state.js';
import type { AiProviderAdapter, AiProviderRuntimeConfig, AiRequest, AiResult, AiRuntimeSummaryItem } from '../../shared/ai-service.js';
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
  execute: (settings: AppState['settings'], request: AiRequest) => Promise<AiResult>;
};

type AiServiceOptions = {
  getSecret: (providerId: ProviderId) => string | null;
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
    this.adapters = options.adapters ?? [new OpenAiCompatibleProviderAdapter()];
  }

  getRuntimeSummary(settings: AppState['settings']) {
    return runtimeCapabilities.map((capability) => {
      const providerId = settings.routing[capabilityRouteKeyMap[capability]];
      const readiness = this.evaluateProviderReadiness(settings, capability);

      return {
        capability,
        providerId,
        providerLabel: readiness.providerLabel,
        model: readiness.model,
        ready: readiness.ready,
        blockedReason: readiness.blockedReason,
      } satisfies AiRuntimeSummaryItem;
    });
  }

  async execute(settings: AppState['settings'], request: AiRequest) {
    const provider = this.resolveProvider(settings, request.capability);
    const adapter = this.adapters.find((item) => item.supports(provider));

    if (!adapter) {
      throw new Error(`当前没有可处理 ${provider.label} 的 Provider adapter。`);
    }

    return adapter.execute({
      provider,
      request,
    });
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
      throw new Error(`${provider.label} 当前无法执行 ${capability}：${readiness.blockedReason ?? '缺少运行时前置条件'}。`);
    }

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
}
