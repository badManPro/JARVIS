import { useMemo } from 'react';
import { CalendarRange, Clock3, GitBranchPlus, Orbit, Sparkles } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import type { DashboardGoalSchedulingItem, LearningPlanState, TodayPlanDependencyStrategy } from '@shared/app-state';

const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

type DelayedCandidatePreview = {
  id: string;
  title: string;
  detail: string;
  duration: string;
  statusNote: string;
  goalId: string;
  goalTitle: string;
  goalRole: DashboardGoalSchedulingItem['role'];
  strategyLabel: string;
  assignedDayLabel: string;
};

type CalendarDayPreview = {
  label: (typeof weekLabels)[number];
  supportGoal: DashboardGoalSchedulingItem | null;
  delayed: DelayedCandidatePreview[];
  note: string;
};

function dependencyStrategyLabel(strategy?: TodayPlanDependencyStrategy) {
  switch (strategy) {
    case 'compress_continue':
      return '压缩继续';
    case 'wait_recovery':
      return '等待补回';
    case 'auto_reorder':
    default:
      return '自动重排';
  }
}

function buildDelayedCandidates(
  plan: LearningPlanState,
  allocations: DashboardGoalSchedulingItem[],
): DelayedCandidatePreview[] {
  const allocationByGoalId = new Map(allocations.map((allocation) => [allocation.goalId, allocation]));

  const flattened = plan.drafts.flatMap((draft) => {
    const allocation = allocationByGoalId.get(draft.goalId);
    return (draft.todayPlan?.tomorrowCandidates ?? []).map((step) => ({
      id: step.id,
      title: step.title,
      detail: step.detail,
      duration: step.duration,
      statusNote: step.statusNote,
      goalId: draft.goalId,
      goalTitle: allocation?.title ?? draft.title,
      goalRole: allocation?.role ?? 'secondary',
      strategyLabel: dependencyStrategyLabel(step.dependencyStrategy),
    }));
  });

  return flattened.map((candidate, index) => ({
    ...candidate,
    assignedDayLabel: weekLabels[Math.min(index + 1, weekLabels.length - 1)],
  }));
}

function buildSupportRotation(allocations: DashboardGoalSchedulingItem[]) {
  const secondaryAllocations = allocations.filter((allocation) => allocation.role === 'secondary');
  if (!secondaryAllocations.length) {
    return weekLabels.map(() => null);
  }

  const slotCount = weekLabels.length;
  const totalShare = secondaryAllocations.reduce((sum, allocation) => sum + allocation.scheduledShare, 0) || 1;
  const drafted = secondaryAllocations.map((allocation) => {
    const exactCount = (allocation.scheduledShare / totalShare) * slotCount;
    return {
      allocation,
      exactCount,
      count: Math.floor(exactCount),
    };
  });

  let remainingSlots = slotCount - drafted.reduce((sum, item) => sum + item.count, 0);
  while (remainingSlots > 0) {
    drafted.sort((left, right) => (right.exactCount - right.count) - (left.exactCount - left.count));
    drafted[0]!.count += 1;
    remainingSlots -= 1;
  }

  const rotation: DashboardGoalSchedulingItem[] = [];
  const queue = drafted.map((item) => ({ ...item }));
  while (rotation.length < slotCount && queue.some((item) => item.count > 0)) {
    for (const item of queue) {
      if (item.count > 0) {
        rotation.push(item.allocation);
        item.count -= 1;
      }
      if (rotation.length === slotCount) {
        break;
      }
    }
  }

  while (rotation.length < slotCount) {
    rotation.push(queue[0]?.allocation ?? secondaryAllocations[0]);
  }

  return rotation;
}

function buildCalendarPreview(
  allocations: DashboardGoalSchedulingItem[],
  delayedCandidates: DelayedCandidatePreview[],
  primaryAllocation: DashboardGoalSchedulingItem | null,
): CalendarDayPreview[] {
  const supportRotation = buildSupportRotation(allocations);
  const delayedByDay = new Map<string, DelayedCandidatePreview[]>();

  for (const candidate of delayedCandidates) {
    const existing = delayedByDay.get(candidate.assignedDayLabel) ?? [];
    existing.push(candidate);
    delayedByDay.set(candidate.assignedDayLabel, existing);
  }

  return weekLabels.map((label, index) => {
    const supportGoal = supportRotation[index] ?? null;
    const delayed = delayedByDay.get(label) ?? [];
    const supportTitle = supportGoal?.title ?? primaryAllocation?.title ?? '当前主线';
    const note = delayed.length
      ? `先补回 ${delayed.length} 个延期步骤，再把剩余补位时间交给「${supportTitle}」。`
      : supportGoal
        ? `这一天保留主线连续块，同时让「${supportTitle}」吃掉剩余补位时间。`
        : '当前没有副目标补位项，整天围绕主目标连续推进。';

    return {
      label,
      supportGoal,
      delayed,
      note,
    };
  });
}

export function CalendarPage() {
  const scheduling = useAppStore((state) => state.dashboard.scheduling);
  const plan = useAppStore((state) => state.plan);

  const primaryAllocation = scheduling.allocations.find((allocation) => allocation.role === 'main') ?? null;
  const delayedCandidates = useMemo(
    () => buildDelayedCandidates(plan, scheduling.allocations),
    [plan, scheduling.allocations],
  );
  const weekPreview = useMemo(
    () => buildCalendarPreview(scheduling.allocations, delayedCandidates, primaryAllocation),
    [delayedCandidates, primaryAllocation, scheduling.allocations],
  );
  const secondaryShare = scheduling.allocations
    .filter((allocation) => allocation.role === 'secondary')
    .reduce((sum, allocation) => sum + allocation.scheduledShare, 0);
  const supportShare = primaryAllocation ? Math.max(100 - primaryAllocation.scheduledShare, 0) : 0;

  if (!primaryAllocation) {
    return (
      <div className="space-y-5">
        <Card className="bg-[radial-gradient(circle_at_top_right,_rgba(191,219,254,0.42),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(246,248,252,0.98)_100%)]">
          <Badge className="bg-white/90 text-slate-700">日历排程</Badge>
          <SectionTitle className="mt-4 text-3xl">先创建主目标，系统才会生成一周时间块</SectionTitle>
          <Muted className="mt-3 text-base leading-7">{scheduling.calendarHint}</Muted>
          <div className="mt-5 rounded-[1.4rem] bg-white/80 px-5 py-5 text-sm leading-6 text-slate-700">
            <div className="font-medium text-slate-900">{scheduling.headline}</div>
            <div className="mt-2">{scheduling.guardrail}</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(216,234,254,0.48),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(255,226,214,0.62),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(245,247,251,0.98)_100%)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="bg-white/90 text-slate-700">日历排程</Badge>
            <SectionTitle className="mt-4 text-3xl">系统会这样安排这一周，让主目标持续推进而不被打断</SectionTitle>
            <Muted className="mt-3 text-base leading-7">
              这个页面不要求你手动维护日程，而是把当前主线、副目标补位和延期候选如何落到一周时间块讲清楚。
            </Muted>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="bg-slate-900 text-white">{scheduling.primaryGoalTitle}</Badge>
              <Badge className="bg-white/90 text-slate-700">主目标优先占位 {primaryAllocation.scheduledShare}%</Badge>
              {secondaryShare ? <Badge className="bg-white/90 text-slate-700">副目标补位 {secondaryShare}%</Badge> : null}
              <Badge className="bg-white/90 text-slate-700">延期候选 {delayedCandidates.length}</Badge>
            </div>
          </div>

          <div className="w-full max-w-[21rem] rounded-[1.5rem] border border-white/80 bg-white/78 px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Sparkles className="h-4 w-4 text-slate-500" />
              本周排程摘要
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.2rem] bg-slate-50 px-4 py-4">
                <div className="font-medium text-slate-900">{scheduling.headline}</div>
                <div className="mt-2">{scheduling.guardrail}</div>
              </div>
              <div className="rounded-[1.2rem] bg-white px-4 py-4 ring-1 ring-slate-100">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">日历前置输入</div>
                <div className="mt-2">{scheduling.calendarHint}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.3fr,0.7fr]">
        <Card>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-slate-500" />
            <SectionTitle>一周时间块</SectionTitle>
          </div>
          <Muted className="mt-2">每天先锁住主目标连续块，再决定副目标补位和延期补回占用哪一段剩余时间。</Muted>
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-7">
            {weekPreview.map((day) => (
              <div key={day.label} className="rounded-[1.5rem] border border-white/80 bg-white/82 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900">{day.label}</div>
                  <Badge className={day.delayed.length ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}>
                    {day.delayed.length ? '优先补回' : day.supportGoal ? '混合排程' : '主线日'}
                  </Badge>
                </div>

                <div className="mt-4 flex h-56 flex-col gap-2 rounded-[1.25rem] bg-slate-50/90 p-2">
                  <div
                    className="flex min-h-[4.75rem] flex-col justify-between rounded-[1rem] bg-slate-900 px-3 py-3 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                    style={{ flex: `${Math.max(primaryAllocation.scheduledShare, 55)} 1 0%` }}
                  >
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-white/65">主目标优先占位 {primaryAllocation.scheduledShare}%</div>
                      <div className="mt-2 text-sm font-medium">{scheduling.primaryGoalTitle}</div>
                    </div>
                    <div className="text-xs leading-5 text-white/72">{primaryAllocation.focusLabel}</div>
                  </div>

                  {supportShare ? (
                    <div
                      className={`flex min-h-[3.5rem] flex-col justify-between rounded-[1rem] px-3 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
                        day.delayed.length ? 'bg-rose-50 text-rose-900' : 'bg-white text-slate-700'
                      }`}
                      style={{ flex: `${Math.max(supportShare, 18)} 1 0%` }}
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">副目标补位 {supportShare}%</div>
                      {day.delayed.length ? (
                        <div className="space-y-2">
                          {day.delayed.map((candidate) => (
                            <div key={candidate.id} className="rounded-[0.9rem] border border-rose-200/80 bg-white/90 px-3 py-2">
                              <div className="font-medium text-slate-900">{candidate.title}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-600">{candidate.goalTitle} · {candidate.duration}</div>
                            </div>
                          ))}
                        </div>
                      ) : day.supportGoal ? (
                        <div>
                          <div className="font-medium text-slate-900">{day.supportGoal.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">{day.supportGoal.focusLabel}</div>
                        </div>
                      ) : (
                        <div className="font-medium text-slate-700">当前没有副目标补位项</div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 text-xs leading-5 text-slate-500">{day.note}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2">
              <GitBranchPlus className="h-5 w-5 text-slate-500" />
              <SectionTitle>延期候选如何进入排程</SectionTitle>
            </div>
            <Muted className="mt-2">延期步骤不会消失，而是优先占用后续时间块，避免主线连续性被无声打断。</Muted>
            <div className="mt-5 space-y-3">
              {delayedCandidates.length ? delayedCandidates.map((candidate) => (
                <div key={`${candidate.goalId}-${candidate.id}`} className="rounded-[1.35rem] border border-white/80 bg-white/85 px-4 py-4 text-sm leading-6 text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{candidate.title}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={candidate.goalRole === 'main' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}>
                        {candidate.goalRole === 'main' ? '主目标补回' : '副目标补回'}
                      </Badge>
                      <Badge className="bg-white/90 text-slate-700">{candidate.assignedDayLabel}</Badge>
                      <Badge className="bg-white/90 text-slate-700">{candidate.strategyLabel}</Badge>
                    </div>
                  </div>
                  <div className="mt-2">{candidate.goalTitle} · {candidate.duration}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{candidate.statusNote || candidate.detail}</div>
                </div>
              )) : (
                <div className="rounded-[1.35rem] border border-dashed border-white/80 bg-white/72 px-4 py-5 text-sm leading-6 text-slate-600">
                  当前没有延期候选。系统会直接按主目标优先占位和副目标补位来铺这一周。
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Orbit className="h-5 w-5 text-slate-500" />
              <SectionTitle>系统为什么这样安排</SectionTitle>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.25rem] bg-slate-50 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">排程结论</div>
                <div className="mt-2 font-medium text-slate-900">{scheduling.headline}</div>
              </div>
              <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-slate-100">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">守则</div>
                <div className="mt-2">{scheduling.guardrail}</div>
              </div>
              <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-slate-100">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">冲突时</div>
                <div className="mt-2">先保主目标连续块，再让延期候选吃掉后半周的补位时间；如果还不够，才继续压缩副目标暴露，而不是打断主线。</div>
              </div>
              <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-slate-100">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">日历提示</div>
                <div className="mt-2">{scheduling.calendarHint}</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-slate-500" />
              <SectionTitle>目标占位比例</SectionTitle>
            </div>
            <div className="mt-5 space-y-3">
              {scheduling.allocations.map((allocation) => (
                <div key={allocation.goalId} className="rounded-[1.25rem] border border-white/80 bg-white/85 px-4 py-4 text-sm leading-6 text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{allocation.title}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={allocation.role === 'main' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}>
                        {allocation.role === 'main' ? `主目标优先占位 ${allocation.scheduledShare}%` : `副目标补位 ${allocation.scheduledShare}%`}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">原始权重 {allocation.rawWeight}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={allocation.role === 'main' ? 'h-full rounded-full bg-slate-900' : 'h-full rounded-full bg-[#f4a178]'}
                      style={{ width: `${allocation.scheduledShare}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{allocation.focusLabel}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
