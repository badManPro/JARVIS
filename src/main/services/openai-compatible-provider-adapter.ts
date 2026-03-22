import type { AiPlanGenerationResult, AiProfileExtractionResult, AiProviderAdapter, AiProviderRuntimeConfig, AiRequest, AiResult } from '../../shared/ai-service.js';

const reflectionPeriodLabels = {
  daily: '日复盘',
  weekly: '周复盘',
  stage: '阶段复盘',
} as const;

function toChatCompletionsUrl(endpoint: string) {
  const base = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
  return new URL('chat/completions', base).toString();
}

function toModelsUrl(endpoint: string) {
  const base = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
  return new URL('models', base).toString();
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;

  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = Math.min(
      ...['{', '[']
        .map((token) => candidate.indexOf(token))
        .filter((index) => index >= 0),
    );
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));

    if (!Number.isFinite(start) || start < 0 || end <= start) {
      throw new Error('Provider 返回了无法解析的 JSON 内容。');
    }

    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

function buildHeaders(provider: AiProviderRuntimeConfig) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if ((provider.authMode === 'apiKey' || provider.authMode === 'bearer') && provider.secret) {
    headers.Authorization = `Bearer ${provider.secret}`;
  }

  return headers;
}

function describeHttpFailure(status: number, statusText: string) {
  switch (status) {
    case 401:
    case 403:
      return '认证失败，请检查 Secret 或认证方式。';
    case 404:
      return 'Endpoint 不存在或不支持当前 OpenAI-compatible 路径。';
    case 429:
      return '请求被限流，请稍后重试。';
    default:
      if (status >= 500) {
        return 'Provider 服务暂时不可用，请稍后重试。';
      }
      return `Provider 请求失败（${status} ${statusText}）。`;
  }
}

function describeTransportFailure(error: unknown) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return '连接超时，请检查网络或 Endpoint。';
    }

    if (/Invalid URL/i.test(error.message)) {
      return 'Provider Endpoint 无效，请检查地址格式。';
    }

    if (/fetch failed/i.test(error.message)) {
      return '无法连接到 Provider，请检查 Endpoint、网络或代理设置。';
    }

    return error.message;
  }

  return '请求失败，请稍后重试。';
}

function formatReflectionContext(
  reflection: Extract<AiRequest, { capability: 'profile_extraction' | 'plan_adjustment' }>['reflection'],
) {
  const entryLines = reflection.entries.flatMap((entry) => {
    const label = entry.label?.trim() || reflectionPeriodLabels[entry.period];
    return [
      entry.deviation ? `${label}偏差：${entry.deviation}` : null,
      entry.obstacle ? `${label}障碍：${entry.obstacle}` : null,
      entry.insight ? `${label}洞察：${entry.insight}` : null,
      entry.followUpActions.length ? `${label}后续动作：${entry.followUpActions.join('；')}` : null,
      entry.nextActions.length ? `${label}建议动作：${entry.nextActions.join('；')}` : null,
    ].filter(Boolean) as string[];
  });

  return [
    reflection.deviation ? `当前默认复盘偏差：${reflection.deviation}` : null,
    reflection.insight ? `当前默认复盘洞察：${reflection.insight}` : null,
    ...entryLines,
  ].filter(Boolean) as string[];
}

function buildPlanGenerationPrompt(request: Extract<AiRequest, { capability: 'plan_generation' }>) {
  return [
    '你是一个学习规划助手。请只输出 JSON，不要输出 Markdown。',
    '输出格式：{"title":"", "summary":"", "basis":[""], "stages":[{"title":"","outcome":"","progress":"未开始"}], "tasks":[{"title":"","duration":"","note":"","status":"todo"}]}',
    '要求：中文；basis 2-5 条；stages 2-4 条；tasks 3-6 条；内容具体、可执行。',
    `目标名称：${request.goal.title}`,
    `目标动机：${request.goal.motivation}`,
    `当前基础：${request.goal.baseline}`,
    `目标周期：${request.goal.cycle}`,
    `成功标准：${request.goal.successMetric}`,
    `学习窗口：${request.profile.bestStudyWindow}`,
    `时间预算：${request.profile.timeBudget}`,
    `节奏偏好：${request.profile.pacePreference}`,
    `优势：${request.profile.strengths.join('；') || '暂无'}`,
    `阻碍：${request.profile.blockers.join('；') || '暂无'}`,
    request.currentDraft ? `当前草案摘要：${request.currentDraft.summary}` : '当前没有既有草案。',
  ].join('\n');
}

function buildProfileExtractionPrompt(request: Extract<AiRequest, { capability: 'profile_extraction' }>) {
  return [
    '你是一个结构化建议生成器。请只输出 JSON，不要输出 Markdown。',
    '输出格式：{"suggestions":["采纳：...","采纳：..."]}',
    '要求：建议必须是中文短句，优先使用以下可被系统识别的表达：',
    '1. 调整学习窗口: 采纳：把学习窗口调整为工作日晚间 20:30 - 21:15',
    '2. 调整时间预算: 采纳：把时间预算调整为工作日 30 分钟，周末 2 小时',
    '3. 调整节奏偏好: 采纳：把节奏偏好调整为更轻量、每次 30 分钟推进',
    '4. 补充阻力因素: 采纳：把阻力因素补充为「工作日连续时间不足」',
    '5. 补充计划影响: 采纳：把计划影响说明补充为「后续计划优先拆成 30 分钟内的小步」',
    '6. 调整目标周期/成功标准: 采纳：把当前主目标周期改为 6 周，并把成功标准调整为完成一个可演示的本地优先 AI MVP',
    '7. 调整计划标题/任务: 采纳：把计划标题改成「Python + AI MVP 冲刺草案」，并新增任务「拆解本周 MVP 功能清单」',
    '8. 未落地能力占位: 进行中：真实 AI Provider 生成计划仍待接入',
    '每条建议只改一个字段；如果复盘显示节奏、预算、阻力或计划约束发生变化，优先先给画像建议。',
    '请综合以下对话和复盘上下文生成 2-4 条建议，尽量覆盖画像、目标和计划。',
    `对话标题：${request.conversation.title}`,
    ...request.conversation.messages.map((message) => `${message.role}: ${message.content}`),
    '复盘上下文：',
    ...formatReflectionContext(request.reflection),
  ].join('\n');
}

function buildTextPrompt(request: Exclude<AiRequest, { capability: 'plan_generation' | 'profile_extraction' }>) {
  switch (request.capability) {
    case 'plan_adjustment':
      return [
        '你是一个学习计划调整助手。请输出纯文本，不要 Markdown。',
        '输出 2-4 行中文短句，每行以“采纳：”或“进行中：”开头，优先给出可直接落到计划标题或任务补充的建议。',
        `目标：${request.goal.title}`,
        `学习窗口：${request.profile.bestStudyWindow}`,
        `时间预算：${request.profile.timeBudget}`,
        `节奏偏好：${request.profile.pacePreference}`,
        `最近计划影响：${request.profile.planImpact[request.profile.planImpact.length - 1] ?? '暂无'}`,
        `当前草案：${request.currentDraft.summary}`,
        '复盘上下文：',
        ...formatReflectionContext(request.reflection),
        `反馈：${request.feedback.join('；')}`,
      ].join('\n');
    case 'reflection_summary':
      return [
        '你是一个学习复盘助手。请输出纯文本，不要 Markdown。',
        `复盘周期：${request.reflection.period}`,
        `完成任务：${request.reflection.completedTasks}`,
        `偏差：${request.reflection.deviation}`,
        `洞察：${request.reflection.insight}`,
      ].join('\n');
    case 'chat_general':
      return [
        '你是一个学习陪伴助手。请输出纯文本，不要 Markdown。',
        ...request.messages.map((message) => `${message.role}: ${message.content}`),
      ].join('\n');
    default:
      return '';
  }
}

type OpenAiCompatibleAdapterOptions = {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

export class OpenAiCompatibleProviderAdapter implements AiProviderAdapter {
  readonly name = 'openai-compatible';
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: OpenAiCompatibleAdapterOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
  }

  supports(provider: AiProviderRuntimeConfig) {
    return Boolean(provider.endpoint.trim());
  }

  async checkHealth(input: {
    provider: AiProviderRuntimeConfig;
    signal?: AbortSignal;
  }) {
    const { provider, signal } = input;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(toModelsUrl(provider.endpoint), {
        method: 'GET',
        headers: buildHeaders(provider),
        signal: signal ?? controller.signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          message: describeHttpFailure(response.status, response.statusText),
        };
      }

      return {
        ok: true,
        message: '模型列表接口可访问。',
      };
    } catch (error) {
      return {
        ok: false,
        message: describeTransportFailure(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async execute(input: {
    provider: AiProviderRuntimeConfig;
    request: AiRequest;
    signal?: AbortSignal;
  }): Promise<AiResult> {
    const { provider, request, signal } = input;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(toChatCompletionsUrl(provider.endpoint), {
        method: 'POST',
        headers: buildHeaders(provider),
        body: JSON.stringify({
          model: provider.model,
          temperature: request.capability === 'profile_extraction' ? 0.2 : 0.4,
          messages: [
            {
              role: 'system',
              content: request.capability === 'plan_generation'
                ? '只输出 JSON。'
                : (request.capability === 'profile_extraction' ? '只输出 suggestions JSON。' : '只输出纯文本。'),
            },
            {
              role: 'user',
              content: request.capability === 'plan_generation'
                ? buildPlanGenerationPrompt(request)
                : (request.capability === 'profile_extraction' ? buildProfileExtractionPrompt(request) : buildTextPrompt(request)),
            },
          ],
        }),
        signal: signal ?? controller.signal,
      });

      if (!response.ok) {
        throw new Error(describeHttpFailure(response.status, response.statusText));
      }

      const payload = await response.json() as {
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Provider 返回了空响应。');
      }

      if (request.capability === 'plan_generation') {
        const parsed = extractJsonPayload(content) as AiPlanGenerationResult['draft'];
        return {
          capability: 'plan_generation',
          providerId: provider.id,
          providerLabel: provider.label,
          model: provider.model,
          draft: parsed,
        };
      }

      if (request.capability === 'profile_extraction') {
        const parsed = extractJsonPayload(content) as { suggestions?: string[] };
        return {
          capability: 'profile_extraction',
          providerId: provider.id,
          providerLabel: provider.label,
          model: provider.model,
          suggestions: parsed.suggestions ?? [],
        } satisfies AiProfileExtractionResult;
      }

      return {
        capability: request.capability,
        providerId: provider.id,
        providerLabel: provider.label,
        model: provider.model,
        text: content,
      };
    } catch (error) {
      throw new Error(describeTransportFailure(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}
