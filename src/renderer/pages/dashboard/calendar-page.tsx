import { CalendarRange, Clock3, GitBranchPlus, Orbit, Sparkles } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';

function delayedLaneLabel(assignedLane: 'anchor' | 'support') {
  return assignedLane === 'anchor' ? '主目标补回' : '副目标补回';
}

function delayedLaneBadgeClassName(assignedLane: 'anchor' | 'support') {
  return assignedLane === 'anchor' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700';
}

export function CalendarPage() {
  const scheduling = useAppStore((state) => state.dashboard.scheduling);

  const primaryAllocation = scheduling.allocations.find((allocation) => allocation.role === 'main') ?? null;
  const secondaryShare = scheduling.allocations
    .filter((allocation) => allocation.role === 'secondary')
    .reduce((sum, allocation) => sum + allocation.scheduledShare, 0);
  const weeklyPlan = scheduling.weeklyPlan;
  const delayedPlacements = scheduling.delayedPlacements;

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
              <Badge className="bg-white/90 text-slate-700">延期候选 {delayedPlacements.length}</Badge>
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
          <Muted className="mt-2">从周一到周日，每天先锁住主目标连续块，再决定副目标补位和延期补回占用哪一段剩余时间。</Muted>
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-7">
            {weeklyPlan.map((day) => (
              <div key={day.label} className="rounded-[1.5rem] border border-white/80 bg-white/82 px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900">{day.label}</div>
                  <Badge
                    className={day.anchorCarryovers.length || day.supportCarryovers.length
                      ? 'bg-rose-100 text-rose-800'
                      : day.supportGoalId
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-slate-100 text-slate-700'}
                  >
                    {day.anchorCarryovers.length || day.supportCarryovers.length ? '优先补回' : day.supportGoalId ? '混合排程' : '主线日'}
                  </Badge>
                </div>

                <div className="mt-4 flex h-64 flex-col gap-2 rounded-[1.25rem] bg-slate-50/90 p-2">
                  <div
                    className="flex min-h-[5.5rem] flex-col justify-between rounded-[1rem] bg-slate-900 px-3 py-3 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
                    style={{ flex: `${Math.max(day.anchorShare, 55)} 1 0%` }}
                  >
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-white/65">主目标优先占位 {day.anchorShare}%</div>
                      <div className="mt-2 text-sm font-medium">{day.anchorGoalTitle}</div>
                    </div>
                    {day.anchorCarryovers.length ? (
                      <div className="space-y-2">
                        {day.anchorCarryovers.map((item) => (
                          <div key={item.stepId} className="rounded-[0.9rem] border border-white/15 bg-white/10 px-3 py-2">
                            <div className="text-sm font-medium text-white">{item.title}</div>
                            <div className="mt-1 text-xs leading-5 text-white/70">{item.duration}</div>
                          </div>
                        ))}
                        <div className="text-xs leading-5 text-white/70">补回后仍剩 {day.remainingAnchorMinutes} 分钟主线连续时间</div>
                      </div>
                    ) : (
                      <div className="text-xs leading-5 text-white/72">补回后仍剩 {day.remainingAnchorMinutes} 分钟主线连续时间</div>
                    )}
                  </div>

                  {day.supportShare ? (
                    <div
                      className={`flex min-h-[4rem] flex-col justify-between rounded-[1rem] px-3 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
                        day.supportCarryovers.length ? 'bg-rose-50 text-rose-900' : 'bg-white text-slate-700'
                      }`}
                      style={{ flex: `${Math.max(day.supportShare, 18)} 1 0%` }}
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">副目标补位 {day.supportShare}%</div>
                      {day.supportCarryovers.length ? (
                        <div className="space-y-2">
                          {day.supportCarryovers.map((item) => (
                            <div key={item.stepId} className="rounded-[0.9rem] border border-rose-200/80 bg-white/90 px-3 py-2">
                              <div className="font-medium text-slate-900">{item.title}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-600">{item.goalTitle} · {item.duration}</div>
                            </div>
                          ))}
                          <div className="text-xs leading-5 text-slate-500">补回后仍剩 {day.remainingSupportMinutes} 分钟补位时间</div>
                        </div>
                      ) : day.supportGoalId ? (
                        <div>
                          <div className="font-medium text-slate-900">{day.supportGoalTitle}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">{day.supportGoalFocusLabel || '这一天会吃掉剩余补位时间。'}</div>
                          <div className="mt-2 text-xs leading-5 text-slate-500">剩余补位时间 {day.remainingSupportMinutes} 分钟</div>
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
            <Muted className="mt-2">延期步骤不会消失，而是优先占用后续时间块；如果当天补位窗口冲突，系统会继续往后挪。</Muted>
            <div className="mt-5 space-y-3">
              {delayedPlacements.length ? delayedPlacements.map((candidate) => (
                <div key={`${candidate.goalId}-${candidate.stepId}`} className="rounded-[1.35rem] border border-white/80 bg-white/85 px-4 py-4 text-sm leading-6 text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-medium text-slate-900">{candidate.title}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={delayedLaneBadgeClassName(candidate.assignedLane)}>
                        {delayedLaneLabel(candidate.assignedLane)}
                      </Badge>
                      <Badge className="bg-white/90 text-slate-700">{candidate.assignedDayLabel}</Badge>
                      <Badge className="bg-white/90 text-slate-700">{candidate.strategyLabel}</Badge>
                    </div>
                  </div>
                  <div className="mt-2">{candidate.goalTitle} · {candidate.duration}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{candidate.statusNote || candidate.detail}</div>
                  {candidate.movedReason ? (
                    <div className="mt-2 rounded-[1rem] bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                      冲突时：{candidate.movedReason}
                    </div>
                  ) : null}
                  {candidate.overflowMinutes > 0 ? (
                    <div className="mt-2 text-xs leading-5 text-rose-700">当前仍有 {candidate.overflowMinutes} 分钟需要后续继续挪动。</div>
                  ) : null}
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
                <div className="mt-2">先保主目标连续块，再检查副目标补位窗口是否匹配；如果当天窗口冲突，系统会把延期步骤继续往后挪，而不是无声打断主线。</div>
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
