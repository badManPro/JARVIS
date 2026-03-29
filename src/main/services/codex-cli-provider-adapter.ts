import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { AiDailyPlanGenerationResult, AiPlanGenerationResult, AiProfileExtractionResult, AiProviderAdapter, AiProviderRuntimeConfig, AiRequest, AiResult } from '../../shared/ai-service.js';
import { buildDailyPlanGenerationPrompt, buildPlanGenerationPrompt, buildProfileExtractionPrompt, buildTextPrompt, extractJsonPayload } from './openai-compatible-provider-adapter.js';

const execFileAsync = promisify(execFile);

type CodexInvocationInput = {
  model: string;
  prompt: string;
};

type CodexCliProviderAdapterOptions = {
  invoke?: (input: CodexInvocationInput) => Promise<string>;
  timeoutMs?: number;
};

function buildPrompt(request: AiRequest) {
  switch (request.capability) {
    case 'plan_generation':
      return buildPlanGenerationPrompt(request);
    case 'daily_plan_generation':
      return buildDailyPlanGenerationPrompt(request);
    case 'profile_extraction':
      return buildProfileExtractionPrompt(request);
    default:
      return buildTextPrompt(request);
  }
}

function describeCodexFailure(message: string) {
  if (/codex login|login required|not logged in|sign in/i.test(message)) {
    return '未检测到可复用的 Codex 登录态，请先完成 Codex 浏览器登录。';
  }

  if (/ENOENT|not found/i.test(message)) {
    return '当前机器未安装 codex CLI，暂无法使用 Codex 登录型 Provider。';
  }

  if (/network error|stream disconnected|error sending request|timed out/i.test(message)) {
    return 'Codex 登录已找到，但当前无法连接到 Codex 服务，请检查网络后重试。';
  }

  return message.trim() || 'Codex 调用失败。';
}

async function invokeWithCodexCli(input: CodexInvocationInput, timeoutMs: number) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'learning-companion-codex-'));
  const outputPath = path.join(tempDir, 'output.txt');

  try {
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--color',
      'never',
      '--sandbox',
      'read-only',
      '-c',
      'model_provider="openai"',
      '-o',
      outputPath,
    ];

    if (input.model.trim()) {
      args.push('-m', input.model.trim());
    }

    args.push(input.prompt);

    await execFileAsync('codex', args, {
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = (await readFile(outputPath, 'utf8')).trim();
    if (!output) {
      throw new Error('Codex 返回了空响应。');
    }

    return output;
  } catch (error) {
    const parts = [];
    if (error instanceof Error) {
      parts.push(error.message);
      const withStreams = error as Error & { stdout?: string; stderr?: string };
      if (withStreams.stderr?.trim()) {
        parts.push(withStreams.stderr.trim());
      }
      if (withStreams.stdout?.trim()) {
        parts.push(withStreams.stdout.trim());
      }
    }

    throw new Error(describeCodexFailure(parts.join('\n')));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export class CodexCliProviderAdapter implements AiProviderAdapter {
  readonly name = 'codex-cli';
  private readonly invoke: (input: CodexInvocationInput) => Promise<string>;

  constructor(options: CodexCliProviderAdapterOptions = {}) {
    const timeoutMs = options.timeoutMs ?? 90_000;
    this.invoke = options.invoke ?? ((input) => invokeWithCodexCli(input, timeoutMs));
  }

  supports(provider: AiProviderRuntimeConfig) {
    return provider.id === 'codex';
  }

  async checkHealth(input: {
    provider: AiProviderRuntimeConfig;
    signal?: AbortSignal;
  }) {
    if (input.signal?.aborted) {
      return {
        ok: false,
        message: '健康检查已取消。',
      };
    }

    try {
      const output = await this.invoke({
        model: input.provider.model,
        prompt: 'Reply with OK only. Do not use tools.',
      });

      if (!output.trim()) {
        return {
          ok: false,
          message: 'Codex 返回了空响应。',
        };
      }

      return {
        ok: true,
        message: 'Codex 登录可用，已成功返回测试响应。',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Codex 健康检查失败。',
      };
    }
  }

  async execute(input: {
    provider: AiProviderRuntimeConfig;
    request: AiRequest;
    signal?: AbortSignal;
  }): Promise<AiResult> {
    if (input.signal?.aborted) {
      throw new Error('请求已取消。');
    }

    const content = (await this.invoke({
      model: input.provider.model,
      prompt: buildPrompt(input.request),
    })).trim();

    if (!content) {
      throw new Error('Codex 返回了空响应。');
    }

    if (input.request.capability === 'plan_generation') {
      const parsed = extractJsonPayload(content) as AiPlanGenerationResult['draft'];
      return {
        capability: 'plan_generation',
        providerId: input.provider.id,
        providerLabel: input.provider.label,
        model: input.provider.model,
        draft: parsed,
      };
    }

    if (input.request.capability === 'daily_plan_generation') {
      const parsed = extractJsonPayload(content) as AiDailyPlanGenerationResult['plan'];
      return {
        capability: 'daily_plan_generation',
        providerId: input.provider.id,
        providerLabel: input.provider.label,
        model: input.provider.model,
        plan: parsed,
      };
    }

    if (input.request.capability === 'profile_extraction') {
      const parsed = extractJsonPayload(content) as { suggestions?: string[] };
      return {
        capability: 'profile_extraction',
        providerId: input.provider.id,
        providerLabel: input.provider.label,
        model: input.provider.model,
        suggestions: parsed.suggestions ?? [],
      } satisfies AiProfileExtractionResult;
    }

    return {
      capability: input.request.capability,
      providerId: input.provider.id,
      providerLabel: input.provider.label,
      model: input.provider.model,
      text: content,
    };
  }
}
