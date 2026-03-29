import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { Field, inputClassName, primaryButtonClassName, secondaryButtonClassName } from '@/pages/dashboard/shared';
import type {
  AppState,
  ModelCapability,
  ProviderConfig,
  ProviderId,
} from '@shared/app-state';
import type {
  AiCapabilityObservabilitySummary,
  AiObservabilitySnapshot,
  AiProviderHealthCheckResult,
  AiRuntimeSummaryItem,
} from '@shared/ai-service';
import type { ProviderConfigInput } from '@shared/provider-config';

const providerOptions: Array<{ value: ProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI / GPT' },
  { value: 'codex', label: 'OpenAI / Codex' },
  { value: 'glm', label: 'Zhipu / GLM' },
  { value: 'kimi', label: 'Moonshot / Kimi' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: 'Custom' },
];

const capabilityOptions: Array<{ value: ModelCapability; label: string }> = [
  { value: 'profile_extraction', label: '画像提取' },
  { value: 'plan_generation', label: '计划生成' },
  { value: 'plan_adjustment', label: '计划调整' },
  { value: 'reflection_summary', label: '复盘总结' },
  { value: 'chat_general', label: '通用对话' },
];

const routingItems: Array<{ key: keyof AppState['settings']['routing']; label: string }> = [
  { key: 'profileExtraction', label: '画像提取' },
  { key: 'planGeneration', label: '计划生成' },
  { key: 'planAdjustment', label: '计划调整' },
  { key: 'reflectionSummary', label: '复盘总结' },
  { key: 'generalChat', label: '通用对话' },
];

export function AdvancedSettingsPanel({
  settingsDraft,
  onSettingsDraftChange,
  onSaveSettings,
  savingSettings,
}: {
  settingsDraft: AppState['settings'];
  onSettingsDraftChange: Dispatch<SetStateAction<AppState['settings']>>;
  onSaveSettings: () => Promise<void>;
  savingSettings: boolean;
}) {
  const state = useAppStore();
  const refreshAdvancedSettingsData = useAppStore((store) => store.refreshAdvancedSettingsData);
  const refreshAiRuntimeSummary = useAppStore((store) => store.refreshAiRuntimeSummary);
  const refreshAiObservability = useAppStore((store) => store.refreshAiObservability);
  const [panelNotice, setPanelNotice] = useState<string | null>(null);

  useEffect(() => {
    void refreshAdvancedSettingsData();
  }, [refreshAdvancedSettingsData]);

  const aiRuntimeSummaryByCapability = useMemo(
    () => new Map(state.aiRuntimeSummary.map((item) => [item.capability, item])),
    [state.aiRuntimeSummary],
  );
  const aiObservabilityByCapability = useMemo(
    () => new Map(state.aiObservability.capabilitySummaries.map((item) => [item.capability, item])),
    [state.aiObservability.capabilitySummaries],
  );

  async function handleSaveAdvancedSettings() {
    setPanelNotice(null);
    try {
      await onSaveSettings();
      setPanelNotice('高级设置已保存，并同步刷新主进程 runtime 摘要。');
    } catch (error) {
      setPanelNotice(error instanceof Error ? error.message : '高级设置保存失败。');
    }
  }

  return (
    <details className="space-y-4 rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">高级设置</summary>
      <div className="mt-4 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] bg-slate-50 px-4 py-4">
          <div>
            <div className="text-sm font-medium text-slate-900">高级能力入口</div>
            <Muted className="mt-1">Provider、用途路由、运行时摘要、健康检查和最小观测性统一收在这里，不再占用默认设置页首屏。</Muted>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={secondaryButtonClassName} onClick={() => void refreshAdvancedSettingsData()}>
              <RefreshCcw className="h-4 w-4" />
              刷新高级数据
            </button>
            <button type="button" className={primaryButtonClassName} onClick={() => void handleSaveAdvancedSettings()} disabled={savingSettings}>
              保存高级设置
            </button>
          </div>
        </div>

        {panelNotice ? (
          <div className="rounded-[1.2rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {panelNotice}
          </div>
        ) : null}

        <Card>
          <SectionTitle>用途路由概览</SectionTitle>
          <Muted className="mt-2">AI capability 仍可单独路由到不同 Provider，但这些技术细节只保留在高级设置层。</Muted>
          <div className="mt-4 grid gap-3">
            {routingItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-[1.1rem] bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
                <select
                  className="w-52 rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  value={settingsDraft.routing[item.key]}
                  onChange={(event) => onSettingsDraftChange((current) => ({
                    ...current,
                    routing: {
                      ...current.routing,
                      [item.key]: event.target.value as ProviderId,
                    },
                  }))}
                >
                  {providerOptions.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle>AI 运行时</SectionTitle>
              <button type="button" className={secondaryButtonClassName} onClick={() => void refreshAiRuntimeSummary()}>
                刷新运行时
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {capabilityOptions.map((option) => (
                <AiRuntimeStatusCard
                  key={option.value}
                  label={option.label}
                  summary={aiRuntimeSummaryByCapability.get(option.value)}
                  observability={aiObservabilityByCapability.get(option.value)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle>观测摘要</SectionTitle>
              <button type="button" className={secondaryButtonClassName} onClick={() => void refreshAiObservability()}>
                刷新观测
              </button>
            </div>
            <Muted className="mt-2">只保留 capability、Provider、状态与耗时等最小观测信息。</Muted>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ObservabilityMetricCard label="总请求数" value={String(state.aiObservability.totalRequests)} tone="default" />
              <ObservabilityMetricCard label="成功" value={String(state.aiObservability.successCount)} tone="success" />
              <ObservabilityMetricCard label="失败" value={String(state.aiObservability.failureCount)} tone="warning" />
              <ObservabilityMetricCard label="最近请求" value={state.aiObservability.lastRequestedAt ? formatTimestamp(state.aiObservability.lastRequestedAt) : '暂无'} tone="default" />
            </div>
            <div className="mt-4 space-y-3">
              {state.aiObservability.capabilitySummaries.map((summary) => (
                <div key={summary.capability} className="rounded-[1.1rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{capabilityLabel(summary.capability)}</span>
                    <span>成功 {summary.successCount} / 失败 {summary.failureCount}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    最近状态：{requestLogStatusLabel(summary.lastStatus)} · 最近请求：{summary.lastRequestedAt ? formatTimestamp(summary.lastRequestedAt) : '暂无'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle>Provider 列表</SectionTitle>
          <Muted className="mt-2">支持启用开关、基础配置编辑、健康检查和 secret 管理。Codex 仍作为默认设置页的首要入口，其余 Provider 收敛在这里。</Muted>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {state.settings.providers.map((provider) => (
              <ProviderEditor key={provider.id} provider={provider} />
            ))}
          </div>
        </Card>
      </div>
    </details>
  );
}

function AiRuntimeStatusCard({
  label,
  summary,
  observability,
}: {
  label: string;
  summary: AiRuntimeSummaryItem | undefined;
  observability: AiCapabilityObservabilitySummary | undefined;
}) {
  const badgeLabel = !summary
    ? 'loading'
    : (!summary.ready
      ? 'blocked'
      : (summary.healthStatus === 'ready'
        ? 'healthy'
        : (summary.healthStatus === 'warning' ? 'warning' : 'configured')));
  const badgeClassName = !summary
    ? 'bg-slate-100 text-slate-700'
    : (!summary.ready
      ? 'bg-amber-100 text-amber-800'
      : providerHealthBadgeClassName(summary.healthStatus));

  return (
    <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{label}</div>
          <div className="mt-1 text-xs text-slate-500">
            {summary ? `${summary.providerLabel} · ${summary.model}` : '正在加载运行时摘要…'}
          </div>
        </div>
        <Badge className={badgeClassName}>{badgeLabel}</Badge>
      </div>
      <div className="mt-3 rounded-[1rem] bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
        {summary
          ? `route -> ${summary.providerId}${summary.blockedReason ? ` · ${summary.blockedReason}` : ' · 已具备统一 AI service 调用前置条件'}`
          : '等待 main process 返回当前 capability 的 route 与 readiness。'}
      </div>
      {summary ? (
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <div>健康状态：{providerHealthStatusLabel(summary.healthStatus)}{summary.healthHint ? ` · ${summary.healthHint}` : ''}</div>
          <div>最近请求：{observability?.totalRequests ? `${requestLogStatusLabel(observability.lastStatus)} · ${formatDuration(observability.lastDurationMs)}` : '尚无请求日志'}</div>
        </div>
      ) : null}
    </div>
  );
}

function ObservabilityMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'success' | 'warning';
}) {
  const className = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50'
    : (tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white');

  return (
    <div className={`rounded-[1.1rem] border px-4 py-4 ${className}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ProviderEditor({ provider }: { provider: ProviderConfig }) {
  const upsertProviderConfig = useAppStore((store) => store.upsertProviderConfig);
  const clearProviderSecret = useAppStore((store) => store.clearProviderSecret);
  const runProviderHealthCheck = useAppStore((store) => store.runProviderHealthCheck);
  const [draft, setDraft] = useState<ProviderConfigInput>({
    id: provider.id,
    label: provider.label,
    enabled: provider.enabled,
    endpoint: provider.endpoint,
    model: provider.model,
    authMode: provider.authMode,
    capabilityTags: provider.capabilityTags,
    healthStatus: provider.healthStatus,
  });
  const [secretDraft, setSecretDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'warning'>('info');

  useEffect(() => {
    setDraft({
      id: provider.id,
      label: provider.label,
      enabled: provider.enabled,
      endpoint: provider.endpoint,
      model: provider.model,
      authMode: provider.authMode,
      capabilityTags: provider.capabilityTags,
      healthStatus: provider.healthStatus,
    });
    setSecretDraft('');
  }, [provider]);

  const capabilitySet = useMemo(() => new Set(draft.capabilityTags), [draft.capabilityTags]);
  const usesLocalCodexLogin = draft.id === 'codex';
  const usesStaticSecret = draft.authMode !== 'none' && !usesLocalCodexLogin;

  const toggleCapability = (capability: ModelCapability) => {
    setDraft((current) => ({
      ...current,
      capabilityTags: current.capabilityTags.includes(capability)
        ? current.capabilityTags.filter((item) => item !== capability)
        : [...current.capabilityTags, capability],
    }));
  };

  async function onSave() {
    setSaving(true);
    setNotice(null);
    setNoticeTone('info');
    try {
      const normalizedDraft = usesLocalCodexLogin
        ? { ...draft, endpoint: '', authMode: 'none' as const }
        : draft;
      await upsertProviderConfig({ config: normalizedDraft, secret: usesStaticSecret && secretDraft.trim() ? secretDraft : undefined });
      setNotice(usesStaticSecret && secretDraft.trim() ? '配置与 secret 已保存，可继续执行一次健康检查确认连通性。' : '配置已保存。');
      setSecretDraft('');
    } catch (error) {
      setNoticeTone('warning');
      setNotice(error instanceof Error ? error.message : 'Provider 保存失败。');
    } finally {
      setSaving(false);
    }
  }

  async function onClearSecret() {
    setSaving(true);
    setNotice(null);
    setNoticeTone('info');
    try {
      await clearProviderSecret(provider.id);
      setSecretDraft('');
      setNotice('已清空本地保存的 secret。');
    } catch (error) {
      setNoticeTone('warning');
      setNotice(error instanceof Error ? error.message : '清空 secret 失败。');
    } finally {
      setSaving(false);
    }
  }

  async function onCheckHealth() {
    setCheckingHealth(true);
    setNotice(null);
    try {
      const result = await runProviderHealthCheck(provider.id);
      setNoticeTone(result.healthStatus === 'ready' ? 'success' : 'warning');
      setNotice(renderHealthCheckNotice(result));
    } catch (error) {
      setNoticeTone('warning');
      setNotice(error instanceof Error ? error.message : 'Provider 健康检查失败。');
    } finally {
      setCheckingHealth(false);
    }
  }

  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{provider.id}</div>
          <Muted className="mt-1">最近安全预览：{provider.keyPreview}</Muted>
        </div>
        <Badge className={draft.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>{draft.enabled ? '已启用' : '未启用'}</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        <Field label="展示名称"><input className={inputClassName} value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} /></Field>
        <Field label="Endpoint"><input className={inputClassName} value={draft.endpoint} placeholder={usesLocalCodexLogin ? 'Codex 登录型 Provider 不需要手动填写 Endpoint' : undefined} onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))} disabled={usesLocalCodexLogin} /></Field>
        <Field label="模型名"><input className={inputClassName} value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} /></Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="认证方式">
            <select className={inputClassName} value={usesLocalCodexLogin ? 'none' : draft.authMode} onChange={(event) => setDraft((current) => ({ ...current, authMode: event.target.value as ProviderConfigInput['authMode'] }))} disabled={usesLocalCodexLogin}>
              <option value="apiKey">API Key</option>
              <option value="bearer">Bearer</option>
              <option value="none">None</option>
            </select>
          </Field>
          <Field label="健康状态">
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2">
                <Badge className={providerHealthBadgeClassName(provider.healthStatus)}>{providerHealthStatusLabel(provider.healthStatus)}</Badge>
                <span className="text-xs text-slate-500">{providerHealthDescription(provider.healthStatus)}</span>
              </div>
            </div>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
          启用该 Provider
        </label>

        <Field label="能力标签">
          <div className="flex flex-wrap gap-2">
            {capabilityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={capabilitySet.has(option.value) ? 'rounded-full bg-slate-900 px-3 py-2 text-sm text-white' : 'rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700'}
                onClick={() => toggleCapability(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        {usesStaticSecret ? (
          <Field label="Secret（仅在填写时更新）">
            <input className={inputClassName} type="password" placeholder={provider.hasSecret ? '已有已保存 secret，如需更新请重新输入' : '输入 API Key / Token'} value={secretDraft} onChange={(event) => setSecretDraft(event.target.value)} />
          </Field>
        ) : (
          <div className="rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            {usesLocalCodexLogin ? '当前 Provider 会复用本机 `codex login` 登录态，不在应用内保存 API Key。若健康检查失败，请先确认本机 Codex 已登录且网络可访问。' : '当前 Provider 不需要手动填写 Secret。'}
          </div>
        )}

        <div className="text-xs text-slate-500">
          <div>安全状态：{usesStaticSecret ? (provider.hasSecret ? '已安全保存' : '未配置') : (usesLocalCodexLogin ? '复用本机 Codex 登录' : '无需 Secret')}</div>
          <div>连通性状态：{providerHealthStatusLabel(provider.healthStatus)}</div>
          <div>最近更新时间：{provider.updatedAt ?? '暂无'}</div>
        </div>

        {notice ? <div className={providerNoticeClassName(noticeTone)}>{notice}</div> : null}

        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={saving}>
            {saving ? '保存中…' : '保存 Provider'}
          </button>
          <button
            className={secondaryButtonClassName}
            type="button"
            onClick={() => {
              setDraft({ id: provider.id, label: provider.label, enabled: provider.enabled, endpoint: provider.endpoint, model: provider.model, authMode: provider.authMode, capabilityTags: provider.capabilityTags, healthStatus: provider.healthStatus });
              setSecretDraft('');
              setNoticeTone('info');
              setNotice('已恢复为最近一次持久化的值。');
            }}
            disabled={saving}
          >
            恢复
          </button>
          {usesStaticSecret ? <button className={secondaryButtonClassName} type="button" onClick={() => void onClearSecret()} disabled={saving || checkingHealth}>清空 Secret</button> : null}
          <button className={secondaryButtonClassName} type="button" onClick={() => void onCheckHealth()} disabled={saving || checkingHealth}>
            {checkingHealth ? '检查中…' : '检查连通性'}
          </button>
        </div>
      </div>
    </div>
  );
}

function capabilityLabel(capability: AiObservabilitySnapshot['capabilitySummaries'][number]['capability']) {
  return capabilityOptions.find((option) => option.value === capability)?.label ?? capability;
}

function requestLogStatusLabel(status: AiCapabilityObservabilitySummary['lastStatus']) {
  switch (status) {
    case 'success':
      return '成功';
    case 'error':
      return '失败';
    default:
      return '暂无';
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) {
    return '暂无';
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function providerHealthStatusLabel(status: ProviderConfig['healthStatus']) {
  switch (status) {
    case 'ready':
      return '已通过检查';
    case 'warning':
      return '存在风险';
    default:
      return '待检查';
  }
}

function providerHealthDescription(status: ProviderConfig['healthStatus']) {
  switch (status) {
    case 'ready':
      return '最近一次健康检查或真实调用成功。';
    case 'warning':
      return '最近一次健康检查或真实调用失败，建议先排查配置。';
    default:
      return '尚未执行健康检查。';
  }
}

function providerHealthBadgeClassName(status: ProviderConfig['healthStatus']) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-800';
    case 'warning':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function renderHealthCheckNotice(result: AiProviderHealthCheckResult) {
  return `${result.providerLabel}：${result.message}`;
}

function providerNoticeClassName(tone: 'info' | 'success' | 'warning') {
  switch (tone) {
    case 'success':
      return 'rounded-[1rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700';
    case 'warning':
      return 'rounded-[1rem] bg-amber-50 px-4 py-3 text-sm text-amber-800';
    default:
      return 'rounded-[1rem] bg-blue-50 px-4 py-3 text-sm text-blue-700';
  }
}
