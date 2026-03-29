import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle, Sparkles, X } from 'lucide-react';
import { Badge, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import {
  Field,
  PresetInputField,
  PresetMultiValueField,
  getActiveDraft,
  getActiveGoal,
  ghostButtonClassName,
  inputClassName,
  presetChipClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  sectionCardClassName,
  textareaClassName,
} from '@/pages/dashboard/shared';
import type { TodayPlan } from '@shared/app-state';
import type { CompleteInitialOnboardingResult } from '@shared/onboarding';
import { changeQuickActionOptions, onboardingFieldOptions } from '@shared/onboarding';

type OnboardingFlowStage = 'editing' | 'generating' | 'result_summary';

const onboardingGenerationSteps = [
  {
    title: '整理画像',
    detail: '先把你的时间预算、学习窗口和反馈偏好整理成可用于规划的学习画像。',
  },
  {
    title: '确认目标',
    detail: '系统会把你现在最想推进的方向固化为一个当前主目标，并补齐首轮周期。',
  },
  {
    title: '生成路径',
    detail: '根据画像和目标产出第一版学习路径，优先给出周里程碑和关键节点。',
  },
];

const changeQuickActionLabels = ['时间变少了', '学习窗口变了', '目标变了', '希望反馈更直接'];

export function CoachDrawer({
  open,
  onClose,
  onPageChange,
}: {
  open: boolean;
  onClose: () => void;
  onPageChange: (pageId: string) => void;
}) {
  const profile = useAppStore((state) => state.profile);
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const completeInitialOnboarding = useAppStore((state) => state.completeInitialOnboarding);
  const appendConversationMessage = useAppStore((state) => state.appendConversationMessage);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const currentMilestone = activeDraft?.milestones.find((item) => item.status === 'current') ?? activeDraft?.milestones[0] ?? null;
  const isFirstRun = !profile.identity.trim() || !profile.timeBudget.trim() || !goals.length;

  const [goalTitle, setGoalTitle] = useState(activeGoal?.title ?? '');
  const [baseline, setBaseline] = useState(profile.identity);
  const [timeBudget, setTimeBudget] = useState(profile.timeBudget);
  const [studyWindow, setStudyWindow] = useState(profile.bestStudyWindow);
  const [goalCycle, setGoalCycle] = useState(activeGoal?.cycle ?? '6 周');
  const [ageBracket, setAgeBracket] = useState(profile.ageBracket);
  const [gender, setGender] = useState(profile.gender);
  const [pacePreference, setPacePreference] = useState(profile.pacePreference);
  const [personalityTraits, setPersonalityTraits] = useState(profile.personalityTraits);
  const [mbti, setMbti] = useState(profile.mbti);
  const [motivationStyle, setMotivationStyle] = useState(profile.motivationStyle);
  const [stressResponse, setStressResponse] = useState(profile.stressResponse);
  const [feedbackPreference, setFeedbackPreference] = useState(profile.feedbackPreference);
  const [changeNote, setChangeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [onboardingStage, setOnboardingStage] = useState<OnboardingFlowStage>('editing');
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [onboardingResult, setOnboardingResult] = useState<CompleteInitialOnboardingResult | null>(null);

  useEffect(() => {
    if (!open) {
      setNotice(null);
      setOnboardingStage('editing');
      setOnboardingResult(null);
      setGenerationStepIndex(0);
      return;
    }

    setGoalTitle(activeGoal?.title ?? '');
    setBaseline(profile.identity);
    setTimeBudget(profile.timeBudget);
    setStudyWindow(profile.bestStudyWindow);
    setGoalCycle(activeGoal?.cycle ?? '6 周');
    setAgeBracket(profile.ageBracket);
    setGender(profile.gender);
    setPacePreference(profile.pacePreference);
    setPersonalityTraits(profile.personalityTraits);
    setMbti(profile.mbti);
    setMotivationStyle(profile.motivationStyle);
    setStressResponse(profile.stressResponse);
    setFeedbackPreference(profile.feedbackPreference);
    setChangeNote('');
    setNotice(null);
  }, [open, activeGoal, profile]);

  useEffect(() => {
    if (onboardingStage !== 'generating') {
      return;
    }

    setGenerationStepIndex(0);
    const timer = window.setInterval(() => {
      setGenerationStepIndex((current) => (current < onboardingGenerationSteps.length - 1 ? current + 1 : current));
    }, 900);

    return () => window.clearInterval(timer);
  }, [onboardingStage]);

  if (!open) {
    return null;
  }

  async function handleStartOnboarding() {
    if (!goalTitle.trim() || !baseline.trim() || !timeBudget.trim()) {
      setNotice('先补齐想学什么、当前水平和时间预算。');
      return;
    }

    setSubmitting(true);
    setNotice(null);
    setOnboardingStage('generating');

    try {
      const result = await completeInitialOnboarding({
        goalTitle: goalTitle.trim(),
        baseline: baseline.trim(),
        timeBudget: timeBudget.trim(),
        bestStudyWindow: studyWindow.trim(),
        pacePreference: pacePreference.trim(),
        ageBracket: ageBracket.trim(),
        gender: gender.trim(),
        personalityTraits,
        mbti: mbti.trim().toUpperCase(),
        motivationStyle: motivationStyle.trim(),
        stressResponse: stressResponse.trim(),
        feedbackPreference: feedbackPreference.trim(),
        cycle: goalCycle.trim() || '6 周',
      });
      setOnboardingResult(result);
      setOnboardingStage('result_summary');
    } catch (error) {
      setOnboardingStage('editing');
      setNotice(error instanceof Error ? error.message : '建档失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveChange() {
    if (!changeNote.trim()) {
      setNotice('先描述最近发生了什么变化。');
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      await appendConversationMessage({ content: changeNote.trim() });
      const nextState = useAppStore.getState();
      const nextDraft = getActiveDraft(nextState.plan);
      const nextPageId = getPreferredPageId(nextState.conversation.tags, nextDraft?.todayPlan?.status);

      setChangeNote('');
      onClose();
      onPageChange(nextPageId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存变化失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCompleteOnboarding() {
    setOnboardingStage('editing');
    setOnboardingResult(null);
    onClose();
    onPageChange('path');
  }

  if (isFirstRun && onboardingStage === 'generating') {
    return <OnboardingGeneratingOverlay generationStepIndex={generationStepIndex} />;
  }

  if (isFirstRun && onboardingStage === 'result_summary' && onboardingResult) {
    return (
      <OnboardingResultOverlay
        result={onboardingResult}
        onClose={() => {
          setOnboardingStage('editing');
          setOnboardingResult(null);
          onClose();
        }}
        onPrimary={handleCompleteOnboarding}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm">
      <div className="h-full w-full max-w-[34rem] overflow-y-auto border-l border-white/70 bg-[linear-gradient(180deg,_rgba(255,250,244,0.96)_0%,_rgba(247,248,251,0.98)_100%)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="bg-white/85 text-slate-700">{isFirstRun ? '首次建档' : '我有变化'}</Badge>
            <SectionTitle className="mt-4 text-3xl">
              {isFirstRun ? '先回答几句，系统再生成你的第一版粗版路径' : '记录变化，然后回到正确的页面处理'}
            </SectionTitle>
            <Muted className="mt-3">
              {isFirstRun
                ? '首次建档只生成粗版学习路径。生成完成后默认进入学习路径，再由你决定今天要不要生成细版计划。'
                : '这里现在只负责录入变化。提交后会自动标记受影响的页面，并带你回到学习路径或今日页继续处理。'}
            </Muted>
          </div>
          <button type="button" className={ghostButtonClassName} onClick={onClose} aria-label="关闭教练入口">
            <X className="h-4 w-4" />
          </button>
        </div>

        {notice ? (
          <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {notice}
          </div>
        ) : null}

        {isFirstRun ? (
          <div className="mt-6 space-y-5">
            <div className={sectionCardClassName}>
              <Field label="1. 你现在最想学什么">
                <input
                  className={inputClassName}
                  value={goalTitle}
                  onChange={(event) => setGoalTitle(event.target.value)}
                  placeholder="例如：Python + AI 应用开发"
                />
              </Field>
              <Field label="2. 你现在大概到什么水平">
                <textarea
                  className={textareaClassName}
                  rows={4}
                  value={baseline}
                  onChange={(event) => setBaseline(event.target.value)}
                  placeholder="例如：前端经验较强，Python 和数据层较弱。"
                />
              </Field>
              <PresetInputField
                label="3. 你每周或每天能投入多少"
                value={timeBudget}
                onChange={setTimeBudget}
                options={onboardingFieldOptions.timeBudget}
                placeholder="例如：工作日 45 分钟，周末 2 小时"
              />
            </div>

            <details className={sectionCardClassName}>
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">增强画像（可选）：学习窗口、性格、MBTI、反馈偏好</summary>
              <div className="mt-4 grid gap-4">
                <PresetInputField
                  label="年龄阶段"
                  value={ageBracket}
                  onChange={setAgeBracket}
                  options={onboardingFieldOptions.ageBracket}
                  placeholder="例如：25-34 岁"
                />
                <PresetInputField
                  label="可选性别"
                  value={gender}
                  onChange={setGender}
                  options={onboardingFieldOptions.gender}
                  placeholder="不填也可以"
                />
                <PresetInputField
                  label="常见学习窗口"
                  value={studyWindow}
                  onChange={setStudyWindow}
                  options={onboardingFieldOptions.bestStudyWindow}
                  placeholder="例如：工作日晚间 20:30 - 21:15"
                />
                <PresetInputField
                  label="节奏偏好"
                  value={pacePreference}
                  onChange={setPacePreference}
                  options={onboardingFieldOptions.pacePreference}
                  placeholder="例如：先用 30-45 分钟的小步快跑"
                />
                <PresetMultiValueField
                  label="性格关键词"
                  values={personalityTraits}
                  onChange={setPersonalityTraits}
                  options={onboardingFieldOptions.personalityTraits}
                  placeholder="每行一个，例如：需要明确反馈"
                />
                <PresetInputField
                  label="MBTI"
                  value={mbti}
                  onChange={(value) => setMbti(value.toUpperCase())}
                  options={onboardingFieldOptions.mbti}
                  placeholder="例如：INTJ"
                />
                <PresetInputField
                  label="偏好的激励方式"
                  value={motivationStyle}
                  onChange={setMotivationStyle}
                  options={onboardingFieldOptions.motivationStyle}
                  placeholder="例如：看到明确里程碑更有动力"
                  multiline
                  rows={4}
                />
                <PresetInputField
                  label="压力波动时更需要什么"
                  value={stressResponse}
                  onChange={setStressResponse}
                  options={onboardingFieldOptions.stressResponse}
                  placeholder="例如：先做低阻力任务恢复节奏"
                  multiline
                  rows={4}
                />
                <PresetInputField
                  label="你希望收到什么样的提醒和反馈"
                  value={feedbackPreference}
                  onChange={setFeedbackPreference}
                  options={onboardingFieldOptions.feedbackPreference}
                  placeholder="例如：直接、简短，并明确下一步动作"
                  multiline
                  rows={4}
                />
                <Field label="计划周期（可选）">
                  <input
                    className={inputClassName}
                    value={goalCycle}
                    onChange={(event) => setGoalCycle(event.target.value)}
                    placeholder="例如：6 周"
                  />
                </Field>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClassName} onClick={() => void handleStartOnboarding()} disabled={submitting}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                生成第一版粗版路径
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={onClose} disabled={submitting}>
                稍后再说
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className={sectionCardClassName}>
              <div className="text-sm font-medium text-slate-900">当前上下文</div>
              <Muted className="mt-2">
                当前主目标：{activeGoal?.title ?? '尚未生成'}。当前关键节点：{currentMilestone?.title ?? '等待粗版路径生成'}。
              </Muted>
              {currentMilestone ? (
                <div className="mt-4 rounded-[1.25rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                  <div className="font-medium text-slate-900">{currentMilestone.title}</div>
                  <div className="mt-1">聚焦：{currentMilestone.focus}</div>
                  <div className="mt-1">完成标志：{currentMilestone.outcome}</div>
                </div>
              ) : null}
            </div>

            <div className={sectionCardClassName}>
              <div className="text-sm font-medium text-slate-900">快捷变化</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {changeQuickActionOptions
                  .filter((option) => changeQuickActionLabels.includes(option.label))
                  .map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className={presetChipClassName(changeNote.includes(option.value))}
                      onClick={() => setChangeNote((current) => appendQuickAction(current, option.value))}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
              <textarea
                className={`${textareaClassName} mt-4`}
                rows={8}
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                placeholder="例如：今天只有 30 分钟；今晚只能在 21:00 之后学；Python 基础其实已经会一半；我希望后续反馈更直接。"
              />
            </div>

            <div className={sectionCardClassName}>
              <div className="text-sm font-medium text-slate-900">提交后会发生什么</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                <div>1. 先把你的变化写入本地记录，并标记受影响的计划状态。</div>
                <div>2. 如果是时间、窗口、节奏变化，会把今日计划标记为过期。</div>
                <div>3. 如果是目标方向变化，会把粗版路径标记为过期，并引导你回到学习路径重生成。</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClassName} onClick={() => void handleSaveChange()} disabled={submitting}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                提交变化
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={onClose} disabled={submitting}>
                先不处理
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingGeneratingOverlay({ generationStepIndex }: { generationStepIndex: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,229,201,0.66),_transparent_38%),linear-gradient(180deg,_rgba(251,247,241,0.98)_0%,_rgba(243,247,251,0.98)_100%)] px-5">
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/80 bg-white/88 p-8 shadow-[0_36px_100px_rgba(15,23,42,0.12)]">
        <Badge className="bg-slate-900 text-white">AI 生成中</Badge>
        <SectionTitle className="mt-5 text-4xl">系统正在整理你的首版学习路径</SectionTitle>
        <Muted className="mt-3 text-base leading-7">这里展示的是用户可理解的生成阶段，不展示原始推理。请稍等片刻，系统会先整理画像，再确认目标，最后生成路径。</Muted>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {onboardingGenerationSteps.map((step, index) => {
            const status = index < generationStepIndex ? 'done' : index === generationStepIndex ? 'current' : 'pending';
            return (
              <div key={step.title} className={`rounded-[1.5rem] border px-5 py-5 ${status === 'current' ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]' : 'border-white/80 bg-white/90 text-slate-900'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${status === 'current' ? 'bg-white/15 text-white' : status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <LoaderCircle className={`h-5 w-5 ${status === 'current' ? 'animate-spin' : ''}`} />}
                  </div>
                  <div className="text-sm font-medium">{step.title}</div>
                </div>
                <div className={status === 'current' ? 'mt-4 text-sm leading-6 text-white/80' : 'mt-4 text-sm leading-6 text-slate-600'}>{step.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OnboardingResultOverlay({
  result,
  onClose,
  onPrimary,
}: {
  result: CompleteInitialOnboardingResult;
  onClose: () => void;
  onPrimary: () => void;
}) {
  const activeGoal = getActiveGoal(result.state.goals, result.state.plan.activeGoalId);
  const activeDraft = getActiveDraft(result.state.plan);
  const firstMilestone = activeDraft?.milestones[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(220,234,255,0.72),_transparent_34%),linear-gradient(180deg,_rgba(248,244,238,0.98)_0%,_rgba(244,248,251,0.98)_100%)] px-5 py-8">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-[0_36px_100px_rgba(15,23,42,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className={result.planSource === 'ai' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
              {result.planSource === 'ai' ? 'AI 生成完成' : '当前为模板版路径'}
            </Badge>
            <SectionTitle className="mt-5 text-4xl">第一版建档结果已经准备好</SectionTitle>
            <Muted className="mt-3 text-base leading-7">
              {result.planSource === 'ai'
                ? `本次粗版路径由 ${result.providerLabel ?? 'AI Provider'} 生成。先进入学习路径看周里程碑，再决定今天要不要生成细版计划。`
                : 'AI 当前不可用，系统先给你一版模板路径。你仍然可以先用这版粗路径开始，再在学习路径页手动重生成。'}
            </Muted>
          </div>
          <button type="button" className={ghostButtonClassName} onClick={onClose} aria-label="关闭建档结果摘要">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result.planSource === 'template_fallback' ? (
          <div className="mt-6 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            <div className="font-medium">当前为模板版路径</div>
            <div className="mt-1">{result.fallbackReason ?? 'AI 当前不可用，已自动降级为模板版路径。'}</div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr,1.05fr,1fr]">
          <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">画像关键词</div>
            <div className="mt-4 space-y-3">
              {result.summary.personaHighlights.map((item) => (
                <div key={item} className="rounded-[1.15rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/80 bg-white/92 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">当前主目标</div>
            <div className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{activeGoal?.title ?? result.summary.goalTitle}</div>
            <div className="mt-3 rounded-[1.15rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{result.summary.planSummary}</div>
            <div className="mt-3 text-sm text-slate-500">当前路径标题：{result.summary.planTitle}</div>
          </div>

          <div className="rounded-[1.6rem] border border-white/80 bg-slate-900 p-5 text-white shadow-[0_22px_50px_rgba(15,23,42,0.16)]">
            <div className="text-xs uppercase tracking-[0.18em] text-white/70">第一周里程碑</div>
            <div className="mt-4 text-2xl font-semibold tracking-[-0.05em]">{firstMilestone?.title ?? '先确认第一个周里程碑'}</div>
            <div className="mt-3 text-sm leading-6 text-white/82">{firstMilestone?.focus ?? result.summary.firstTaskTitle}</div>
            <div className="mt-3 rounded-[1rem] bg-white/10 px-4 py-3 text-sm leading-6 text-white/78">
              完成标志：{firstMilestone?.outcome ?? result.summary.firstTaskNote}
            </div>
            <div className="mt-3 text-xs text-white/65">今日页会先保持“待生成今日计划”状态，等你主动点击再细化今天的学习安排。</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className={primaryButtonClassName} onClick={onPrimary}>
            <ArrowRight className="h-4 w-4" />
            进入学习路径
          </button>
          <button type="button" className={secondaryButtonClassName} onClick={onClose}>
            稍后再看
          </button>
        </div>
      </div>
    </div>
  );
}

function appendQuickAction(current: string, nextValue: string) {
  if (!nextValue.trim()) {
    return current;
  }

  if (!current.trim()) {
    return nextValue;
  }

  return current.includes(nextValue) ? current : `${current.trim()}\n${nextValue}`;
}

function getPreferredPageId(tags: string[], todayPlanStatus?: TodayPlan['status']) {
  if (tags.includes('rough-plan-stale')) {
    return 'path';
  }

  if (todayPlanStatus === 'stale') {
    return 'today';
  }

  return 'today';
}
