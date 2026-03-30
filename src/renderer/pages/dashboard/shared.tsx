import type { ReactNode } from 'react';
import type { CodexAuthStatus } from '@shared/codex-auth';
import type {
  AppState,
  LearningGoal,
  LearningPlanDraft,
  TaskStatus,
  UserProfile,
} from '@shared/app-state';
import type { OnboardingPresetOption } from '@shared/onboarding';

export const inputClassName = 'neo-input w-full rounded-[1.1rem] px-4 py-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60';
export const textareaClassName = 'neo-input w-full resize-y rounded-[1.1rem] px-4 py-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60';
export const primaryButtonClassName = 'neo-button neo-button-primary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60';
export const secondaryButtonClassName = 'neo-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60';
export const dangerButtonClassName = 'neo-button neo-button-danger inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60';
export const ghostButtonClassName = 'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-900';
export const sectionCardClassName = 'space-y-4 rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]';
export const startPageOptions = ['今日', '学习路径', '学习档案', '设置'];
export const themeOptions = ['跟随系统', '浅色', '深色'];
export const presetChipClassName = (active: boolean) => [
  'rounded-full border px-3 py-2 text-sm transition',
  active ? 'border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]' : 'border-white/80 bg-white/88 text-slate-700 hover:border-slate-300 hover:text-slate-900',
].join(' ');

export function normalizeStartPageLabel(value: string) {
  switch (value) {
    case '首页':
    case '对话':
    case '复盘':
      return '今日';
    case '学习计划':
    case '目标':
      return '学习路径';
    case '用户画像':
      return '学习档案';
    case '设置':
    case '今日':
    case '学习路径':
    case '学习档案':
      return value;
    default:
      return '今日';
  }
}

export function splitLines(value: string) {
  return Array.from(new Set(
    value
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ));
}

export function getActiveGoal(goals: LearningGoal[], activeGoalId: string) {
  return goals.find((goal) => goal.id === activeGoalId) ?? goals[0] ?? null;
}

export function getActiveDraft(plan: AppState['plan']) {
  return plan.drafts.find((draft) => draft.goalId === plan.activeGoalId) ?? plan.drafts[0] ?? null;
}

export function getFocusTask(draft: LearningPlanDraft | null) {
  if (!draft) {
    return null;
  }

  return draft.tasks.find((task) => task.status === 'in_progress')
    ?? draft.tasks.find((task) => task.status === 'todo')
    ?? draft.tasks[0]
    ?? null;
}

export function taskStatusLabel(status: TaskStatus) {
  switch (status) {
    case 'done':
      return '已完成';
    case 'in_progress':
      return '进行中';
    case 'delayed':
      return '已延后';
    case 'skipped':
      return '已跳过';
    case 'todo':
    default:
      return '待开始';
  }
}

export function taskStatusBadgeClassName(status: TaskStatus) {
  switch (status) {
    case 'done':
      return 'bg-emerald-100 text-emerald-800';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800';
    case 'delayed':
      return 'bg-rose-100 text-rose-800';
    case 'skipped':
      return 'bg-slate-200 text-slate-700';
    case 'todo':
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export function riskBadgeClassName(level: AppState['dashboard']['riskSignals'][number]['level']) {
  switch (level) {
    case 'high':
      return 'bg-rose-100 text-rose-800';
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    case 'low':
    default:
      return 'bg-emerald-100 text-emerald-800';
  }
}

export function codexStateLabel(state: CodexAuthStatus['state']) {
  switch (state) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中';
    case 'expired':
      return '已失效';
    case 'unavailable':
      return '不可用';
    case 'disconnected':
    default:
      return '未连接';
  }
}

export function buildCoachStyleSummary(profile: UserProfile) {
  return [
    profile.mbti ? `对话语气会参考 ${profile.mbti} 的思考节奏` : null,
    profile.feedbackPreference ? `反馈方式偏向 ${profile.feedbackPreference}` : null,
    profile.pacePreference ? `任务拆解会遵循「${profile.pacePreference}」` : null,
    profile.stressResponse ? `压力波动时优先采用「${profile.stressResponse}」` : null,
    profile.planningStyle ? `默认按「${profile.planningStyle}」拆解学习动作` : null,
    profile.autonomyPreference ? `自动调整策略为「${profile.autonomyPreference}」` : null,
  ].filter(Boolean) as string[];
}

export function buildPlanningConfirmationRows(profile: UserProfile) {
  return [
    { label: '拆解方式', value: profile.planningStyle || '未确认' },
    { label: '决策支持', value: profile.decisionSupportLevel || '未确认' },
    { label: '反馈语气', value: profile.feedbackTone || '未确认' },
    { label: '自动调整', value: profile.autonomyPreference || '未确认' },
  ];
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      {children}
    </label>
  );
}

export function MetricRow({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[1.2rem] ${compact ? 'bg-slate-50' : 'bg-white/85'} px-4 py-3`}>
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-slate-900">{value}</div>
    </div>
  );
}

export function PresetInputField({
  label,
  value,
  onChange,
  options,
  placeholder,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: OnboardingPresetOption[];
  placeholder: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={`${label}-${option.label}-${option.value || 'empty'}`}
              type="button"
              className={presetChipClassName(option.value === value)}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {multiline ? (
          <textarea
            className={textareaClassName}
            rows={rows}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            className={inputClassName}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        )}
        <div className="text-xs text-slate-500">优先点选常用选项；如果都不合适，再手动填写。</div>
      </div>
    </Field>
  );
}

export function PresetMultiValueField({
  label,
  values,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: OnboardingPresetOption[];
  placeholder: string;
}) {
  return (
    <Field label={label}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = values.includes(option.value);
            return (
              <button
                key={`${label}-${option.label}-${option.value}`}
                type="button"
                className={presetChipClassName(active)}
                onClick={() => onChange(active ? values.filter((item) => item !== option.value) : [...values, option.value])}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <textarea
          className={textareaClassName}
          rows={4}
          value={values.join('\n')}
          onChange={(event) => onChange(splitLines(event.target.value))}
          placeholder={placeholder}
        />
        <div className="text-xs text-slate-500">可多选，也可直接手动补充；每行会被视为一个关键词。</div>
      </div>
    </Field>
  );
}
