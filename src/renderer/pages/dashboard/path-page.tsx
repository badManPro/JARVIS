import { useMemo, useState } from 'react';
import { Bot, LoaderCircle, Trash2 } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import { ReflectionSheet } from '@/pages/dashboard/reflection-sheet';
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

export function PathPage({ onOpenCoach }: { onOpenCoach: () => void }) {
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const removeLearningGoal = useAppStore((state) => state.removeLearningGoal);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const visibleTasks = activeDraft?.tasks.slice(0, 5) ?? [];
  const currentStage = activeDraft?.stages.find((stage) => stage.progress !== '已完成') ?? activeDraft?.stages[0] ?? null;
  const activeSnapshots = plan.snapshots.filter((snapshot) => snapshot.goalId === plan.activeGoalId);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [reflectionNotice, setReflectionNotice] = useState<string | null>(null);
  const [goalNotice, setGoalNotice] = useState<string | null>(null);
  const [goalPendingDeletionId, setGoalPendingDeletionId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
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
        setGoalNotice(`目标已删除，关联计划草案与版本快照也已清理。当前主目标已切换为「${deletionPreview.nextActiveGoal.title}」。`);
      } else if (deletionPreview.deletingActiveGoal) {
        setGoalNotice('目标已删除，关联计划草案与版本快照也已清理。当前已无主目标，请先新建一个学习方向。');
      } else {
        setGoalNotice('目标已删除，关联计划草案与版本快照也已清理。');
      }
    } catch (error) {
      setGoalNotice(error instanceof Error ? error.message : '目标删除失败');
    } finally {
      setDeletingGoalId(null);
    }
  }

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

        <Card>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <SectionTitle>目标管理</SectionTitle>
              <Muted className="mt-2">在当前学习路径里直接切换主目标，或删除不再需要的目标数据。</Muted>
            </div>
            <div className="rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
              当前主目标关联 {activeDraft ? '1' : '0'} 个草案，{activeSnapshots.length} 个历史快照。
            </div>
          </div>
          {goalNotice ? (
            <div className="mt-4 rounded-[1.2rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              {goalNotice}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
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
                      <Badge className={active ? 'bg-white/15 text-white' : 'bg-slate-900 text-white'}>{active ? '当前主目标' : '候选目标'}</Badge>
                      <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.priority}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.status === 'active' ? '进行中' : goal.status === 'paused' ? '暂停' : '已完成'}</Badge>
                    <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.cycle || '未设置周期'}</Badge>
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
              <div className="rounded-[1.5rem] border border-dashed border-white/80 bg-white/70 px-5 py-5 text-sm text-slate-600 xl:col-span-2">
                当前还没有学习目标。删除最后一个目标后，路径页会回到空状态，之后需要重新建档或新建目标。
              </div>
            )}
          </div>
        </Card>

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
        </div>
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
