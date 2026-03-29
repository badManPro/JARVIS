import { useEffect, useState } from 'react';
import { ArrowRight, Bot, Clock3, LoaderCircle, Sparkles, Target } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { ReflectionSheet } from '@/pages/dashboard/reflection-sheet';
import {
  Field,
  MetricRow,
  getActiveDraft,
  getActiveGoal,
  getFocusTask,
  inputClassName,
  primaryButtonClassName,
  riskBadgeClassName,
  secondaryButtonClassName,
  taskStatusBadgeClassName,
  taskStatusLabel,
  textareaClassName,
} from '@/pages/dashboard/shared';
import type { LearningPlanDraft, TaskStatus } from '@shared/app-state';

type TodayPlanDisplayState =
  | { status: 'missing'; plan: null }
  | { status: 'stale'; plan: NonNullable<LearningPlanDraft['todayPlan']> }
  | { status: 'ready'; plan: NonNullable<LearningPlanDraft['todayPlan']> };

export function TodayPage({
  onOpenCoach,
  onPageChange,
}: {
  onOpenCoach: () => void;
  onPageChange: (pageId: string) => void;
}) {
  const dashboard = useAppStore((state) => state.dashboard);
  const profile = useAppStore((state) => state.profile);
  const plan = useAppStore((state) => state.plan);
  const goals = useAppStore((state) => state.goals);
  const updatePlanTaskStatus = useAppStore((state) => state.updatePlanTaskStatus);
  const saveTodayPlanningContext = useAppStore((state) => state.saveTodayPlanningContext);
  const generateTodayPlan = useAppStore((state) => state.generateTodayPlan);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const focusTask = getFocusTask(activeDraft);
  const primaryRisk = dashboard.riskSignals[0] ?? null;
  const todayPlanState = resolveTodayPlanDisplayState(activeDraft);
  const [availableDuration, setAvailableDuration] = useState('');
  const [studyWindow, setStudyWindow] = useState('');
  const [todayNote, setTodayNote] = useState('');
  const [savingContext, setSavingContext] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reflectionContext, setReflectionContext] = useState<{
    taskTitle: string;
    status: Exclude<TaskStatus, 'todo' | 'in_progress'>;
  } | null>(null);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);

  useEffect(() => {
    setAvailableDuration(activeDraft?.todayContext.availableDuration ?? '');
    setStudyWindow(activeDraft?.todayContext.studyWindow ?? profile.bestStudyWindow);
    setTodayNote(activeDraft?.todayContext.note ?? '');
  }, [activeDraft, profile.bestStudyWindow]);

  async function handleSaveTodayContext() {
    if (!activeGoal) {
      setNotice('当前没有主目标，无法保存今日上下文。');
      return;
    }

    setSavingContext(true);
    setNotice(null);

    try {
      await saveTodayPlanningContext({
        goalId: activeGoal.id,
        availableDuration,
        studyWindow,
        note: todayNote,
      });
      setNotice('仅今天有效的设置已保存。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存今日设置失败。');
    } finally {
      setSavingContext(false);
    }
  }

  async function handleGenerateTodayPlan() {
    if (!activeGoal) {
      setNotice('当前没有主目标，无法生成今日计划。');
      return;
    }

    setGenerating(true);
    setNotice(null);

    try {
      await saveTodayPlanningContext({
        goalId: activeGoal.id,
        availableDuration,
        studyWindow,
        note: todayNote,
      });
      await generateTodayPlan({ goalId: activeGoal.id });
      setNotice(todayPlanState.status === 'ready' ? '今日详细计划已重新生成。' : '今日详细计划已生成。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '生成今日计划失败。');
    } finally {
      setGenerating(false);
    }
  }

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

    if (status === 'done' || status === 'delayed' || status === 'skipped') {
      setReflectionContext({
        taskTitle: focusTask.title,
        status,
      });
    }
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,217,186,0.42),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,248,245,0.98)_100%)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="bg-white/90 text-slate-700">{dashboard.onboarding.active ? '首次启动引导' : '今日详细计划'}</Badge>
              <SectionTitle className="mt-4 text-3xl">
                {dashboard.onboarding.active
                  ? '先完成第一轮建档，再开始真正的学习推进'
                  : todayPlanState.status === 'ready'
                    ? todayPlanState.plan.todayGoal
                    : '先生成今天的细版学习安排'}
              </SectionTitle>
              <Muted className="mt-3 text-base leading-7">
                {dashboard.onboarding.active
                  ? '先通过教练入口生成粗版路径。生成完成后，今日页会保持待生成状态，等你主动输入今天的时间和窗口再产出详细步骤。'
                  : todayPlanState.status === 'ready'
                    ? todayPlanState.plan.deliverable
                    : '这里不会强迫你自己拆解。你只需要补充今天可用的时间块，系统就会生成学习步骤、资源、练习和今日产出。'}
              </Muted>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="bg-slate-900 text-white">{availableDuration || profile.timeBudget || dashboard.duration}</Badge>
                <Badge className="bg-white/90 text-slate-700">{studyWindow || profile.bestStudyWindow || '待填写学习窗口'}</Badge>
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

                  void handleGenerateTodayPlan();
                }}
                disabled={generating}
              >
                {dashboard.onboarding.active
                  ? <Sparkles className="h-4 w-4" />
                  : generating
                    ? <LoaderCircle className="h-4 w-4 animate-spin" />
                    : <Target className="h-4 w-4" />}
                {dashboard.onboarding.active ? '开始对话建档' : todayPlanState.status === 'ready' ? '重新生成今日计划' : '生成今日计划'}
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

        {todayPlanState.status === 'stale' ? (
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            <div className="font-medium">计划已过期</div>
            <div className="mt-1">今天的时间块、学习窗口或节奏发生了变化。旧的学习步骤、资源和练习建议仍保留供参考，但请先点击“重新生成今日计划”。</div>
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-[1.35rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.18fr,0.82fr]">
          <Card>
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-slate-500" />
              <SectionTitle>仅今天有效</SectionTitle>
            </div>
            <Muted className="mt-2">这些覆盖项只影响今天的细版计划，不会改动长期画像。</Muted>
            <div className="mt-5 grid gap-4">
              <Field label="今天能投入多久">
                <input
                  className={inputClassName}
                  value={availableDuration}
                  onChange={(event) => setAvailableDuration(event.target.value)}
                  placeholder={profile.timeBudget || '例如：今天只有 30 分钟'}
                />
              </Field>
              <Field label="今天打算在哪个时间窗口学">
                <input
                  className={inputClassName}
                  value={studyWindow}
                  onChange={(event) => setStudyWindow(event.target.value)}
                  placeholder={profile.bestStudyWindow || '例如：今晚 20:30 - 21:00'}
                />
              </Field>
              <Field label="今天的额外说明">
                <textarea
                  className={textareaClassName}
                  rows={4}
                  value={todayNote}
                  onChange={(event) => setTodayNote(event.target.value)}
                  placeholder="例如：今天只想完成环境安装；不想读太多理论；希望最后能交付一个最小脚本。"
                />
              </Field>
              <div className="rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                <div>默认时间预算：{profile.timeBudget || '未填写'}</div>
                <div className="mt-1">默认学习窗口：{profile.bestStudyWindow || '未填写'}</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={secondaryButtonClassName} onClick={() => void handleSaveTodayContext()} disabled={savingContext || generating}>
                  {savingContext ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  保存仅今天设置
                </button>
                <button type="button" className={primaryButtonClassName} onClick={() => void handleGenerateTodayPlan()} disabled={generating}>
                  {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {todayPlanState.status === 'ready' ? '重新生成今日计划' : '生成今日计划'}
                </button>
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
              {reflectionNotice ? (
                <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {reflectionNotice}
                </div>
              ) : null}
            </Card>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
          <Card>
            <SectionTitle>学习步骤</SectionTitle>
            <div className="mt-5 space-y-3">
              {todayPlanState.status === 'ready' || todayPlanState.status === 'stale' ? todayPlanState.plan.steps.map((step, index) => (
                <div key={`${step.title}-${index + 1}`} className="rounded-[1.35rem] border border-white/80 bg-white/88 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900">{index + 1}. {step.title}</div>
                    <Badge className="bg-slate-100 text-slate-700">{step.duration}</Badge>
                  </div>
                  <Muted className="mt-2">{step.detail}</Muted>
                </div>
              )) : (
                <div className="rounded-[1.35rem] border border-dashed border-white/80 bg-white/72 px-5 py-6 text-sm leading-6 text-slate-600">
                  今日计划尚未生成。先填写“仅今天有效”的时间块，再点击“生成今日计划”。
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <SectionTitle>资源</SectionTitle>
              <div className="mt-4 space-y-3">
                {todayPlanState.status === 'ready' || todayPlanState.status === 'stale' ? todayPlanState.plan.resources.map((resource) => (
                  <div key={`${resource.title}-${resource.url}`} className="rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    <div className="font-medium text-slate-900">{resource.title}</div>
                    <div className="mt-1 break-all text-xs text-slate-500">{resource.url}</div>
                    <div className="mt-2">{resource.reason}</div>
                  </div>
                )) : <Muted>生成今日计划后，这里会给出今天直接可用的资源。</Muted>}
              </div>
            </Card>

            <Card>
              <SectionTitle>练习</SectionTitle>
              <div className="mt-4 space-y-3">
                {todayPlanState.status === 'ready' || todayPlanState.status === 'stale' ? todayPlanState.plan.practice.map((item) => (
                  <div key={`${item.title}-${item.output}`} className="rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="mt-2">{item.detail}</div>
                    <div className="mt-2 text-xs text-slate-500">期望输出：{item.output}</div>
                  </div>
                )) : <Muted>生成今日计划后，这里会列出今天的练习题或实操作业。</Muted>}
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <SectionTitle>今日产出</SectionTitle>
            {todayPlanState.status === 'ready' || todayPlanState.status === 'stale' ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                  <div className="font-medium text-slate-900">里程碑锚点</div>
                  <div className="mt-2">{todayPlanState.plan.milestoneRef || '未设置'}</div>
                </div>
                <div className="rounded-[1.2rem] bg-slate-900 px-4 py-4 text-sm leading-6 text-white">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/70">deliverable</div>
                  <div className="mt-2 text-base font-medium">今日产出：{todayPlanState.plan.deliverable}</div>
                  <div className="mt-2 text-white/75">预计投入：{todayPlanState.plan.estimatedDuration}</div>
                </div>
              </div>
            ) : (
              <Muted className="mt-4">生成今日计划后，这里会明确今天必须交付什么结果。</Muted>
            )}
          </Card>

          <Card>
            <SectionTitle>粗版路径进度</SectionTitle>
            <Muted className="mt-2">细版计划帮助你今天落地，粗版任务状态仍保留给复盘链路。</Muted>
            <div className="mt-5 rounded-[1.5rem] border border-white/80 bg-white/85 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={focusTask ? taskStatusBadgeClassName(focusTask.status) : 'bg-slate-100 text-slate-700'}>
                  {focusTask ? taskStatusLabel(focusTask.status) : '待生成'}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700">{focusTask?.duration ?? dashboard.priorityAction.duration}</Badge>
              </div>
              <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                {focusTask?.title ?? '还没有粗版任务，先完成建档'}
              </div>
              <Muted className="mt-3">
                {focusTask?.note ?? '建档完成后，这里会保留当前粗版任务，供阶段复盘和任务状态跟踪使用。'}
              </Muted>
              {!dashboard.onboarding.active && activeDraft && focusTask ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {focusTask.status !== 'in_progress' ? (
                    <button type="button" className={primaryButtonClassName} onClick={() => void markTask('in_progress')}>开始</button>
                  ) : (
                    <button type="button" className={primaryButtonClassName} onClick={() => void markTask('done')}>完成</button>
                  )}
                  <button type="button" className={secondaryButtonClassName} onClick={() => void markTask('delayed')}>延后</button>
                  <button type="button" className={secondaryButtonClassName} onClick={() => void markTask('skipped')}>跳过</button>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <ReflectionSheet
        open={Boolean(reflectionContext)}
        period="daily"
        contextTitle={reflectionContext?.taskTitle}
        contextStatus={reflectionContext?.status}
        onClose={() => setReflectionContext(null)}
        onSaved={(message) => {
          setReflectionContext(null);
          setReflectionNotice(message);
        }}
      />
    </>
  );
}

function getCalendarDate(now: Date) {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function resolveTodayPlanDisplayState(draft: LearningPlanDraft | null): TodayPlanDisplayState {
  if (!draft?.todayPlan) {
    return {
      status: 'missing',
      plan: null,
    };
  }

  if (draft.todayPlan.status === 'stale') {
    return {
      status: 'stale',
      plan: draft.todayPlan,
    };
  }

  if (draft.todayPlan.date !== getCalendarDate(new Date())) {
    return {
      status: 'missing',
      plan: null,
    };
  }

  return {
    status: 'ready',
    plan: draft.todayPlan,
  };
}
