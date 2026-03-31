import { useMemo, useState } from 'react';
import { Bot, Flag, LoaderCircle, RotateCcw, Trash2 } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  FeedbackBanner,
  type FeedbackMessage,
  StagedFeedbackPanel,
  createFeedbackMessage,
  useTransientHighlight,
} from '@/pages/dashboard/feedback-effects';
import { useAppStore } from '@/store/app-store';
import { ReflectionSheet } from '@/pages/dashboard/reflection-sheet';
import type { LearningGoal } from '@shared/app-state';
import {
  dangerButtonClassName,
  getActiveDraft,
  getActiveGoal,
  primaryButtonClassName,
  secondaryButtonClassName,
  sectionCardClassName,
  taskStatusBadgeClassName,
  taskStatusLabel,
} from '@/pages/dashboard/shared';

const roughPlanGenerationStages = [
  {
    label: '回收当前路径快照',
    detail: '先保留当前粗版结果作为上下文，再读取最新目标和阶段边界。',
  },
  {
    label: '重排周里程碑与关键节点',
    detail: '重新组织当前周里程碑、主线推进顺序和阶段验收点。',
  },
  {
    label: '刷新最近任务与调度预览',
    detail: '把新的关键动作、最近任务和日历调度输入同步回路径页。',
  },
];

export function PathPage({ onOpenCoach }: { onOpenCoach: () => void }) {
  const conversation = useAppStore((state) => state.conversation);
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const removeLearningGoal = useAppStore((state) => state.removeLearningGoal);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const regenerateLearningPlanDraft = useAppStore((state) => state.regenerateLearningPlanDraft);
  const scheduling = useAppStore((state) => state.dashboard.scheduling);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const milestones = activeDraft?.milestones ?? [];
  const currentMilestone = milestones.find((item) => item.status === 'current') ?? milestones[0] ?? null;
  const currentStage = activeDraft?.stages.find((stage) => stage.progress !== '已完成') ?? activeDraft?.stages[0] ?? null;
  const visibleTasks = activeDraft?.tasks.slice(0, 4) ?? [];
  const activeSnapshots = plan.snapshots.filter((snapshot) => snapshot.goalId === plan.activeGoalId);
  const roughPlanStale = conversation.tags.includes('rough-plan-stale');
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);
  const [goalNotice, setGoalNotice] = useState<FeedbackMessage | null>(null);
  const [goalPendingDeletionId, setGoalPendingDeletionId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { active: pathRefreshActive, trigger: triggerPathRefresh } = useTransientHighlight();
  const goalPendingDeletion = goals.find((goal) => goal.id === goalPendingDeletionId) ?? null;
  const deletionPreview = useMemo(
    () => (goalPendingDeletion ? buildGoalDeletionPreview(goals, plan, goalPendingDeletion.id) : null),
    [goalPendingDeletion, goals, plan],
  );
  const deleting = deletingGoalId !== null;

  async function onConfirmDeleteGoal() {
    if (!deletionPreview) {
      return;
    }

    setDeletingGoalId(deletionPreview.goal.id);
    setGoalNotice(null);
    try {
      await removeLearningGoal(deletionPreview.goal.id);
      setGoalPendingDeletionId(null);
      if (deletionPreview.deletingActiveGoal && deletionPreview.nextActiveGoal) {
        setGoalNotice(createFeedbackMessage({
          label: '目标已删除',
          title: `关联路径已清理，当前主目标切换为「${deletionPreview.nextActiveGoal.title}」`,
          detail: '系统已经同步移除这个目标的草案和历史快照，主线会自动切到新的当前目标。',
          tone: 'warning',
        }));
      } else if (deletionPreview.deletingActiveGoal) {
        setGoalNotice(createFeedbackMessage({
          label: '目标已删除',
          title: '关联路径已清理，当前已经没有主目标',
          detail: '请先新建一个学习方向，或回到建档流程重新确认长期主线。',
          tone: 'warning',
        }));
      } else {
        setGoalNotice(createFeedbackMessage({
          label: '目标已删除',
          title: '这个目标以及它绑定的路径数据已经一起清理',
          detail: '当前主目标保持不变，只移除了这个目标自己的草案和历史快照。',
          tone: 'warning',
        }));
      }
    } catch (error) {
      setGoalNotice(createFeedbackMessage({
        label: '删除失败',
        title: '目标没有删除成功',
        detail: error instanceof Error ? error.message : '目标删除失败。',
        tone: 'danger',
      }));
    } finally {
      setDeletingGoalId(null);
    }
  }

  async function handleRegenerateRoughPlan() {
    if (!activeGoal) {
      setGoalNotice(createFeedbackMessage({
        label: '无法刷新',
        title: '当前没有主目标，不能重新生成粗版路径',
        detail: '请先确认主目标，系统才能围绕同一条长期主线刷新周里程碑和关键节点。',
        tone: 'danger',
      }));
      return;
    }

    setRegenerating(true);
    setGoalNotice(null);
    try {
      await regenerateLearningPlanDraft({
        goalId: activeGoal.id,
        snapshotDraft: activeDraft ?? null,
      });
      triggerPathRefresh();
      setGoalNotice(createFeedbackMessage({
        label: '粗版路径已刷新',
        title: '新的周里程碑、关键节点和最近任务已经同步更新',
        detail: '系统已基于当前主目标重新整理长期主线，你可以继续查看周节奏，或回到今日页生成新的细版执行。',
        tone: 'success',
        chips: [
          activeGoal.title,
          '周里程碑已刷新',
        ],
      }));
    } catch (error) {
      setGoalNotice(createFeedbackMessage({
        label: '刷新失败',
        title: '粗版路径没有重新生成成功',
        detail: error instanceof Error ? error.message : '粗版计划重生成失败。',
        tone: 'danger',
      }));
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="bg-[radial-gradient(circle_at_top_right,_rgba(219,234,254,0.48),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(246,248,252,0.98)_100%)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="bg-white/90 text-slate-700">当前粗版路径</Badge>
              <SectionTitle className="mt-4 text-3xl">{activeGoal?.title ?? '还没有主目标'}</SectionTitle>
              <Muted className="mt-3 text-base leading-7">
                {activeDraft?.summary ?? '建档完成后，这里会把长期学习主线整理成周里程碑、关键节点和少量最近任务。'}
              </Muted>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="bg-slate-900 text-white">{activeGoal?.cycle ?? '待设置周期'}</Badge>
                <Badge className="bg-white/90 text-slate-700">{activeGoal?.role === 'main' ? '主目标' : '副目标'}</Badge>
                <Badge className="bg-white/90 text-slate-700">领域 {goalDomainBadgeLabel(activeGoal?.domain)}</Badge>
                <Badge className="bg-white/90 text-slate-700">调度权重 {activeGoal?.scheduleWeight ?? 0}</Badge>
                <Badge className="bg-white/90 text-slate-700">{currentMilestone?.title ?? '等待第一个周里程碑'}</Badge>
                <Badge className="bg-white/90 text-slate-700">{activeSnapshots.length} 个历史快照</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryButtonClassName} onClick={() => void handleRegenerateRoughPlan()} disabled={regenerating || !activeGoal}>
                {regenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                重新生成粗版计划
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={onOpenCoach}>
                <Bot className="h-4 w-4" />
                记录变化
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={() => setReflectionOpen(true)}>
                阶段复盘
              </button>
            </div>
          </div>
        </Card>

        <StagedFeedbackPanel
          active={regenerating}
          label="粗版刷新中"
          title="系统正在刷新这条长期学习主线"
          description="先保留当前快照，再按最新目标状态重排周里程碑、关键节点和最近任务，避免路径和执行页脱节。"
          stages={roughPlanGenerationStages}
        />

        {roughPlanStale ? (
          <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            <div className="font-medium">粗版路径已过期</div>
            <div className="mt-1">最近的目标方向发生变化，当前周里程碑和关键节点不再可靠。请先点击“重新生成粗版计划”，再回到今日页安排细版执行。</div>
          </div>
        ) : null}

        {goalNotice ? (
          <FeedbackBanner message={goalNotice} />
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className={cn(pathRefreshActive && 'feedback-target-surface is-active')}>
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-slate-500" />
              <SectionTitle>周里程碑</SectionTitle>
            </div>
            <div className="mt-5 space-y-3">
              {milestones.length ? milestones.map((milestone) => (
                <div
                  key={`${milestone.title}-${milestone.focus}`}
                  className={`rounded-[1.4rem] border px-4 py-4 ${milestone.status === 'current' ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]' : 'border-white/80 bg-white/85 text-slate-900'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-base font-semibold">{milestone.title}</div>
                    <Badge className={milestone.status === 'current' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'}>
                      {milestone.status === 'current' ? '当前周里程碑' : milestone.status === 'completed' ? '已完成' : '下一节点'}
                    </Badge>
                  </div>
                  <div className={milestone.status === 'current' ? 'mt-3 text-sm leading-6 text-white/80' : 'mt-3 text-sm leading-6 text-slate-700'}>
                    聚焦：{milestone.focus}
                  </div>
                  <div className={milestone.status === 'current' ? 'mt-2 text-sm leading-6 text-white/74' : 'mt-2 text-sm leading-6 text-slate-500'}>
                    完成标志：{milestone.outcome}
                  </div>
                </div>
              )) : <Muted>当前还没有周里程碑，先完成建档。</Muted>}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <SectionTitle>调度预览</SectionTitle>
              <Muted className="mt-2">先保主目标连续推进，再让副目标补位；这组结果会直接作为后续日历排程输入。</Muted>
              <div className="mt-4 rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                <div className="font-medium text-slate-900">{scheduling.headline}</div>
                <div className="mt-2">{scheduling.guardrail}</div>
                <div className="mt-2">{scheduling.calendarHint}</div>
              </div>
              <div className="mt-4 space-y-3">
                {scheduling.allocations.map((allocation) => (
                  <div key={allocation.goalId} className="rounded-[1.2rem] border border-slate-200 bg-white/85 px-4 py-4 text-sm leading-6 text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-medium text-slate-900">{allocation.title}</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={allocation.role === 'main' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}>
                          {allocation.role === 'main' ? `主目标优先占位 ${allocation.scheduledShare}%` : `副目标补位 ${allocation.scheduledShare}%`}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700">原始权重 {allocation.rawWeight}</Badge>
                        <Badge className="bg-slate-100 text-slate-700">延期候选 {allocation.delayedCandidateCount}</Badge>
                      </div>
                    </div>
                    <div className="mt-2">{allocation.focusLabel}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className={cn(pathRefreshActive && 'feedback-target-surface is-active')}>
              <SectionTitle>当前关键节点</SectionTitle>
              {currentMilestone ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.2rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    <div className="font-medium text-slate-900">{currentMilestone.title}</div>
                    <div className="mt-2">本周目标：{currentMilestone.focus}</div>
                    <div className="mt-2">验收结果：{currentMilestone.outcome}</div>
                  </div>
                  {currentStage ? (
                    <div className="rounded-[1.2rem] bg-white/85 px-4 py-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-100">
                      <div className="font-medium text-slate-900">{currentStage.title}</div>
                      <div className="mt-2">{currentStage.outcome}</div>
                      <div className="mt-2 text-xs text-slate-500">当前进度：{currentStage.progress}</div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Muted className="mt-4">当前还没有关键节点，先完成建档。</Muted>
              )}
              {reflectionNotice ? (
                <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {reflectionNotice}
                </div>
              ) : null}
            </Card>

            <Card className={cn(pathRefreshActive && 'feedback-target-surface is-active')}>
              <SectionTitle>重要检查点</SectionTitle>
              <div className="mt-4 space-y-3">
                {(activeDraft?.stages ?? []).map((stage) => (
                  <div key={`${stage.title}-${stage.outcome}`} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    <div className="font-medium text-slate-900">{stage.title}</div>
                    <div className="mt-1">{stage.outcome}</div>
                    <div className="mt-1 text-xs text-slate-500">进度：{stage.progress}</div>
                  </div>
                ))}
                {!activeDraft?.stages.length ? <Muted>当前还没有重要检查点。</Muted> : null}
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
          <Card className={cn(pathRefreshActive && 'feedback-target-surface is-active')}>
            <SectionTitle>最近任务</SectionTitle>
            <Muted className="mt-2">最近任务保留为辅助信息，真正的日执行请去今日页生成细版计划。</Muted>
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
              )) : <Muted>当前还没有最近任务。</Muted>}
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <SectionTitle>目标管理</SectionTitle>
                <Muted className="mt-2">在当前学习路径里明确主目标 / 副目标，并查看后续日历调度会参考的权重边界。</Muted>
              </div>
              <div className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                当前主目标关联 {activeDraft ? '1' : '0'} 个草案，{activeSnapshots.length} 个历史快照，当前调度权重 {activeGoal?.scheduleWeight ?? 0}。
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {goals.length ? goals.map((goal) => {
                const goalDraftCount = plan.drafts.filter((draft) => draft.goalId === goal.id).length;
                const goalSnapshotCount = plan.snapshots.filter((snapshot) => snapshot.goalId === goal.id).length;
                const active = goal.id === plan.activeGoalId;
                const deletingThisGoal = deletingGoalId === goal.id;

                return (
                  <div key={goal.id} className={`rounded-[1.5rem] border px-4 py-4 ${active ? 'border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]' : 'border-white/80 bg-white/85 text-slate-900'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold">{goal.title}</div>
                        <Muted className={active ? 'mt-2 text-white/75' : 'mt-2'}>
                          {goal.motivation || '还没填写学习动机，建议补充后再继续细化路径。'}
                        </Muted>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={active ? 'bg-white/15 text-white' : 'bg-slate-900 text-white'}>{active ? '当前主目标' : goal.role === 'main' ? '主目标' : '副目标'}</Badge>
                        <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.priority}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.status === 'active' ? '进行中' : goal.status === 'paused' ? '暂停' : '已完成'}</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.cycle || '未设置周期'}</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.role === 'main' ? '主目标' : '副目标'}</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>领域 {goalDomainBadgeLabel(goal.domain)}</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>调度权重 {goal.scheduleWeight}</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goalDraftCount} 个计划草案</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goalSnapshotCount} 个历史快照</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={active ? primaryButtonClassName : secondaryButtonClassName}
                        onClick={() => void setActiveGoal(goal.id)}
                        disabled={deleting || active}
                      >
                        {active ? '当前主目标' : '设为当前目标'}
                      </button>
                      <button
                        type="button"
                        className={dangerButtonClassName}
                        onClick={() => {
                          setGoalNotice(null);
                          setGoalPendingDeletionId(goal.id);
                        }}
                        disabled={deleting}
                      >
                        {deletingThisGoal ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {deletingThisGoal ? '删除中…' : '删除目标'}
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-[1.5rem] border border-dashed border-white/80 bg-white/70 px-5 py-5 text-sm text-slate-600">
                  当前还没有学习目标。删除最后一个目标后，路径页会回到空状态，之后需要重新建档或新建目标。
                </div>
              )}
            </div>
          </Card>
        </div>

        <details className={sectionCardClassName}>
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">高级内容：完整依据与历史快照</summary>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-900">完整依据</div>
              <div className="mt-3 space-y-2">
                {(activeDraft?.basis ?? []).map((item) => (
                  <div key={item} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{item}</div>
                ))}
                {!activeDraft?.basis.length ? <Muted>当前还没有完整依据。</Muted> : null}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">历史快照</div>
              <div className="mt-3 space-y-2">
                {activeSnapshots
                  .slice(0, 3)
                  .map((snapshot) => (
                    <div key={snapshot.id} className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      <div className="font-medium text-slate-900">v{snapshot.version} · {snapshot.title}</div>
                      <div className="mt-1">{snapshot.summary}</div>
                    </div>
                  ))}
                {!activeSnapshots.length ? <Muted>当前还没有历史快照。</Muted> : null}
              </div>
            </div>
          </div>
        </details>
      </div>

      {goalPendingDeletion && deletionPreview ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-900">确认删除这个学习目标？</div>
                <div className="mt-1 text-sm text-slate-600">这是一个破坏性操作，会把目标本身以及与它绑定的计划数据一起清理。</div>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <div>目标名称：{goalPendingDeletion.title}</div>
              <div>将清理的计划草案：{deletionPreview.draftCount} 个。</div>
              <div>将清理的历史快照：{deletionPreview.snapshotCount} 个。</div>
              {deletionPreview.deletingActiveGoal && deletionPreview.nextActiveGoal ? <div>删除后新的当前主目标：{deletionPreview.nextActiveGoal.title}</div> : null}
              {deletionPreview.deletingActiveGoal && !deletionPreview.nextActiveGoal ? <div>删除后将不再有当前主目标，计划页会进入空状态。</div> : null}
              {!deletionPreview.deletingActiveGoal ? <div>当前主目标保持不变，只清理这个目标自己的数据。</div> : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={() => setGoalPendingDeletionId(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button type="button" className={dangerButtonClassName} onClick={() => void onConfirmDeleteGoal()} disabled={deleting}>
                {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

function buildGoalDeletionPreview(
  goals: ReturnType<typeof useAppStore.getState>['goals'],
  plan: ReturnType<typeof useAppStore.getState>['plan'],
  goalId: string,
) {
  const goal = goals.find((item) => item.id === goalId) ?? null;
  if (!goal) {
    return null;
  }

  const remainingGoals = goals.filter((item) => item.id !== goalId);
  return {
    goal,
    draftCount: plan.drafts.filter((draft) => draft.goalId === goalId).length,
    snapshotCount: plan.snapshots.filter((snapshot) => snapshot.goalId === goalId).length,
    deletingActiveGoal: plan.activeGoalId === goalId,
    nextActiveGoal: plan.activeGoalId === goalId ? (remainingGoals[0] ?? null) : null,
  };
}

function goalDomainBadgeLabel(domain?: LearningGoal['domain']) {
  switch (domain) {
    case 'programming':
      return '编程';
    case 'instrument':
      return '乐器';
    case 'fitness':
      return '健身';
    case 'general':
    default:
      return '通用';
  }
}
