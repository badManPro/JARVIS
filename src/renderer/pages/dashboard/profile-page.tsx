import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import {
  Field,
  MetricRow,
  PresetInputField,
  PresetMultiValueField,
  buildCoachStyleSummary,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  textareaClassName,
} from '@/pages/dashboard/shared';
import type { UserProfile } from '@shared/app-state';
import { onboardingFieldOptions } from '@shared/onboarding';

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
            <PresetInputField
              label="年龄阶段"
              value={draft.ageBracket}
              onChange={(value) => setDraft((current) => ({ ...current, ageBracket: value }))}
              options={onboardingFieldOptions.ageBracket}
              placeholder="例如：25-34 岁"
            />
            <Field label="当前水平"><textarea className={textareaClassName} rows={4} value={draft.identity} onChange={(event) => setDraft((current) => ({ ...current, identity: event.target.value }))} /></Field>
            <PresetInputField
              label="时间预算"
              value={draft.timeBudget}
              onChange={(value) => setDraft((current) => ({ ...current, timeBudget: value }))}
              options={onboardingFieldOptions.timeBudget}
              placeholder="例如：工作日 45 分钟，周末 2 小时"
            />
            <PresetInputField
              label="学习窗口"
              value={draft.bestStudyWindow}
              onChange={(value) => setDraft((current) => ({ ...current, bestStudyWindow: value }))}
              options={onboardingFieldOptions.bestStudyWindow}
              placeholder="例如：工作日晚间 20:30 - 21:15"
            />
            <PresetInputField
              label="节奏偏好"
              value={draft.pacePreference}
              onChange={(value) => setDraft((current) => ({ ...current, pacePreference: value }))}
              options={onboardingFieldOptions.pacePreference}
              placeholder="例如：先用 30-45 分钟的小步快跑"
            />
            <PresetInputField
              label="MBTI"
              value={draft.mbti}
              onChange={(value) => setDraft((current) => ({ ...current, mbti: value.toUpperCase() }))}
              options={onboardingFieldOptions.mbti}
              placeholder="例如：INTJ"
            />
            <PresetInputField
              label="可选性别"
              value={draft.gender}
              onChange={(value) => setDraft((current) => ({ ...current, gender: value }))}
              options={onboardingFieldOptions.gender}
              placeholder="不填也可以"
            />
            <PresetMultiValueField
              label="性格关键词"
              values={draft.personalityTraits}
              onChange={(values) => setDraft((current) => ({ ...current, personalityTraits: values }))}
              options={onboardingFieldOptions.personalityTraits}
              placeholder="每行一个，例如：需要明确反馈"
            />
            <PresetInputField
              label="激励方式"
              value={draft.motivationStyle}
              onChange={(value) => setDraft((current) => ({ ...current, motivationStyle: value }))}
              options={onboardingFieldOptions.motivationStyle}
              placeholder="例如：看到明确里程碑更有动力"
              multiline
              rows={4}
            />
            <PresetInputField
              label="压力偏好"
              value={draft.stressResponse}
              onChange={(value) => setDraft((current) => ({ ...current, stressResponse: value }))}
              options={onboardingFieldOptions.stressResponse}
              placeholder="例如：先做低阻力任务恢复节奏"
              multiline
              rows={4}
            />
            <PresetInputField
              label="反馈方式"
              value={draft.feedbackPreference}
              onChange={(value) => setDraft((current) => ({ ...current, feedbackPreference: value }))}
              options={onboardingFieldOptions.feedbackPreference}
              placeholder="例如：直接、简短，并明确下一步动作"
              multiline
              rows={4}
            />
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
