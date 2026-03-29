import { useState } from 'react';
import { ArrowRight, Bot, Clock3, Sparkles, Target } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { ReflectionSheet } from '@/pages/dashboard/reflection-sheet';
import {
  MetricRow,
  getActiveDraft,
  getActiveGoal,
  getFocusTask,
  primaryButtonClassName,
  riskBadgeClassName,
  secondaryButtonClassName,
  taskStatusBadgeClassName,
  taskStatusLabel,
} from '@/pages/dashboard/shared';
import type { TaskStatus } from '@shared/app-state';

export function TodayPage({
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
  const [reflectionContext, setReflectionContext] = useState<{
    taskTitle: string;
    status: Exclude<TaskStatus, 'todo' | 'in_progress'>;
  } | null>(null);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);

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
            {reflectionNotice ? (
              <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {reflectionNotice}
              </div>
            ) : null}
          </Card>
        </div>
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
