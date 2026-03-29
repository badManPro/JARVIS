import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import {
  Field,
  MetricRow,
  buildCoachStyleSummary,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  splitLines,
  textareaClassName,
} from '@/pages/dashboard/shared';
import type { UserProfile } from '@shared/app-state';

export function ProfilePage() {
  const profile = useAppStore((state) => state.profile);
  const saveUserProfile = useAppStore((state) => state.saveUserProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserProfile>(profile);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  async function onSave() {
    setSaving(true);
    setNotice(null);
    try {
      await saveUserProfile({
        ...draft,
        strengths: splitLines(draft.strengths.join('\n')),
        blockers: splitLines(draft.blockers.join('\n')),
        planImpact: splitLines(draft.planImpact.join('\n')),
        personalityTraits: splitLines(draft.personalityTraits.join('\n')),
      });
      setEditing(false);
      setNotice('学习档案已更新。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  }

  const coachStyleSummary = buildCoachStyleSummary(profile);

  return (
    <div className="space-y-5">
      <Card className="bg-[radial-gradient(circle_at_top_left,_rgba(254,240,138,0.28),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(250,248,244,0.98)_100%)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="bg-white/90 text-slate-700">学习人物画像</Badge>
            <SectionTitle className="mt-4 text-3xl">学习背景决定边界，人物特征决定陪伴方式</SectionTitle>
            <Muted className="mt-3 text-base leading-7">
              年龄阶段、性格和 MBTI 不直接决定目标强度，但会影响系统如何拆任务、给反馈和提醒你继续推进。
            </Muted>
          </div>
          <button type="button" className={editing ? secondaryButtonClassName : primaryButtonClassName} onClick={() => setEditing((current) => !current)}>
            {editing ? '收起编辑' : '展开编辑'}
          </button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <SectionTitle>学习背景</SectionTitle>
          <div className="mt-4 space-y-3">
            <MetricRow label="当前水平" value={profile.identity || '未填写'} compact />
            <MetricRow label="时间预算" value={profile.timeBudget || '未填写'} compact />
            <MetricRow label="学习窗口" value={profile.bestStudyWindow || '未填写'} compact />
          </div>
        </Card>
        <Card>
          <SectionTitle>人物特征</SectionTitle>
          <div className="mt-4 space-y-3">
            <MetricRow label="年龄阶段" value={profile.ageBracket || '未填写'} compact />
            <MetricRow label="MBTI" value={profile.mbti || '未填写'} compact />
            <MetricRow label="性格关键词" value={profile.personalityTraits.join(' / ') || '未填写'} compact />
            <MetricRow label="压力偏好" value={profile.stressResponse || '未填写'} compact />
          </div>
        </Card>
        <Card>
          <SectionTitle>系统如何使用</SectionTitle>
          <div className="mt-4 space-y-3">
            {(coachStyleSummary.length ? coachStyleSummary : ['会根据你的节奏和反馈偏好，调整提醒方式与任务拆解粒度。']).map((item) => (
              <div key={item} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{item}</div>
            ))}
          </div>
        </Card>
      </div>

      {editing ? (
        <Card>
          <SectionTitle>编辑档案</SectionTitle>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="名字"><input className={inputClassName} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label="年龄阶段"><input className={inputClassName} value={draft.ageBracket} onChange={(event) => setDraft((current) => ({ ...current, ageBracket: event.target.value }))} /></Field>
            <Field label="当前水平"><textarea className={textareaClassName} rows={4} value={draft.identity} onChange={(event) => setDraft((current) => ({ ...current, identity: event.target.value }))} /></Field>
            <Field label="时间预算"><input className={inputClassName} value={draft.timeBudget} onChange={(event) => setDraft((current) => ({ ...current, timeBudget: event.target.value }))} /></Field>
            <Field label="学习窗口"><input className={inputClassName} value={draft.bestStudyWindow} onChange={(event) => setDraft((current) => ({ ...current, bestStudyWindow: event.target.value }))} /></Field>
            <Field label="节奏偏好"><input className={inputClassName} value={draft.pacePreference} onChange={(event) => setDraft((current) => ({ ...current, pacePreference: event.target.value }))} /></Field>
            <Field label="MBTI"><input className={inputClassName} value={draft.mbti} onChange={(event) => setDraft((current) => ({ ...current, mbti: event.target.value.toUpperCase() }))} /></Field>
            <Field label="可选性别"><input className={inputClassName} value={draft.gender} onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value }))} /></Field>
            <Field label="性格关键词（每行一个）"><textarea className={textareaClassName} rows={4} value={draft.personalityTraits.join('\n')} onChange={(event) => setDraft((current) => ({ ...current, personalityTraits: splitLines(event.target.value) }))} /></Field>
            <Field label="激励方式"><textarea className={textareaClassName} rows={4} value={draft.motivationStyle} onChange={(event) => setDraft((current) => ({ ...current, motivationStyle: event.target.value }))} /></Field>
            <Field label="压力偏好"><textarea className={textareaClassName} rows={4} value={draft.stressResponse} onChange={(event) => setDraft((current) => ({ ...current, stressResponse: event.target.value }))} /></Field>
            <Field label="反馈方式"><textarea className={textareaClassName} rows={4} value={draft.feedbackPreference} onChange={(event) => setDraft((current) => ({ ...current, feedbackPreference: event.target.value }))} /></Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={primaryButtonClassName} onClick={() => void onSave()} disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              保存档案
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => { setDraft(profile); setEditing(false); }} disabled={saving}>
              取消
            </button>
          </div>
        </Card>
      ) : null}

      {notice ? <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}
    </div>
  );
}
