import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Badge, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { Field, ghostButtonClassName, inputClassName, primaryButtonClassName, secondaryButtonClassName, textareaClassName } from '@/pages/dashboard/shared';
import type {
  ReflectionDifficultyFit,
  ReflectionEntry,
  ReflectionPeriod,
  ReflectionTimeFit,
  SaveReflectionEntryInput,
  TaskStatus,
} from '@shared/app-state';

const reflectionDifficultyOptions: Array<{ value: ReflectionDifficultyFit; label: string }> = [
  { value: 'too_easy', label: '偏简单' },
  { value: 'matched', label: '基本匹配' },
  { value: 'too_hard', label: '偏困难' },
];

const reflectionTimeOptions: Array<{ value: ReflectionTimeFit; label: string }> = [
  { value: 'insufficient', label: '时间不足' },
  { value: 'matched', label: '时间匹配' },
  { value: 'overflow', label: '时间有余量' },
];

const reflectionScoreOptions = [1, 2, 3, 4, 5];

export function ReflectionSheet({
  open,
  period,
  contextTitle,
  contextStatus,
  onClose,
  onSaved,
}: {
  open: boolean;
  period: ReflectionPeriod;
  contextTitle?: string;
  contextStatus?: Exclude<TaskStatus, 'todo' | 'in_progress'>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const reflection = useAppStore((state) => state.reflection);
  const saveReflectionEntry = useAppStore((state) => state.saveReflectionEntry);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedEntry = useMemo(
    () => getReflectionEntry(reflection.entries, period),
    [reflection.entries, period],
  );
  const [draft, setDraft] = useState<SaveReflectionEntryInput | null>(selectedEntry ? createReflectionDraft(selectedEntry) : null);

  useEffect(() => {
    if (!open || !selectedEntry) {
      return;
    }

    setDraft(createReflectionDraft(selectedEntry));
    setNotice(null);
  }, [open, selectedEntry?.period, selectedEntry?.updatedAt, selectedEntry]);

  if (!open || !draft || !selectedEntry) {
    return null;
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    const nextDraft = draft;
    setSaving(true);
    setNotice(null);

    try {
      await saveReflectionEntry(nextDraft);
      onSaved(`${selectedEntry.label}已保存，后续路径建议会结合这条反馈更新。`);
      onClose();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存复盘输入失败。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm lg:items-center">
      <div className="w-full max-w-[42rem] rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,250,244,0.98)_0%,_rgba(247,248,251,0.98)_100%)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="bg-white/85 text-slate-700">{selectedEntry.label}</Badge>
            <SectionTitle className="mt-4 text-3xl">任务刚发生变化，顺手留下一条上下文复盘</SectionTitle>
            <Muted className="mt-3">
              {contextTitle
                ? `本次聚焦任务：${contextTitle}${contextStatus ? ` · 当前状态 ${taskStatusLabel(contextStatus)}` : ''}。`
                : '这条复盘会直接写入现有结构化 reflection 数据，并影响后续节奏建议。'}
            </Muted>
          </div>
          <button type="button" className={ghostButtonClassName} onClick={onClose} aria-label="关闭复盘弹层">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <Field label="问题归因 / 偏差说明">
            <textarea
              className={textareaClassName}
              rows={3}
              placeholder="例如：工作日可投入时间下降，导致原计划节奏偏重。"
              value={draft.obstacle}
              onChange={(event) => setDraft((current) => (current ? { ...current, obstacle: event.target.value } : current))}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="任务难度是否匹配">
              <select
                className={inputClassName}
                value={draft.difficultyFit}
                onChange={(event) => setDraft((current) => (current ? { ...current, difficultyFit: event.target.value as ReflectionDifficultyFit } : current))}
              >
                {reflectionDifficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="时间分配是否合理">
              <select
                className={inputClassName}
                value={draft.timeFit}
                onChange={(event) => setDraft((current) => (current ? { ...current, timeFit: event.target.value as ReflectionTimeFit } : current))}
              >
                {reflectionTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <ReflectionScoreField
              label="心情 / 压力"
              value={draft.moodScore}
              onChange={(value) => setDraft((current) => (current ? { ...current, moodScore: value } : current))}
            />
            <ReflectionScoreField
              label="自信度"
              value={draft.confidenceScore}
              onChange={(value) => setDraft((current) => (current ? { ...current, confidenceScore: value } : current))}
            />
            <ReflectionScoreField
              label="主观成就感"
              value={draft.accomplishmentScore}
              onChange={(value) => setDraft((current) => (current ? { ...current, accomplishmentScore: value } : current))}
            />
          </div>

          <Field label="复盘结论">
            <textarea
              className={textareaClassName}
              rows={3}
              placeholder="这一轮最该保留什么、最该调整什么？"
              value={draft.insight}
              onChange={(event) => setDraft((current) => (current ? { ...current, insight: event.target.value } : current))}
            />
          </Field>

          <Field label="后续动作（每行一条）">
            <textarea
              className={textareaClassName}
              rows={3}
              placeholder={'例如：\n把单次任务压到 30 分钟内\n先补一个低阻力前置动作'}
              value={draft.followUpActions.join('\n')}
              onChange={(event) => setDraft((current) => (
                current
                  ? {
                    ...current,
                    followUpActions: event.target.value
                      .split('\n')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }
                  : current
              ))}
            />
          </Field>

          {notice ? (
            <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {notice}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={secondaryButtonClassName} onClick={onClose} disabled={saving}>
              稍后再填
            </button>
            <button type="button" className={primaryButtonClassName} onClick={() => void handleSave()} disabled={saving}>
              {saving ? '保存中…' : '保存复盘'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function createReflectionDraft(entry: ReflectionEntry): SaveReflectionEntryInput {
  return {
    period: entry.period,
    obstacle: entry.obstacle,
    difficultyFit: entry.difficultyFit,
    timeFit: entry.timeFit,
    moodScore: entry.moodScore,
    confidenceScore: entry.confidenceScore,
    accomplishmentScore: entry.accomplishmentScore,
    insight: entry.insight,
    followUpActions: [...entry.followUpActions],
  };
}

function getReflectionEntry(entries: ReflectionEntry[], period: ReflectionPeriod) {
  return entries.find((entry) => entry.period === period) ?? entries[0] ?? null;
}

function ReflectionScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-5 gap-2">
        {reflectionScoreOptions.map((score) => {
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              className={[
                'neo-button px-0 py-2 text-sm font-medium transition',
                selected ? 'neo-button-primary text-white' : 'text-slate-700',
              ].join(' ')}
              onClick={() => onChange(score)}
            >
              {score}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function taskStatusLabel(status: Exclude<TaskStatus, 'todo' | 'in_progress'>) {
  switch (status) {
    case 'done':
      return '已完成';
    case 'delayed':
      return '已延后';
    case 'skipped':
      return '已跳过';
    default:
      return status;
  }
}
