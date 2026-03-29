import { type ReactNode, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCcw,
  Settings2,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import type { PageDefinition } from '@/pages/page-data';
import { useAppStore } from '@/store/app-store';
import type {
  AppState,
  LearningGoal,
  LearningPlanDraft,
  PlanTask,
  TaskStatus,
  UserProfile,
} from '@shared/app-state';

const inputClassName = 'neo-input w-full rounded-[1.1rem] px-4 py-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60';
const textareaClassName = 'neo-input w-full resize-y rounded-[1.1rem] px-4 py-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60';
const primaryButtonClassName = 'neo-button neo-button-primary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName = 'neo-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60';
const ghostButtonClassName = 'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-900';
const sectionCardClassName = 'space-y-4 rounded-[1.75rem] border border-white/70 bg-white/82 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]';
const startPageOptions = ['今日', '学习路径', '学习档案', '设置'];
const themeOptions = ['跟随系统', '浅色', '深色'];

function normalizeStartPageLabel(value: string) {
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

function splitLines(value: string) {
  return Array.from(new Set(
    value
      .split(/[\n,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ));
}

function getActiveGoal(goals: LearningGoal[], activeGoalId: string) {
  return goals.find((goal) => goal.id === activeGoalId) ?? goals[0] ?? null;
}

function getActiveDraft(plan: AppState['plan']) {
  return plan.drafts.find((draft) => draft.goalId === plan.activeGoalId) ?? plan.drafts[0] ?? null;
}

function getFocusTask(draft: LearningPlanDraft | null) {
  if (!draft) {
    return null;
  }

  return draft.tasks.find((task) => task.status === 'in_progress')
    ?? draft.tasks.find((task) => task.status === 'todo')
    ?? draft.tasks[0]
    ?? null;
}

function taskStatusLabel(status: TaskStatus) {
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

function taskStatusBadgeClassName(status: TaskStatus) {
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

function riskBadgeClassName(level: AppState['dashboard']['riskSignals'][number]['level']) {
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

function codexStateLabel(state: ReturnType<typeof useAppStore.getState>['codexAuth']['state']) {
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

function buildCoachStyleSummary(profile: UserProfile) {
  return [
    profile.mbti ? `对话语气会参考 ${profile.mbti} 的思考节奏` : null,
    profile.feedbackPreference ? `反馈方式偏向 ${profile.feedbackPreference}` : null,
    profile.pacePreference ? `任务拆解会遵循「${profile.pacePreference}」` : null,
    profile.stressResponse ? `压力波动时优先采用「${profile.stressResponse}」` : null,
  ].filter(Boolean) as string[];
}

export function PageContent({
  page,
  onPageChange,
  onOpenCoach,
}: {
  page: PageDefinition;
  onPageChange: (pageId: string) => void;
  onOpenCoach: () => void;
}) {
  switch (page.id) {
    case 'today':
      return <TodayContent onOpenCoach={onOpenCoach} onPageChange={onPageChange} />;
    case 'path':
      return <PathContent onOpenCoach={onOpenCoach} />;
    case 'profile':
      return <ProfileContent />;
    case 'settings':
      return <SettingsContent onPageChange={onPageChange} />;
    default:
      return null;
  }
}

export function CoachDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profile = useAppStore((state) => state.profile);
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const conversation = useAppStore((state) => state.conversation);
  const codexAuth = useAppStore((state) => state.codexAuth);
  const saveUserProfile = useAppStore((state) => state.saveUserProfile);
  const upsertLearningGoal = useAppStore((state) => state.upsertLearningGoal);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const appendConversationMessage = useAppStore((state) => state.appendConversationMessage);
  const runProfileExtraction = useAppStore((state) => state.runProfileExtraction);
  const generatePlanAdjustmentSuggestions = useAppStore((state) => state.generatePlanAdjustmentSuggestions);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const isFirstRun = !profile.identity.trim() || !profile.timeBudget.trim() || !goals.length;

  const [goalTitle, setGoalTitle] = useState(activeGoal?.title ?? '');
  const [baseline, setBaseline] = useState(profile.identity);
  const [timeBudget, setTimeBudget] = useState(profile.timeBudget);
  const [studyWindow, setStudyWindow] = useState(profile.bestStudyWindow);
  const [goalCycle, setGoalCycle] = useState(activeGoal?.cycle ?? '6 周');
  const [ageBracket, setAgeBracket] = useState(profile.ageBracket);
  const [gender, setGender] = useState(profile.gender);
  const [personalityTraitsText, setPersonalityTraitsText] = useState(profile.personalityTraits.join('\n'));
  const [mbti, setMbti] = useState(profile.mbti);
  const [motivationStyle, setMotivationStyle] = useState(profile.motivationStyle);
  const [stressResponse, setStressResponse] = useState(profile.stressResponse);
  const [feedbackPreference, setFeedbackPreference] = useState(profile.feedbackPreference);
  const [changeNote, setChangeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNotice(null);
    }
  }, [open]);

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
    try {
      const goalId = activeGoal?.id ?? `goal-${Date.now()}`;
      await saveUserProfile({
        ...profile,
        identity: baseline.trim(),
        timeBudget: timeBudget.trim(),
        bestStudyWindow: studyWindow.trim(),
        ageBracket: ageBracket.trim(),
        gender: gender.trim(),
        personalityTraits: splitLines(personalityTraitsText),
        mbti: mbti.trim().toUpperCase(),
        motivationStyle: motivationStyle.trim(),
        stressResponse: stressResponse.trim(),
        feedbackPreference: feedbackPreference.trim(),
      });
      await upsertLearningGoal({
        id: goalId,
        title: goalTitle.trim(),
        motivation: activeGoal?.motivation ?? `希望系统化推进 ${goalTitle.trim()}。`,
        baseline: baseline.trim(),
        cycle: goalCycle.trim() || '6 周',
        successMetric: activeGoal?.successMetric ?? `完成一个能证明「${goalTitle.trim()}」学习结果的真实成果。`,
        priority: 'P1',
        status: 'active',
      });
      await setActiveGoal(goalId);
      setNotice('第一版学习路径已生成，今日页会直接显示当前第一步。');
      onClose();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '建档失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveChange(mode: 'note' | 'profile' | 'path') {
    if (!changeNote.trim()) {
      setNotice('先描述最近发生了什么变化。');
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      await appendConversationMessage({ content: changeNote.trim() });
      if (mode === 'profile') {
        await runProfileExtraction();
        setNotice('画像建议已生成，可以在当前对话记录里确认。');
      } else if (mode === 'path' && activeGoal) {
        await generatePlanAdjustmentSuggestions({ goalId: activeGoal.id });
        setNotice('路径调整建议已生成，可以在当前对话记录里确认。');
      } else {
        setNotice('变化已保存到全局对话。');
      }
      setChangeNote('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存变化失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm">
      <div className="h-full w-full max-w-[34rem] overflow-y-auto border-l border-white/70 bg-[linear-gradient(180deg,_rgba(255,250,244,0.96)_0%,_rgba(247,248,251,0.98)_100%)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="bg-white/85 text-slate-700">{isFirstRun ? '首次建档' : '我有变化'}</Badge>
            <SectionTitle className="mt-4 text-3xl">
              {isFirstRun ? '先回答几句，系统直接给你第一步' : '把变化交给教练入口处理'}
            </SectionTitle>
            <Muted className="mt-3">
              {isFirstRun
                ? '你不需要先理解画像、目标和计划。先把关键信息交代清楚，系统会生成第一版主目标和学习路径。'
                : '这里不是独立 tab。它是全局入口，用来记录变化、补充画像或触发路径调整。'}
            </Muted>
          </div>
          <button type="button" className={ghostButtonClassName} onClick={onClose} aria-label="关闭教练入口">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isFirstRun ? (
          <div className="mt-6 space-y-5">
            <div className={sectionCardClassName}>
              <Field label="1. 你现在最想学什么">
                <input className={inputClassName} value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="例如：Python + AI 应用开发" />
              </Field>
              <Field label="2. 你现在大概到什么水平">
                <textarea className={textareaClassName} rows={4} value={baseline} onChange={(event) => setBaseline(event.target.value)} placeholder="例如：前端经验较强，Python 和数据层较弱。" />
              </Field>
              <Field label="3. 你每周或每天能投入多少">
                <input className={inputClassName} value={timeBudget} onChange={(event) => setTimeBudget(event.target.value)} placeholder="例如：工作日 45 分钟，周末 2 小时" />
              </Field>
            </div>

            <details className={sectionCardClassName}>
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">第二段增强画像：年龄阶段、性格、MBTI、反馈偏好</summary>
              <div className="mt-4 grid gap-4">
                <Field label="年龄阶段">
                  <input className={inputClassName} value={ageBracket} onChange={(event) => setAgeBracket(event.target.value)} placeholder="例如：18-24 岁 / 25-34 岁" />
                </Field>
                <Field label="可选性别">
                  <input className={inputClassName} value={gender} onChange={(event) => setGender(event.target.value)} placeholder="可留空" />
                </Field>
                <Field label="常见学习窗口">
                  <input className={inputClassName} value={studyWindow} onChange={(event) => setStudyWindow(event.target.value)} placeholder="例如：工作日晚间 20:30 - 21:15" />
                </Field>
                <Field label="性格关键词">
                  <textarea className={textareaClassName} rows={3} value={personalityTraitsText} onChange={(event) => setPersonalityTraitsText(event.target.value)} placeholder="每行一个，例如：需要明确反馈" />
                </Field>
                <Field label="MBTI">
                  <input className={inputClassName} value={mbti} onChange={(event) => setMbti(event.target.value)} placeholder="例如：INTJ" />
                </Field>
                <Field label="偏好的激励方式">
                  <input className={inputClassName} value={motivationStyle} onChange={(event) => setMotivationStyle(event.target.value)} placeholder="例如：看到明确里程碑更有动力" />
                </Field>
                <Field label="压力波动时更需要什么">
                  <input className={inputClassName} value={stressResponse} onChange={(event) => setStressResponse(event.target.value)} placeholder="例如：先做低阻力任务恢复节奏" />
                </Field>
                <Field label="你希望收到什么样的提醒和反馈">
                  <input className={inputClassName} value={feedbackPreference} onChange={(event) => setFeedbackPreference(event.target.value)} placeholder="例如：直接、简短，并明确下一步动作" />
                </Field>
                <Field label="计划周期（可选）">
                  <input className={inputClassName} value={goalCycle} onChange={(event) => setGoalCycle(event.target.value)} placeholder="例如：6 周" />
                </Field>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClassName} onClick={() => void handleStartOnboarding()} disabled={submitting}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                生成第一版路径
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={onClose} disabled={submitting}>
                稍后再说
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className={sectionCardClassName}>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Bot className="h-4 w-4" />
                当前对话会话
              </div>
              <Muted className="mt-2">最新目标：{activeGoal?.title ?? '尚未生成'}。有变化时先描述事实，再决定是否生成画像或路径建议。</Muted>
              <textarea
                className={`${textareaClassName} mt-4`}
                rows={7}
                value={changeNote}
                onChange={(event) => setChangeNote(event.target.value)}
                placeholder="例如：最近工作日只剩 30 分钟；我更希望被直接提醒下一步；本周暂时不适合高难任务。"
              />
            </div>

            <div className={sectionCardClassName}>
              <div className="text-sm font-medium text-slate-900">最近对话记录</div>
              <div className="mt-3 space-y-3">
                {conversation.messages.slice(-4).map((message) => (
                  <div key={message.id} className="rounded-[1.2rem] bg-white/90 px-4 py-3 text-sm leading-6 text-slate-700">
                    <span className="font-medium text-slate-900">{message.role}：</span>
                    {message.content}
                  </div>
                ))}
                {!conversation.messages.length ? <Muted>当前还没有对话记录。</Muted> : null}
              </div>
            </div>

            <div className={sectionCardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">Codex 能力</div>
                  <Muted className="mt-1">连接后才能把自然语言变化自动转成结构化画像或路径建议。</Muted>
                </div>
                <Badge className={codexAuth.state === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                  {codexStateLabel(codexAuth.state)}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClassName} onClick={() => void handleSaveChange('note')} disabled={submitting}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                保存到对话
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={() => void handleSaveChange('profile')} disabled={submitting || codexAuth.state !== 'connected'}>
                生成画像建议
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={() => void handleSaveChange('path')} disabled={submitting || codexAuth.state !== 'connected' || !activeGoal}>
                生成路径调整
              </button>
            </div>
          </div>
        )}

        {notice ? (
          <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {notice}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TodayContent({
  onOpenCoach,
  onPageChange,
}: {
  onOpenCoach: () => void;
  onPageChange: (pageId: string) => void;
}) {
  const dashboard = useAppStore((state) => state.dashboard);
  const plan = useAppStore((state) => state.plan);
  const goals = useAppStore((state) => state.goals);
  const updatePlanTaskStatus = useAppStore((state) => state.updatePlanTaskStatus);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const focusTask = getFocusTask(activeDraft);
  const primaryRisk = dashboard.riskSignals[0] ?? null;

  async function markTask(status: TaskStatus) {
    if (!activeDraft || !focusTask) {
      return;
    }

    await updatePlanTaskStatus({
      draftId: activeDraft.id,
      taskId: focusTask.id,
      status,
      statusNote: status === 'in_progress' ? '从今日页开始推进。' : status === 'done' ? '从今日页标记完成。' : '今日页快速调整节奏。',
    });
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,217,186,0.42),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,248,245,0.98)_100%)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="bg-white/90 text-slate-700">{dashboard.onboarding.active ? '首次启动引导' : '今日主任务'}</Badge>
            <SectionTitle className="mt-4 text-3xl">
              {dashboard.onboarding.active ? '先完成第一轮建档，再开始真正的学习推进' : (focusTask?.title ?? dashboard.priorityAction.title)}
            </SectionTitle>
            <Muted className="mt-3 text-base leading-7">
              {dashboard.onboarding.active
                ? '当前产品不会要求你逐个 tab 补表单。先通过教练入口回答几个问题，系统就会生成第一版主目标、学习路径和今天第一步。'
                : (focusTask?.note || dashboard.priorityAction.detail)}
            </Muted>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-slate-900 text-white">{dashboard.duration}</Badge>
              <Badge className="bg-white/90 text-slate-700">{dashboard.stage}</Badge>
              <Badge className="bg-white/90 text-slate-700">{activeGoal?.title ?? '等待生成主目标'}</Badge>
            </div>
          </div>
          <div className="flex w-full max-w-[18rem] flex-col gap-3">
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={() => {
                if (dashboard.onboarding.active) {
                  onOpenCoach();
                  return;
                }

                void markTask(focusTask?.status === 'in_progress' ? 'done' : 'in_progress');
              }}
            >
              {dashboard.onboarding.active ? <Sparkles className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              {dashboard.onboarding.active ? '开始对话建档' : (focusTask?.status === 'in_progress' ? '标记已完成' : '开始当前任务')}
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={onOpenCoach}>
              <Bot className="h-4 w-4" />
              我有变化
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => onPageChange('path')}>
              <ArrowRight className="h-4 w-4" />
              查看学习路径
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.35fr,0.95fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-slate-500" />
            <SectionTitle>现在要做什么</SectionTitle>
          </div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/85 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={focusTask ? taskStatusBadgeClassName(focusTask.status) : 'bg-slate-100 text-slate-700'}>
                  {focusTask ? taskStatusLabel(focusTask.status) : '待生成'}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700">{focusTask?.duration ?? dashboard.priorityAction.duration}</Badge>
              </div>
              <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                {focusTask?.title ?? '还没有第一项任务，先完成建档'}
              </div>
              <Muted className="mt-3">
                {focusTask?.note ?? '建档完成后，这里只会保留一个当前动作，而不是把所有东西一次铺开。'}
              </Muted>
              {!dashboard.onboarding.active && activeDraft && focusTask ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {focusTask.status !== 'in_progress' ? (
                    <button type="button" className={primaryButtonClassName} onClick={() => void markTask('in_progress')}>开始</button>
                  ) : (
                    <button type="button" className={primaryButtonClassName} onClick={() => void markTask('done')}>完成</button>
                  )}
                  <button type="button" className={secondaryButtonClassName} onClick={() => void markTask('delayed')}>延后</button>
                  <button type="button" className={secondaryButtonClassName} onClick={onOpenCoach}>我有变化</button>
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle>风险提醒</SectionTitle>
              <Badge className={primaryRisk ? riskBadgeClassName(primaryRisk.level) : 'bg-slate-100 text-slate-700'}>
                {primaryRisk ? primaryRisk.level : 'low'}
              </Badge>
            </div>
            {primaryRisk ? (
              <div className="mt-4 space-y-3">
                <div className="text-lg font-semibold text-slate-950">{primaryRisk.title}</div>
                <Muted>{primaryRisk.detail}</Muted>
                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{primaryRisk.action}</div>
              </div>
            ) : (
              <Muted className="mt-4">当前无明显风险，继续保持单任务推进即可。</Muted>
            )}
          </Card>

          <Card>
            <SectionTitle>当前节奏</SectionTitle>
            <div className="mt-4 space-y-3">
              <MetricRow label="本周完成率" value={`${dashboard.weeklyCompletion}%`} />
              <MetricRow label="连续天数" value={`${dashboard.streakDays} 天`} />
              <MetricRow label="复盘摘要" value={dashboard.reflectionSummary || '暂无'} compact />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PathContent({ onOpenCoach }: { onOpenCoach: () => void }) {
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const visibleTasks = activeDraft?.tasks.slice(0, 5) ?? [];

  return (
    <div className="space-y-5">
      <Card className="bg-[radial-gradient(circle_at_top_right,_rgba(219,234,254,0.48),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(246,248,252,0.98)_100%)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="bg-white/90 text-slate-700">当前主线</Badge>
            <SectionTitle className="mt-4 text-3xl">{activeGoal?.title ?? '还没有主目标'}</SectionTitle>
            <Muted className="mt-3 text-base leading-7">
              {activeDraft?.summary ?? '建档完成后，这里会把目标和计划合并成一条可执行路径，只保留当前阶段和最近任务。'}
            </Muted>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={secondaryButtonClassName} onClick={onOpenCoach}>
              <Bot className="h-4 w-4" />
              发起调整
            </button>
          </div>
        </div>
      </Card>

      {goals.length > 1 ? (
        <Card>
          <SectionTitle>切换主目标</SectionTitle>
          <div className="mt-4 flex flex-wrap gap-3">
            {goals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                className={goal.id === plan.activeGoalId ? primaryButtonClassName : secondaryButtonClassName}
                onClick={() => void setActiveGoal(goal.id)}
              >
                {goal.title}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <SectionTitle>最近任务</SectionTitle>
          <div className="mt-5 space-y-3">
            {visibleTasks.length ? visibleTasks.map((task) => (
              <div key={task.id} className="rounded-[1.4rem] border border-white/80 bg-white/85 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900">{task.title}</div>
                  <div className="flex items-center gap-2">
                    <Badge className={taskStatusBadgeClassName(task.status)}>{taskStatusLabel(task.status)}</Badge>
                    <Badge className="bg-slate-100 text-slate-700">{task.duration}</Badge>
                  </div>
                </div>
                <Muted className="mt-2">{task.note}</Muted>
              </div>
            )) : <Muted>当前还没有学习路径，先完成建档。</Muted>}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle>路径依据</SectionTitle>
            <div className="mt-4 space-y-3">
              {(activeDraft?.basis.slice(0, 3) ?? []).map((item) => (
                <div key={item} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{item}</div>
              ))}
              {!activeDraft?.basis.length ? <Muted>暂无路径依据。</Muted> : null}
            </div>
          </Card>

          <details className={sectionCardClassName}>
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">高级内容：完整依据与历史快照</summary>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-900">完整依据</div>
                <div className="mt-3 space-y-2">
                  {(activeDraft?.basis ?? []).map((item) => (
                    <div key={item} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{item}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">历史快照</div>
                <div className="mt-3 space-y-2">
                  {plan.snapshots
                    .filter((snapshot) => snapshot.goalId === plan.activeGoalId)
                    .slice(0, 3)
                    .map((snapshot) => (
                      <div key={snapshot.id} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                        <div className="font-medium text-slate-900">v{snapshot.version} · {snapshot.title}</div>
                        <div className="mt-1">{snapshot.summary}</div>
                      </div>
                    ))}
                  {!plan.snapshots.filter((snapshot) => snapshot.goalId === plan.activeGoalId).length ? <Muted>当前还没有历史快照。</Muted> : null}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function ProfileContent() {
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

function SettingsContent({ onPageChange }: { onPageChange: (pageId: string) => void }) {
  const appState = useAppStore();
  const refreshAiRuntimeSummary = useAppStore((state) => state.refreshAiRuntimeSummary);
  const refreshAiObservability = useAppStore((state) => state.refreshAiObservability);
  const refreshCodexAuthStatus = useAppStore((state) => state.refreshCodexAuthStatus);
  const startCodexLogin = useAppStore((state) => state.startCodexLogin);
  const startCodexDeviceLogin = useAppStore((state) => state.startCodexDeviceLogin);
  const logoutCodex = useAppStore((state) => state.logoutCodex);
  const saveAppState = useAppStore((state) => state.saveAppState);
  const [settingsDraft, setSettingsDraft] = useState(appState.settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettingsDraft({
      ...appState.settings,
      startPage: normalizeStartPageLabel(appState.settings.startPage),
    });
  }, [appState.settings]);

  async function onSaveSettings() {
    setSaving(true);
    try {
      await saveAppState({
        profile: appState.profile,
        dashboard: appState.dashboard,
        goals: appState.goals,
        plan: appState.plan,
        conversation: appState.conversation,
        reflection: appState.reflection,
        settings: settingsDraft,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.36),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(247,248,251,0.98)_100%)]">
        <Badge className="bg-white/90 text-slate-700">基础设置</Badge>
        <SectionTitle className="mt-4 text-3xl">把日常需要的控制项留在前面，技术噪音收进高级区</SectionTitle>
        <Muted className="mt-3 text-base leading-7">
          默认层只保留主题、启动页和 Codex 连接。运行时诊断、用途路由和观测性都收进高级设置里。
        </Muted>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <SectionTitle>基础偏好</SectionTitle>
          <div className="mt-5 grid gap-4">
            <Field label="主题">
              <select className={inputClassName} value={settingsDraft.theme} onChange={(event) => setSettingsDraft((current) => ({ ...current, theme: event.target.value }))}>
                {themeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="启动页">
              <select className={inputClassName} value={settingsDraft.startPage} onChange={(event) => setSettingsDraft((current) => ({ ...current, startPage: event.target.value }))}>
                {startPageOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" className={primaryButtonClassName} onClick={() => void onSaveSettings()} disabled={saving}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              保存基础设置
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionTitle>连接 Codex</SectionTitle>
              <Muted className="mt-2">采用官方 Codex 登录流。客户端只发起登录、检查状态和消费能力，不保存 ChatGPT OAuth token。</Muted>
            </div>
            <Badge className={appState.codexAuth.state === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
              {codexStateLabel(appState.codexAuth.state)}
            </Badge>
          </div>
          <div className="mt-5 rounded-[1.4rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
            {appState.codexAuth.message}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={primaryButtonClassName} onClick={() => void startCodexLogin()}>
              连接 Codex
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void refreshCodexAuthStatus()}>
              检查连接
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void logoutCodex()}>
              断开连接
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void startCodexDeviceLogin()}>
              设备码回退
            </button>
          </div>
        </Card>
      </div>

      <details className={sectionCardClassName}>
        <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">高级设置</summary>
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-3">
            <button type="button" className={secondaryButtonClassName} onClick={() => void refreshAiRuntimeSummary()}>
              <RefreshCcw className="h-4 w-4" />
              刷新运行时摘要
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => void refreshAiObservability()}>
              <Settings2 className="h-4 w-4" />
              刷新观测数据
            </button>
            <button type="button" className={secondaryButtonClassName} onClick={() => onPageChange('today')}>
              返回今日
            </button>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">AI 运行时</div>
            <div className="mt-3 space-y-3">
              {appState.aiRuntimeSummary.map((item) => (
                <div key={item.capability} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{item.capability}</span>
                    <Badge className={item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                      {item.providerLabel}
                    </Badge>
                  </div>
                  <div className="mt-1">模型：{item.model}</div>
                  <div className="mt-1">{item.blockedReason ?? item.healthHint ?? '当前可用。'}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">当前 Provider 概览</div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {appState.settings.providers.map((provider) => (
                <div key={provider.id} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{provider.label}</span>
                    <Badge className={provider.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                      {provider.enabled ? '已启用' : '未启用'}
                    </Badge>
                  </div>
                  <div className="mt-1">模型：{provider.model || '未配置'}</div>
                  <div className="mt-1">认证：{provider.authMode}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-900">最近观测</div>
            <div className="mt-3 rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              请求总数 {appState.aiObservability.totalRequests}，成功 {appState.aiObservability.successCount}，失败 {appState.aiObservability.failureCount}。
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function Field({
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

function MetricRow({
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
