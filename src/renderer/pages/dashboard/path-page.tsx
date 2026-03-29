import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { ReflectionSheet } from '@/pages/dashboard/reflection-sheet';
import {
  getActiveDraft,
  getActiveGoal,
  primaryButtonClassName,
  secondaryButtonClassName,
  sectionCardClassName,
  taskStatusBadgeClassName,
  taskStatusLabel,
} from '@/pages/dashboard/shared';

export function PathPage({ onOpenCoach }: { onOpenCoach: () => void }) {
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const visibleTasks = activeDraft?.tasks.slice(0, 5) ?? [];
  const currentStage = activeDraft?.stages.find((stage) => stage.progress !== '已完成') ?? activeDraft?.stages[0] ?? null;
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);

  return (
    <>
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
            <button type="button" className={secondaryButtonClassName} onClick={() => setReflectionOpen(true)}>
              阶段复盘
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
            <SectionTitle>当前阶段</SectionTitle>
            {currentStage ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">{currentStage.title}</div>
                  <div className="mt-2">{currentStage.outcome}</div>
                  <div className="mt-2 text-xs text-slate-500">当前进度：{currentStage.progress}</div>
                </div>
                <button type="button" className={secondaryButtonClassName} onClick={() => setReflectionOpen(true)}>
                  记录这一阶段的复盘反馈
                </button>
              </div>
            ) : (
              <Muted className="mt-4">当前还没有阶段信息，先完成建档。</Muted>
            )}
            {reflectionNotice ? (
              <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {reflectionNotice}
              </div>
            ) : null}
          </Card>

          <details className={sectionCardClassName}>
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">高级内容：完整路径依据与历史快照</summary>
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

      <ReflectionSheet
        open={reflectionOpen}
        period="stage"
        contextTitle={currentStage?.title}
        onClose={() => setReflectionOpen(false)}
        onSaved={(message) => {
          setReflectionOpen(false);
          setReflectionNotice(message);
        }}
      />
    </>
  );
}
