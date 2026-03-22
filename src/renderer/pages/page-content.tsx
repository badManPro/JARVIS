import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, Flag, GitCompareArrows, History, PencilLine, Plus, RefreshCcw, Sparkles, Target, Trash2 } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import type { PageDefinition } from '@/pages/page-data';
import type {
  AppState,
  ConversationActionKind,
  ConversationActionPreview,
  ConversationActionReviewStatus,
  ConversationActionScope,
  ConversationActionStatus,
  LearningGoal,
  LearningPlanDraft,
  LearningPlanSnapshot,
  LearningPlanStage,
  ModelCapability,
  PlanTask,
  ProviderConfig,
  ProviderId,
  TaskStatus,
  UserProfile,
} from '@shared/app-state';
import type { AiCapabilityObservabilitySummary, AiObservabilitySnapshot, AiProviderHealthCheckResult, AiRequestLogEntry, AiRuntimeSummaryItem } from '@shared/ai-service';
import { resolveConversationState } from '@shared/app-state';
import type { LearningGoalInput } from '@shared/goal';
import type { ProviderConfigInput } from '@shared/provider-config';

const providerOptions: Array<{ value: ProviderId; label: string }> = [
  { value: 'openai', label: 'OpenAI / GPT' },
  { value: 'glm', label: 'Zhipu / GLM' },
  { value: 'kimi', label: 'Moonshot / Kimi' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: 'Custom' },
];

const capabilityOptions: Array<{ value: ModelCapability; label: string }> = [
  { value: 'profile_extraction', label: '画像提取' },
  { value: 'plan_generation', label: '计划生成' },
  { value: 'plan_adjustment', label: '计划调整' },
  { value: 'reflection_summary', label: '复盘总结' },
  { value: 'chat_general', label: '通用对话' },
];

const routingItems: Array<{ key: keyof AppState['settings']['routing']; label: string }> = [
  { key: 'profileExtraction', label: '画像提取' },
  { key: 'planGeneration', label: '计划生成' },
  { key: 'planAdjustment', label: '计划调整' },
  { key: 'reflectionSummary', label: '复盘总结' },
  { key: 'generalChat', label: '通用对话' },
];

const startPageOptions = ['首页', '学习计划', '目标', '对话', '用户画像', '复盘', '设置'];
const themeOptions = ['跟随系统', '浅色', '深色'];

function getActivePlanDraft(drafts: LearningPlanDraft[], activeGoalId: string) {
  return drafts.find((draft) => draft.goalId === activeGoalId) ?? drafts[0] ?? null;
}

export function PageContent({ page }: { page: PageDefinition }) {
  const state = useAppStore();

  switch (page.id) {
    case 'home':
      return (
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <Card>
            <SectionTitle>今日聚焦</SectionTitle>
            <div className="mt-4 space-y-3">
              <div className="text-2xl font-semibold">{state.dashboard.todayFocus}</div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <Badge>{state.dashboard.stage}</Badge>
                <Badge>{state.dashboard.duration}</Badge>
                <Badge>本周完成率 {state.dashboard.weeklyCompletion}%</Badge>
              </div>
              <Muted>连续学习 {state.dashboard.streakDays} 天，保持低摩擦推进。</Muted>
            </div>
          </Card>
          <Card>
            <SectionTitle>近期复盘摘要</SectionTitle>
            <p className="mt-4 text-sm text-slate-700">{state.dashboard.reflectionSummary}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {state.dashboard.quickActions.map((action) => (
                <li key={action} className="rounded-lg bg-slate-50 px-3 py-2">{action}</li>
              ))}
            </ul>
          </Card>
          <Card className="lg:col-span-2">
            <SectionTitle>待处理提醒</SectionTitle>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {state.dashboard.alerts.map((alert) => (
                <div key={alert} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{alert}</div>
              ))}
            </div>
          </Card>
        </div>
      );
    case 'plans': {
      return <PlansContent />;
    }
    case 'goals':
      return <GoalsContent />;
    case 'conversation':
      return <ConversationContent />;
    case 'profile':
      return <ProfileContent />;
    case 'reflection':
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle>{state.reflection.period}复盘</SectionTitle>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div><span className="font-medium">完成任务数：</span>{state.reflection.completedTasks}</div>
              <div><span className="font-medium">实际投入：</span>{state.reflection.actualDuration}</div>
              <div><span className="font-medium">偏差：</span>{state.reflection.deviation}</div>
            </div>
          </Card>
          <Card>
            <SectionTitle>复盘结论</SectionTitle>
            <p className="mt-4 text-sm text-slate-700">{state.reflection.insight}</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {state.reflection.nextActions.map((item) => (
                <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      );
    case 'settings':
      return <SettingsContent />;
    default:
      return null;
  }
}

function ConversationContent() {
  const state = useAppStore();
  const runProfileExtraction = useAppStore((store) => store.runProfileExtraction);
  const reviewConversationActionPreview = useAppStore((store) => store.reviewConversationActionPreview);
  const applyAcceptedConversationActionPreviews = useAppStore((store) => store.applyAcceptedConversationActionPreviews);
  const conversation = useMemo(() => resolveConversationState(state), [state]);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [extractingSuggestions, setExtractingSuggestions] = useState(false);
  const [applyingAccepted, setApplyingAccepted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const unreviewedCount = useMemo(
    () => conversation.actionPreviews.filter((item) => item.reviewable && item.reviewStatus === 'unreviewed').length,
    [conversation.actionPreviews],
  );
  const acceptedCount = useMemo(
    () => conversation.actionPreviews.filter((item) => item.reviewStatus === 'accepted' && item.status === 'proposed').length,
    [conversation.actionPreviews],
  );
  const acceptedExecutableCount = useMemo(
    () => conversation.actionPreviews.filter((item) => item.reviewStatus === 'accepted' && item.status === 'proposed' && Boolean(item.execution)).length,
    [conversation.actionPreviews],
  );
  const appliedCount = useMemo(
    () => conversation.actionPreviews.filter((item) => item.status === 'applied').length,
    [conversation.actionPreviews],
  );
  const rejectedCount = useMemo(
    () => conversation.actionPreviews.filter((item) => item.reviewStatus === 'rejected').length,
    [conversation.actionPreviews],
  );
  const pendingCount = useMemo(
    () => conversation.actionPreviews.filter((item) => item.status === 'pending').length,
    [conversation.actionPreviews],
  );

  const onReviewAction = async (payload: { actionId: string; reviewStatus: ConversationActionReviewStatus }) => {
    const currentAction = conversation.actionPreviews.find((item) => item.id === payload.actionId);
    setUpdatingActionId(payload.actionId);
    setNotice(null);

    try {
      await reviewConversationActionPreview(payload);
      switch (payload.reviewStatus) {
        case 'accepted':
          setNotice(
            currentAction?.execution
              ? '该预览已加入待应用列表，点击“应用已接受变更”后会真正写入本地实体。'
              : '该预览已标记为接受，但它目前仍是解释型预览，真正应用时会被跳过。',
          );
          break;
        case 'rejected':
          setNotice('该预览已标记为“暂不采纳”，当前不会进入后续执行。');
          break;
        case 'unreviewed':
          setNotice('已恢复为待确认状态。');
          break;
        default:
          setNotice(null);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新预览审核状态失败');
    } finally {
      setUpdatingActionId(null);
    }
  };

  const onRunProfileExtraction = async () => {
    setExtractingSuggestions(true);
    setNotice(null);

    try {
      const nextState = await runProfileExtraction();
      const nextConversation = resolveConversationState(nextState);
      setNotice(`已从当前对话提取 ${nextConversation.suggestions.length} 条建议，并生成 ${nextConversation.actionPreviews.length} 张结构化预览。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '对话建议提取失败');
    } finally {
      setExtractingSuggestions(false);
    }
  };

  const onApplyAcceptedActions = async () => {
    setApplyingAccepted(true);
    setNotice(null);

    try {
      const result = await applyAcceptedConversationActionPreviews();
      if (result.appliedActionIds.length) {
        setNotice(
          result.skippedActionIds.length
            ? `已将 ${result.appliedActionIds.length} 条已接受预览写入本地实体，另有 ${result.skippedActionIds.length} 条解释型预览被跳过。`
            : `已将 ${result.appliedActionIds.length} 条已接受预览写入画像、目标或计划实体，并同步刷新当前页面状态。`,
        );
      } else if (result.skippedActionIds.length) {
        setNotice(`当前没有可执行的已接受预览；已跳过 ${result.skippedActionIds.length} 条解释型预览。`);
      } else {
        setNotice('当前没有待应用的已接受预览。');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '应用已接受预览失败');
    } finally {
      setApplyingAccepted(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
      <Card>
        <SectionTitle>{conversation.title}</SectionTitle>
        <Muted className="mt-2">目标：{conversation.relatedGoal} · 计划：{conversation.relatedPlan}</Muted>
        <div className="mt-4 space-y-3">
          {conversation.messages.map((message) => (
            <div key={message.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{message.role}</div>
              {message.content}
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))]">
        <SectionTitle>结构化动作预览</SectionTitle>
        <Muted className="mt-2">先逐条确认，再把已接受且可执行的预览统一写入画像、目标或计划实体；仅展示型预览会在应用时被跳过。</Muted>

        <div className="mt-4 flex flex-wrap gap-2">
          {conversation.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="待你决定" value={String(unreviewedCount)} />
          <StatCard label="待应用" value={String(acceptedCount)} />
          <StatCard label="已应用" value={String(appliedCount)} />
          <StatCard label="已拒绝" value={String(rejectedCount)} />
          <StatCard label="仍待接入" value={String(pendingCount)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-3">
          <div className="text-sm text-slate-600">
            当前有 {acceptedCount} 条已接受预览，其中 {acceptedExecutableCount} 条可直接写入实体。
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={secondaryButtonClassName}
              type="button"
              onClick={() => void onRunProfileExtraction()}
              disabled={extractingSuggestions || applyingAccepted}
            >
              <Sparkles className="mr-1 inline h-4 w-4" />
              {extractingSuggestions ? '提取中…' : '从当前对话提取建议'}
            </button>
            <button
              className={successButtonClassName}
              type="button"
              onClick={() => void onApplyAcceptedActions()}
              disabled={extractingSuggestions || applyingAccepted || acceptedCount === 0}
            >
              {applyingAccepted ? '应用中…' : `应用已接受变更${acceptedCount ? `（${acceptedCount}）` : ''}`}
            </button>
          </div>
        </div>

        {notice ? (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">{notice}</div>
        ) : null}

        {conversation.actionPreviews.length ? (
          <div className="mt-4 space-y-4">
            {conversation.actionPreviews.map((action) => (
              <ConversationActionPreviewCard
                key={action.id}
                action={action}
                updating={updatingActionId === action.id}
                onReviewAction={onReviewAction}
              />
            ))}
          </div>
        ) : (
          <Muted className="mt-4">当前还没有可映射的结构化建议，后续对话建议会先在这里进入预览、审核和应用链路。</Muted>
        )}
      </Card>
    </div>
  );
}

function ConversationActionPreviewCard({
  action,
  updating,
  onReviewAction,
}: {
  action: ConversationActionPreview;
  updating: boolean;
  onReviewAction: (payload: { actionId: string; reviewStatus: ConversationActionReviewStatus }) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={conversationActionIconWrapClassName(action)}>
            {conversationActionIcon(action)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">{action.title}</div>
            <Muted className="mt-1 max-w-xl">{action.summary}</Muted>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge className={conversationActionStatusBadgeClassName(action.status)}>{conversationActionStatusLabel(action.status)}</Badge>
          <Badge className={conversationActionReviewBadgeClassName(action)}>{conversationActionReviewLabel(action)}</Badge>
          <Badge className={conversationActionTargetBadgeClassName(action.target)}>{conversationActionTargetLabel(action.target)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-white text-slate-600 ring-1 ring-slate-200">{conversationActionKindLabel(action.kind)}</Badge>
        {action.scopes.map((scope) => (
          <Badge key={`${action.id}-${scope}`} className="bg-slate-100 text-slate-700">{conversationActionTargetLabel(scope)}</Badge>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {action.changes.map((change) => (
          <div key={`${action.id}-${change.field}`} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{change.label}</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ComparisonValueCard label="当前" value={change.before ?? '无'} />
              <ComparisonValueCard label="建议后" value={change.after ?? '无'} emphasized />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">为什么建议这样改</div>
        <div className="mt-2 text-sm leading-6 text-slate-700">{action.reason}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
        <div className="text-sm text-slate-600">
          {action.status === 'applied'
            ? '这条预览已经写入本地实体，相关页面状态已同步刷新。'
            : action.reviewable
              ? (action.reviewStatus === 'unreviewed'
                ? '你可以先确认或拒绝这条预览；接受后再统一应用到真实实体。'
                : `当前审核结果：${conversationActionReviewLabel(action)}${action.reviewedAt ? ` · ${formatDateTime(action.reviewedAt)}` : ''}`)
              : '这条建议仍依赖后续运行时接入，目前只保留为占位预览。'}
        </div>
        {action.status === 'applied' ? (
          <Badge className="bg-sky-100 text-sky-800">已写入实体</Badge>
        ) : action.reviewable ? (
          <div className="flex flex-wrap gap-2">
            <button
              className={successButtonClassName}
              type="button"
              onClick={() => void onReviewAction({ actionId: action.id, reviewStatus: 'accepted' })}
              disabled={updating || action.reviewStatus === 'accepted'}
            >
              {updating && action.reviewStatus !== 'accepted' ? '处理中…' : '接受预览'}
            </button>
            <button
              className={dangerButtonClassName}
              type="button"
              onClick={() => void onReviewAction({ actionId: action.id, reviewStatus: 'rejected' })}
              disabled={updating || action.reviewStatus === 'rejected'}
            >
              暂不采纳
            </button>
            <button
              className={secondaryButtonClassName}
              type="button"
              onClick={() => void onReviewAction({ actionId: action.id, reviewStatus: 'unreviewed' })}
              disabled={updating || action.reviewStatus === 'unreviewed'}
            >
              重置
            </button>
          </div>
        ) : (
          <Badge className="bg-slate-100 text-slate-700">等待运行时</Badge>
        )}
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <div>动作来源：{action.sourceLabel}</div>
        <div>建议生成：{formatDateTime(action.createdAt)}</div>
        {action.reviewedAt ? <div>审核时间：{formatDateTime(action.reviewedAt)}</div> : null}
        {action.appliedAt ? <div>写入时间：{formatDateTime(action.appliedAt)}</div> : null}
        <div>来源建议：{action.sourceSuggestion}</div>
      </div>
    </div>
  );
}

const planProgressOptions = ['未开始', '进行中', '已完成', '需要调整'];
const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'delayed', label: '已延后' },
];

function cloneLearningPlanDraft(draft: LearningPlanDraft): LearningPlanDraft {
  return {
    ...draft,
    basis: [...draft.basis],
    stages: draft.stages.map((stage) => ({ ...stage })),
    tasks: draft.tasks.map((task) => ({ ...task })),
  };
}

function getComparableLearningPlanDraft(draft: LearningPlanDraft | null) {
  if (!draft) return null;

  return {
    id: draft.id,
    goalId: draft.goalId,
    title: draft.title,
    summary: draft.summary,
    basis: draft.basis,
    stages: draft.stages,
    tasks: draft.tasks,
  };
}

function getSnapshotsForGoal(snapshots: LearningPlanSnapshot[], goalId: string) {
  return snapshots
    .filter((snapshot) => snapshot.goalId === goalId)
    .sort((left, right) => right.version - left.version);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }

  return date.toLocaleString('zh-CN');
}

function createEmptyStage(): LearningPlanStage {
  return {
    title: '',
    outcome: '',
    progress: '未开始',
  };
}

function createEmptyTask(draftId: string, index: number): PlanTask {
  return {
    id: `${draftId}-task-${Date.now()}-${index + 1}`,
    title: '',
    duration: '',
    status: 'todo',
    note: '',
  };
}

type PlanDiffKind = 'added' | 'removed' | 'updated';

type PlanDiffEntry = {
  key: string;
  label: string;
  kind: PlanDiffKind;
  previous: string | null;
  current: string | null;
};

type LearningPlanComparison = {
  titleChanged: boolean;
  stageChanges: PlanDiffEntry[];
  taskChanges: PlanDiffEntry[];
  totalChanges: number;
};

function normalizeStage(stage: LearningPlanStage) {
  return {
    title: stage.title.trim(),
    outcome: stage.outcome.trim(),
    progress: stage.progress.trim(),
  };
}

function normalizeTask(task: PlanTask) {
  return {
    title: task.title.trim(),
    duration: task.duration.trim(),
    status: task.status,
    note: task.note.trim(),
  };
}

function formatStageComparisonValue(stage: LearningPlanStage) {
  const normalized = normalizeStage(stage);
  return `${normalized.title || '未命名阶段'} · ${normalized.outcome || '未填写阶段结果'} · ${normalized.progress || '未标记进度'}`;
}

function formatTaskComparisonValue(task: PlanTask) {
  const normalized = normalizeTask(task);
  return `${normalized.title || '未命名任务'} · ${normalized.duration || '未填时长'} · ${taskStatusLabel(normalized.status)} · ${normalized.note || '未填写任务说明'}`;
}

function buildPlanDiffEntries<T>({
  currentItems,
  previousItems,
  getLabel,
  describe,
  isEqual,
}: {
  currentItems: T[];
  previousItems: T[];
  getLabel: (index: number) => string;
  describe: (item: T) => string;
  isEqual: (currentItem: T, previousItem: T) => boolean;
}) {
  const maxLength = Math.max(currentItems.length, previousItems.length);
  const entries: PlanDiffEntry[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const currentItem = currentItems[index];
    const previousItem = previousItems[index];
    const label = getLabel(index);

    if (currentItem && previousItem) {
      if (!isEqual(currentItem, previousItem)) {
        entries.push({
          key: `${label}-updated`,
          label,
          kind: 'updated',
          previous: describe(previousItem),
          current: describe(currentItem),
        });
      }
      continue;
    }

    if (currentItem) {
      entries.push({
        key: `${label}-added`,
        label,
        kind: 'added',
        previous: null,
        current: describe(currentItem),
      });
    }

    if (previousItem) {
      entries.push({
        key: `${label}-removed`,
        label,
        kind: 'removed',
        previous: describe(previousItem),
        current: null,
      });
    }
  }

  return entries;
}

function buildLearningPlanComparison(currentDraft: LearningPlanDraft, snapshot: LearningPlanSnapshot): LearningPlanComparison {
  const titleChanged = currentDraft.title.trim() !== snapshot.title.trim();
  const stageChanges = buildPlanDiffEntries({
    currentItems: currentDraft.stages,
    previousItems: snapshot.stages,
    getLabel: (index) => `阶段 ${index + 1}`,
    describe: formatStageComparisonValue,
    isEqual: (currentStage, previousStage) => JSON.stringify(normalizeStage(currentStage)) === JSON.stringify(normalizeStage(previousStage)),
  });
  const taskChanges = buildPlanDiffEntries({
    currentItems: currentDraft.tasks,
    previousItems: snapshot.tasks,
    getLabel: (index) => `任务 ${index + 1}`,
    describe: formatTaskComparisonValue,
    isEqual: (currentTask, previousTask) => JSON.stringify(normalizeTask(currentTask)) === JSON.stringify(normalizeTask(previousTask)),
  });

  return {
    titleChanged,
    stageChanges,
    taskChanges,
    totalChanges: (titleChanged ? 1 : 0) + stageChanges.length + taskChanges.length,
  };
}

function PlansContent() {
  const goals = useAppStore((state) => state.goals);
  const activeGoalId = useAppStore((state) => state.plan.activeGoalId);
  const planDrafts = useAppStore((state) => state.plan.drafts);
  const planSnapshots = useAppStore((state) => state.plan.snapshots);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrationError = useAppStore((state) => state.hydrationError);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const saveLearningPlanDraft = useAppStore((state) => state.saveLearningPlanDraft);
  const regenerateLearningPlanDraft = useAppStore((state) => state.regenerateLearningPlanDraft);
  const generatePlanAdjustmentSuggestions = useAppStore((state) => state.generatePlanAdjustmentSuggestions);

  const activeGoal = goals.find((goal) => goal.id === activeGoalId) ?? goals[0] ?? null;
  const activePlanDraft = getActivePlanDraft(planDrafts, activeGoalId);
  const activeSnapshots = useMemo(() => getSnapshotsForGoal(planSnapshots, activeGoalId), [planSnapshots, activeGoalId]);
  const latestSnapshot = activeSnapshots[0] ?? null;
  const nextSnapshotVersion = useMemo(
    () => activeSnapshots.reduce((maxVersion, snapshot) => Math.max(maxVersion, snapshot.version), 0) + 1,
    [activeSnapshots],
  );

  const [draft, setDraft] = useState<LearningPlanDraft | null>(activePlanDraft ? cloneLearningPlanDraft(activePlanDraft) : null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [adjustingPlan, setAdjustingPlan] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastRegeneratedAt, setLastRegeneratedAt] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(latestSnapshot?.id ?? null);

  useEffect(() => {
    if (!activePlanDraft) {
      setDraft(null);
      setEditing(false);
      setNotice(null);
      setShowRegenerateConfirm(false);
      return;
    }

    const switchedDraft = activePlanDraft.id !== draft?.id;
    if (switchedDraft) {
      setDraft(cloneLearningPlanDraft(activePlanDraft));
      setEditing(false);
      setNotice(null);
      return;
    }

    if (!editing && activePlanDraft.updatedAt !== draft?.updatedAt) {
      setDraft(cloneLearningPlanDraft(activePlanDraft));
    }
  }, [activePlanDraft, draft?.id, draft?.updatedAt, editing]);

  useEffect(() => {
    if (!activeSnapshots.length) {
      setSelectedSnapshotId(null);
      return;
    }

    setSelectedSnapshotId((current) => (current && activeSnapshots.some((snapshot) => snapshot.id === current) ? current : activeSnapshots[0].id));
  }, [activeSnapshots]);

  const hasChanges = useMemo(() => {
    if (!draft || !activePlanDraft) return false;
    return JSON.stringify(getComparableLearningPlanDraft(draft)) !== JSON.stringify(getComparableLearningPlanDraft(activePlanDraft));
  }, [draft, activePlanDraft]);

  const canSave = useMemo(() => {
    if (!draft) return false;

    const stagesReady = draft.stages.length > 0 && draft.stages.every((stage) => stage.title.trim() && stage.outcome.trim());
    const tasksReady = draft.tasks.length > 0 && draft.tasks.every((task) => task.title.trim() && task.duration.trim() && task.note.trim());
    return Boolean(stagesReady && tasksReady);
  }, [draft]);

  const stageProgressStats = useMemo(() => {
    const total = draft?.stages.length ?? 0;
    const completed = draft?.stages.filter((stage) => stage.progress === '已完成').length ?? 0;
    return { total, completed };
  }, [draft]);

  const taskStats = useMemo(() => {
    const total = draft?.tasks.length ?? 0;
    const completed = draft?.tasks.filter((task) => task.status === 'done').length ?? 0;
    return { total, completed };
  }, [draft]);
  const selectedSnapshot = useMemo(
    () => activeSnapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? activeSnapshots[0] ?? null,
    [activeSnapshots, selectedSnapshotId],
  );
  const planComparison = useMemo(() => {
    if (!draft || !selectedSnapshot) return null;
    return buildLearningPlanComparison(draft, selectedSnapshot);
  }, [draft, selectedSnapshot]);

  const updateStage = (index: number, key: keyof LearningPlanStage, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        stages: current.stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, [key]: value } : stage)),
      };
    });
  };

  const updateTask = (index: number, key: keyof PlanTask, value: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        tasks: current.tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, [key]: value } : task)),
      };
    });
  };

  const addStage = () => {
    setDraft((current) => (current ? { ...current, stages: [...current.stages, createEmptyStage()] } : current));
  };

  const removeStage = (index: number) => {
    setDraft((current) => {
      if (!current || current.stages.length <= 1) return current;
      return {
        ...current,
        stages: current.stages.filter((_, stageIndex) => stageIndex !== index),
      };
    });
  };

  const addTask = () => {
    setDraft((current) => (current ? { ...current, tasks: [...current.tasks, createEmptyTask(current.id, current.tasks.length)] } : current));
  };

  const removeTask = (index: number) => {
    setDraft((current) => {
      if (!current || current.tasks.length <= 1) return current;
      return {
        ...current,
        tasks: current.tasks.filter((_, taskIndex) => taskIndex !== index),
      };
    });
  };

  const restoreDraft = () => {
    if (!activePlanDraft) return;
    setDraft(cloneLearningPlanDraft(activePlanDraft));
    setEditing(false);
    setNotice('已恢复为最近一次持久化的计划草案。');
  };

  const onSave = async () => {
    if (!draft || !canSave) {
      setNotice('请至少保留 1 个阶段和 1 个任务，并补齐它们的标题、结果、时长与说明。');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await saveLearningPlanDraft(draft);
      setLastSavedAt(new Date().toLocaleString('zh-CN'));
      setEditing(false);
      setNotice('计划草案已通过 renderer → preload → main → AppStorageService → SQLite plan tables 写入本地。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '计划草案保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onOpenRegenerateConfirm = () => {
    setNotice(null);
    setShowRegenerateConfirm(true);
  };

  const onConfirmRegenerate = async () => {
    if (!activeGoal || !draft) return;

    setRegenerating(true);
    setNotice(null);
    try {
      await regenerateLearningPlanDraft({
        goalId: activeGoal.id,
        snapshotDraft: hasChanges ? draft : undefined,
      });
      setLastRegeneratedAt(new Date().toLocaleString('zh-CN'));
      setEditing(false);
      setShowRegenerateConfirm(false);
      setNotice(`AI 已重生成计划，覆盖前的草案已归档为版本快照 v${nextSnapshotVersion}。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '计划重生成失败');
    } finally {
      setRegenerating(false);
    }
  };

  const onGenerateAdjustmentSuggestions = async () => {
    if (!activeGoal) return;

    setAdjustingPlan(true);
    setNotice(null);
    try {
      await generatePlanAdjustmentSuggestions({ goalId: activeGoal.id });
      setNotice('已基于当前草案与复盘反馈生成计划调整建议，并回流到对话预览。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '生成计划调整建议失败');
    } finally {
      setAdjustingPlan(false);
    }
  };

  const onSwitchGoal = async (goalId: string) => {
    if (goalId === activeGoalId) return;
    if (hasChanges && !window.confirm('当前草案有未保存修改，切换主目标会放弃这些修改。是否继续？')) {
      return;
    }

    try {
      await setActiveGoal(goalId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '切换主目标失败');
    }
  };

  if (!draft) {
    return (
      <Card>
        <SectionTitle>学习计划</SectionTitle>
        <Muted className="mt-3">当前还没有可编辑的计划草案，请先在目标页创建并激活一个目标。</Muted>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <Card className="border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="bg-slate-900 text-white">{editing ? '草案编辑中' : '当前主目标'}</Badge>
              <SectionTitle className="mt-4 text-2xl">{activeGoal?.title ?? '暂未设置主目标'}</SectionTitle>
              <Muted className="mt-2 max-w-2xl">{activeGoal ? activeGoal.motivation : '请先在目标页选择一个当前重点目标，计划页会跟随切换到该目标的独立草案。'}</Muted>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={secondaryButtonClassName}
                type="button"
                onClick={onOpenRegenerateConfirm}
                disabled={saving || regenerating || adjustingPlan}
              >
                <RefreshCcw className="mr-1 inline h-4 w-4" />
                {regenerating ? '重生成中…' : '重新生成计划'}
              </button>
              <button
                className={secondaryButtonClassName}
                type="button"
                onClick={() => void onGenerateAdjustmentSuggestions()}
                disabled={saving || regenerating || adjustingPlan}
              >
                <Sparkles className="mr-1 inline h-4 w-4" />
                {adjustingPlan ? '生成中…' : '生成调整建议'}
              </button>
              <button className={editing ? successButtonClassName : secondaryButtonClassName} type="button" onClick={() => {
                setEditing((current) => !current);
                setNotice(null);
              }} disabled={saving || regenerating || adjustingPlan}>
                {editing ? '结束编辑' : '编辑草案'}
              </button>
              <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={!editing || saving || regenerating || adjustingPlan || !hasChanges}>
                {saving ? '保存中…' : '保存计划'}
              </button>
              <button className={secondaryButtonClassName} type="button" onClick={restoreDraft} disabled={saving || regenerating || adjustingPlan || !hasChanges}>
                还原当前值
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <StatCard label="阶段数" value={String(stageProgressStats.total)} />
            <StatCard label="已完成阶段" value={String(stageProgressStats.completed)} />
            <StatCard label="任务完成" value={`${taskStats.completed}/${taskStats.total}`} />
            <StatCard label="历史快照" value={String(activeSnapshots.length)} />
          </div>

          <div className="mt-5 rounded-2xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-white">
            <div className="text-sm font-medium text-slate-900">{draft.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{draft.summary}</p>
          </div>

          <div className="mt-4 space-y-3">
            {draft.stages.map((stage, index) => (
              <div key={`stage-${index}`} className="rounded-2xl border border-slate-100 bg-white/85 px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Field label={`阶段 ${index + 1} 标题`}>
                      <input
                        className={inputClassName}
                        value={stage.title}
                        onChange={(event) => updateStage(index, 'title', event.target.value)}
                        disabled={!editing || saving || regenerating}
                      />
                    </Field>
                  </div>
                  <div className="w-full max-w-[180px]">
                    <Field label="进度">
                      <select
                        className={inputClassName}
                        value={stage.progress}
                        onChange={(event) => updateStage(index, 'progress', event.target.value)}
                        disabled={!editing || saving || regenerating}
                      >
                        {planProgressOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
                <Field label="阶段结果" className="mt-4">
                  <textarea
                    className={textareaClassName}
                    rows={3}
                    value={stage.outcome}
                    onChange={(event) => updateStage(index, 'outcome', event.target.value)}
                    disabled={!editing || saving || regenerating}
                  />
                </Field>
                {editing ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      className={dangerButtonClassName}
                      type="button"
                      onClick={() => removeStage(index)}
                      disabled={saving || regenerating || draft.stages.length <= 1}
                    >
                      删除阶段
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {editing ? (
            <div className="mt-4">
              <button className={secondaryButtonClassName} type="button" onClick={addStage} disabled={saving || regenerating}>
                <Plus className="mr-1 inline h-4 w-4" />新增阶段
              </button>
            </div>
          ) : null}
        </Card>

        <div className="grid gap-4">
          <Card>
            <SectionTitle>目标 → 草案切换</SectionTitle>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              当前计划页已经进入真实草案编辑模式。切换主目标时，会切换到该目标对应的独立 plan draft；如果当前有未保存修改，会先提醒确认。
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {goals.map((goal) => {
                const isCurrent = goal.id === activeGoalId;
                const goalDraft = planDrafts.find((item) => item.goalId === goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => void onSwitchGoal(goal.id)}
                    className={[
                      'rounded-full border px-4 py-2 text-left text-sm transition',
                      isCurrent ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className="font-medium">{goal.title}</div>
                    <div className={isCurrent ? 'mt-1 text-xs text-slate-200' : 'mt-1 text-xs text-slate-500'}>{goalDraft?.title ?? '待生成草案'}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle>版本快照</SectionTitle>
              <Badge className="bg-slate-100 text-slate-700">{activeSnapshots.length} 个</Badge>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              每次点击“重新生成计划”前，当前草案都会先归档为完整版本快照。现在可以直接选一个历史版本，与当前展示中的草案比较标题、阶段和任务差异。
            </div>
            {latestSnapshot ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <History className="h-4 w-4 text-slate-500" />
                    最近快照 v{latestSnapshot.version}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(latestSnapshot.createdAt)}</div>
                </div>
                <div className="mt-2 text-sm text-slate-700">{latestSnapshot.title}</div>
                <div className="mt-2 text-xs text-slate-500">阶段 {latestSnapshot.stages.length} · 任务 {latestSnapshot.tasks.length}</div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                还没有历史快照。第一次重新生成时，会先归档当前草案作为 v1。
              </div>
            )}
            {activeSnapshots.length ? (
              <div className="mt-3 space-y-2">
                {activeSnapshots.map((snapshot) => {
                  const selected = snapshot.id === selectedSnapshot?.id;
                  return (
                    <button
                      key={snapshot.id}
                      type="button"
                      onClick={() => setSelectedSnapshotId(snapshot.id)}
                      aria-pressed={selected}
                      className={[
                        'w-full rounded-xl border px-3 py-3 text-left text-sm transition',
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">v{snapshot.version}</span>
                        <span className={selected ? 'text-xs text-slate-200' : 'text-xs text-slate-500'}>{formatDateTime(snapshot.createdAt)}</span>
                      </div>
                      <div className={selected ? 'mt-1 text-slate-100' : 'mt-1 text-slate-700'}>{snapshot.title}</div>
                      <div className={selected ? 'mt-2 text-xs text-slate-200' : 'mt-2 text-xs text-slate-500'}>
                        阶段 {snapshot.stages.length} · 任务 {snapshot.tasks.length}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Card>

          <Card className="border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(239,246,255,0.65))]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionTitle>版本对比</SectionTitle>
                <Muted className="mt-2">
                  {selectedSnapshot
                    ? `当前展示草案 vs 快照 v${selectedSnapshot.version} · ${formatDateTime(selectedSnapshot.createdAt)}`
                    : '选择一个快照后，这里会展示当前草案与历史版本的核心差异。'}
                </Muted>
              </div>
              {planComparison ? <Badge className="bg-slate-900 text-white">{planComparison.totalChanges} 处差异</Badge> : null}
            </div>
            {selectedSnapshot && planComparison ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StatCard label="标题差异" value={planComparison.titleChanged ? '1' : '0'} />
                  <StatCard label="阶段差异" value={String(planComparison.stageChanges.length)} />
                  <StatCard label="任务差异" value={String(planComparison.taskChanges.length)} />
                </div>

                {hasChanges ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    当前对比基于你屏幕里的最新草案内容，包含尚未保存的修改。
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <GitCompareArrows className="h-4 w-4 text-slate-500" />
                    标题
                  </div>
                  {planComparison.titleChanged ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <ComparisonValueCard label={`快照 v${selectedSnapshot.version}`} value={selectedSnapshot.title} />
                      <ComparisonValueCard label="当前草案" value={draft.title} emphasized />
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">标题未变化。</div>
                  )}
                </div>

                <PlanDiffSection
                  title="阶段"
                  items={planComparison.stageChanges}
                  emptyText="阶段结构没有变化。"
                  previousLabel={`快照 v${selectedSnapshot.version}`}
                />

                <PlanDiffSection
                  title="任务"
                  items={planComparison.taskChanges}
                  emptyText="任务结构没有变化。"
                  previousLabel={`快照 v${selectedSnapshot.version}`}
                />
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                还没有可对比的历史版本。先执行一次“重新生成计划”，再回到这里选择快照。
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>计划依据说明</SectionTitle>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {draft.basis.map((item) => (
                <li key={item} className="rounded-xl bg-slate-50 px-3 py-3">{item}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle>编辑状态</SectionTitle>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <StatusRow icon={<Check className="h-4 w-4" />} label="Renderer 状态" value={hydrated ? '已完成 hydration，可直接编辑和重生成当前目标草案。' : '正在加载本地计划草案…'} />
              <StatusRow icon={<Sparkles className="h-4 w-4" />} label="保存链路" value="saveLearningPlanDraft → preload IPC → main handler → AppStorageService → learning_plan_drafts / plan_stages / plan_tasks" />
              <StatusRow icon={<History className="h-4 w-4" />} label="快照链路" value="regenerateLearningPlanDraft → preload IPC → main handler → AppStorageService → learning_plan_snapshots / plan_snapshot_stages / plan_snapshot_tasks" />
              <StatusRow icon={<CircleAlert className="h-4 w-4" />} label="当前边界" value="本轮覆盖手动编辑、重新生成、版本快照与版本对比，不含版本回滚与真实 AI 重排。" />
              {lastSavedAt ? <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">最近一次成功保存：{lastSavedAt}</div> : null}
              {lastRegeneratedAt ? <div className="rounded-lg bg-sky-50 px-3 py-2 text-sky-700">最近一次成功重生成：{lastRegeneratedAt}</div> : null}
              {hydrationError ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">本地存储告警：{hydrationError}</div> : null}
              {notice ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">{notice}</div> : null}
            </div>
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>任务清单</SectionTitle>
            {activeGoal ? <Badge className="bg-blue-100 text-blue-800">{activeGoal.priority} · {goalStatusLabel(activeGoal.status)}</Badge> : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {draft.tasks.map((task, index) => (
              <div key={task.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Field label={`任务 ${index + 1} 标题`}>
                  <input
                    className={inputClassName}
                    value={task.title}
                    onChange={(event) => updateTask(index, 'title', event.target.value)}
                    disabled={!editing || saving || regenerating}
                  />
                </Field>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="预计时长">
                    <input
                      className={inputClassName}
                      value={task.duration}
                      onChange={(event) => updateTask(index, 'duration', event.target.value)}
                      disabled={!editing || saving || regenerating}
                    />
                  </Field>
                  <Field label="状态">
                    <select
                      className={inputClassName}
                      value={task.status}
                      onChange={(event) => updateTask(index, 'status', event.target.value)}
                      disabled={!editing || saving || regenerating}
                    >
                      {taskStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="任务说明" className="mt-4">
                  <textarea
                    className={textareaClassName}
                    rows={4}
                    value={task.note}
                    onChange={(event) => updateTask(index, 'note', event.target.value)}
                    disabled={!editing || saving || regenerating}
                  />
                </Field>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge className="bg-slate-100 text-slate-700">{taskStatusLabel(task.status)}</Badge>
                  {editing ? (
                    <button
                      className={dangerButtonClassName}
                      type="button"
                      onClick={() => removeTask(index)}
                      disabled={saving || regenerating || draft.tasks.length <= 1}
                    >
                      删除任务
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {editing ? (
            <div className="mt-4">
              <button className={secondaryButtonClassName} type="button" onClick={addTask} disabled={saving || regenerating}>
                <Plus className="mr-1 inline h-4 w-4" />新增任务
              </button>
            </div>
          ) : null}
        </Card>
      </div>

      {showRegenerateConfirm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <RefreshCcw className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-900">确认重新生成当前计划？</div>
                <div className="mt-1 text-sm text-slate-600">这会用当前目标和最新画像生成一版新草案，并覆盖当前展示中的计划内容。</div>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <div>覆盖前的草案会先归档为版本快照 v{nextSnapshotVersion}，后续可以作为版本对比基础。</div>
              <div>当前目标：{activeGoal?.title ?? '未选择目标'}。</div>
              <div>当前草案：{draft.title}。</div>
              {hasChanges ? <div className="rounded-xl bg-amber-100/70 px-3 py-2 text-amber-900">你还有未保存修改；这些内容也会一起进入快照，然后被新草案替换。</div> : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button className={secondaryButtonClassName} type="button" onClick={() => setShowRegenerateConfirm(false)} disabled={regenerating}>
                取消
              </button>
              <button className={dangerButtonClassName} type="button" onClick={() => void onConfirmRegenerate()} disabled={regenerating}>
                {regenerating ? '重生成中…' : '确认重生成'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProfileContent() {
  const profile = useAppStore((state) => state.profile);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrationError = useAppStore((state) => state.hydrationError);
  const saveUserProfile = useAppStore((state) => state.saveUserProfile);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const completionStats = useMemo(() => {
    const requiredFields = [draft.name, draft.identity, draft.timeBudget, draft.pacePreference, draft.bestStudyWindow];
    const requiredDone = requiredFields.filter((item) => item.trim()).length;
    const listDone = [draft.strengths, draft.blockers, draft.planImpact].filter((items) => items.length > 0).length;
    return {
      completed: requiredDone + listDone,
      total: requiredFields.length + 3,
    };
  }, [draft]);

  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(profile), [draft, profile]);

  const canSave = useMemo(() => {
    return Boolean(
      draft.name.trim() &&
      draft.identity.trim() &&
      draft.timeBudget.trim() &&
      draft.pacePreference.trim() &&
      draft.bestStudyWindow.trim() &&
      draft.strengths.length &&
      draft.planImpact.length,
    );
  }, [draft]);

  const applyListInput = (key: 'strengths' | 'blockers' | 'planImpact', value: string) => {
    setDraft((current) => ({
      ...current,
      [key]: value
        .split(/\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  const onSave = async () => {
    if (!canSave) {
      setNotice('请至少补齐姓名、身份、时间预算、节奏偏好、最佳时段、优势与画像影响说明。');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await saveUserProfile(draft);
      setLastSavedAt(new Date().toLocaleString('zh-CN'));
      setNotice('用户画像已通过 renderer → preload → main → storage → SQLite 写入本地。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '画像保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr,0.9fr]">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionTitle>用户画像编辑</SectionTitle>
            <Muted className="mt-2">优先提供 C 端可用的基础编辑体验：改关键字段、直接保存、立刻回显。</Muted>
          </div>
          <Badge className="bg-blue-100 text-blue-800">已完成 {completionStats.completed}/{completionStats.total}</Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="称呼 / 名字">
            <input className={inputClassName} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="最佳学习时段">
            <input className={inputClassName} value={draft.bestStudyWindow} onChange={(event) => setDraft((current) => ({ ...current, bestStudyWindow: event.target.value }))} />
          </Field>
          <Field label="身份阶段" className="md:col-span-2">
            <textarea className={textareaClassName} rows={3} value={draft.identity} onChange={(event) => setDraft((current) => ({ ...current, identity: event.target.value }))} />
          </Field>
          <Field label="时间预算">
            <input className={inputClassName} value={draft.timeBudget} onChange={(event) => setDraft((current) => ({ ...current, timeBudget: event.target.value }))} />
          </Field>
          <Field label="节奏偏好">
            <input className={inputClassName} value={draft.pacePreference} onChange={(event) => setDraft((current) => ({ ...current, pacePreference: event.target.value }))} />
          </Field>
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="优势（逗号或换行分隔）">
            <textarea className={textareaClassName} rows={4} value={draft.strengths.join('\n')} onChange={(event) => applyListInput('strengths', event.target.value)} />
          </Field>
          <Field label="阻力因素（逗号或换行分隔）">
            <textarea className={textareaClassName} rows={4} value={draft.blockers.join('\n')} onChange={(event) => applyListInput('blockers', event.target.value)} />
          </Field>
          <Field label="画像如何影响计划（逗号或换行分隔）">
            <textarea className={textareaClassName} rows={4} value={draft.planImpact.join('\n')} onChange={(event) => applyListInput('planImpact', event.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={saving || !hasChanges}>
            {saving ? '保存中…' : '保存画像'}
          </button>
          <button className={secondaryButtonClassName} type="button" onClick={() => {
            setDraft(profile);
            setNotice('已恢复为最近一次持久化的画像。');
          }} disabled={saving || !hasChanges}>
            还原当前值
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <StatusRow icon={<Check className="h-4 w-4" />} label="Renderer 状态" value={hydrated ? '已完成 hydration，可直接编辑当前画像。' : '正在加载本地画像…'} />
          <StatusRow icon={<Sparkles className="h-4 w-4" />} label="保存链路" value="saveUserProfile → preload IPC → main handler → AppStorageService → SQLite user_profiles" />
          <StatusRow icon={<CircleAlert className="h-4 w-4" />} label="当前边界" value="本轮只覆盖基础画像字段编辑，不含 AI 自动抽取/版本 diff/操作历史。" />
          {lastSavedAt ? <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">最近一次成功保存：{lastSavedAt}</div> : null}
          {hydrationError ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">本地存储告警：{hydrationError}</div> : null}
          {notice ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">{notice}</div> : null}
        </div>
      </Card>

      <div className="grid gap-4">
        <Card>
          <SectionTitle>当前画像摘要</SectionTitle>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <ProfilePreviewBlock title="身份阶段" items={[draft.identity]} />
            <ProfilePreviewBlock title="优势" items={draft.strengths} />
            <ProfilePreviewBlock title="阻力因素" items={draft.blockers} emptyText="暂未填写" />
            <ProfilePreviewBlock title="计划影响" items={draft.planImpact} />
          </div>
        </Card>

        <Card>
          <SectionTitle>编辑建议</SectionTitle>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="rounded-lg bg-slate-50 px-3 py-2">优先维护“身份阶段 / 时间预算 / 节奏偏好 / 优势 / 阻力 / 计划影响”这些高价值字段。</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">数组字段支持逗号或换行，便于从对话结论快速粘贴整理。</li>
            <li className="rounded-lg bg-slate-50 px-3 py-2">保存后重新打开应用仍会从 SQLite 回填当前画像。</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

const defaultGoalDraft = (): LearningGoalInput => ({
  title: '',
  motivation: '',
  baseline: '',
  cycle: '',
  successMetric: '',
  priority: 'P2',
  status: 'active',
});

function GoalsContent() {
  const goals = useAppStore((state) => state.goals);
  const activeGoalId = useAppStore((state) => state.plan.activeGoalId);
  const planDrafts = useAppStore((state) => state.plan.drafts);
  const planSnapshots = useAppStore((state) => state.plan.snapshots);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrationError = useAppStore((state) => state.hydrationError);
  const upsertLearningGoal = useAppStore((state) => state.upsertLearningGoal);
  const removeLearningGoal = useAppStore((state) => state.removeLearningGoal);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id ?? 'new');
  const [draft, setDraft] = useState<LearningGoalInput>(goals[0] ? { ...goals[0] } : defaultGoalDraft());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!goals.length) {
      setSelectedGoalId('new');
      setDraft(defaultGoalDraft());
      return;
    }

    if (selectedGoalId === 'new') return;
    const current = goals.find((goal) => goal.id === selectedGoalId) ?? goals[0];
    if (current) {
      setSelectedGoalId(current.id);
      setDraft({ ...current });
    }
  }, [goals, selectedGoalId]);

  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;
  const selectedPlanDraft = selectedGoal ? planDrafts.find((item) => item.goalId === selectedGoal.id) ?? null : null;
  const selectedGoalSnapshots = useMemo(
    () => (selectedGoal ? planSnapshots.filter((snapshot) => snapshot.goalId === selectedGoal.id) : []),
    [planSnapshots, selectedGoal],
  );
  const isCreating = selectedGoalId === 'new';
  const hasChanges = useMemo(() => {
    if (isCreating) {
      return Boolean(draft.title.trim() || draft.motivation.trim() || draft.baseline.trim() || draft.cycle.trim() || draft.successMetric.trim());
    }

    return JSON.stringify(draft) !== JSON.stringify(selectedGoal);
  }, [draft, isCreating, selectedGoal]);

  const canSave = useMemo(() => {
    return Boolean(draft.title.trim() && draft.motivation.trim() && draft.baseline.trim() && draft.cycle.trim() && draft.successMetric.trim());
  }, [draft]);

  const goalStats = useMemo(() => ({
    total: goals.length,
    active: goals.filter((goal) => goal.status === 'active').length,
    completed: goals.filter((goal) => goal.status === 'completed').length,
  }), [goals]);
  const deletionPreview = useMemo(() => {
    if (!selectedGoal) return null;

    const remainingGoals = goals.filter((goal) => goal.id !== selectedGoal.id);
    const currentActiveGoal = goals.find((goal) => goal.id === activeGoalId) ?? null;
    const nextActiveGoal = selectedGoal.id === activeGoalId ? (remainingGoals[0] ?? null) : currentActiveGoal;

    return {
      remainingGoals,
      nextActiveGoal,
      deletingActiveGoal: selectedGoal.id === activeGoalId,
      draftCount: selectedPlanDraft ? 1 : 0,
      snapshotCount: selectedGoalSnapshots.length,
    };
  }, [selectedGoal, goals, activeGoalId, selectedPlanDraft, selectedGoalSnapshots]);

  const startCreate = () => {
    setSelectedGoalId('new');
    setDraft(defaultGoalDraft());
    setShowDeleteConfirm(false);
    setNotice('已切换到新目标创建模式。');
  };

  const selectGoal = (goal: LearningGoal) => {
    setSelectedGoalId(goal.id);
    setDraft({ ...goal });
    setNotice(null);
  };

  const restoreDraft = () => {
    if (isCreating) {
      setDraft(defaultGoalDraft());
      setNotice('已清空新目标草稿。');
      return;
    }

    if (selectedGoal) {
      setDraft({ ...selectedGoal });
      setNotice('已恢复为最近一次持久化的目标。');
    }
  };

  const onSave = async () => {
    if (!canSave) {
      setNotice('请补齐目标名称、学习动机、当前基础、目标周期与成功标准。');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await upsertLearningGoal({ ...draft, id: isCreating ? undefined : selectedGoalId });
      setLastSavedAt(new Date().toLocaleString('zh-CN'));
      setNotice(isCreating ? '新目标已创建，并自动生成该目标的首版计划草案。' : '目标修改已保存到本地 SQLite，对应计划草案归属保持不变。');
      if (isCreating) {
        setSelectedGoalId('new');
        setDraft(defaultGoalDraft());
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '目标保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onSetActiveGoal = async () => {
    if (!selectedGoal || selectedGoal.id === activeGoalId) return;

    setSaving(true);
    setNotice(null);
    try {
      await setActiveGoal(selectedGoal.id);
      setLastSavedAt(new Date().toLocaleString('zh-CN'));
      setNotice('已设为当前主目标，计划页会切换到该目标对应的独立草案并持久化到本地 SQLite。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '设为当前目标失败');
    } finally {
      setSaving(false);
    }
  };

  const onOpenDeleteConfirm = () => {
    if (!selectedGoal) return;
    setNotice(null);
    setShowDeleteConfirm(true);
  };

  const onConfirmDeleteGoal = async () => {
    if (!selectedGoal || !deletionPreview) return;

    setDeleting(true);
    setNotice(null);
    try {
      await removeLearningGoal(selectedGoal.id);
      setLastSavedAt(new Date().toLocaleString('zh-CN'));
      setShowDeleteConfirm(false);

      const nextSelectedGoal = deletionPreview.nextActiveGoal ?? deletionPreview.remainingGoals[0] ?? null;
      if (nextSelectedGoal) {
        setSelectedGoalId(nextSelectedGoal.id);
        setDraft({ ...nextSelectedGoal });
      } else {
        setSelectedGoalId('new');
        setDraft(defaultGoalDraft());
      }

      if (!deletionPreview.remainingGoals.length) {
        setNotice('目标已删除，关联计划草案与版本快照也已清理。当前已无主目标，请先新建一个学习方向。');
      } else if (deletionPreview.deletingActiveGoal && deletionPreview.nextActiveGoal) {
        setNotice(`目标已删除，关联计划草案与版本快照也已清理。当前主目标已切换为「${deletionPreview.nextActiveGoal.title}」。`);
      } else {
        setNotice('目标已删除，关联计划草案与版本快照也已清理。');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '目标删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.05fr,1.25fr,0.9fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionTitle>目标列表</SectionTitle>
              <Muted className="mt-2">先把“想学什么”管理清楚，再为每个目标配一份独立计划草案。</Muted>
            </div>
            <button className={secondaryButtonClassName} type="button" onClick={startCreate}>
              <Plus className="mr-1 inline h-4 w-4" />新建
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <StatCard label="目标总数" value={String(goalStats.total)} />
            <StatCard label="进行中" value={String(goalStats.active)} />
            <StatCard label="已完成" value={String(goalStats.completed)} />
          </div>

          <div className="mt-4 space-y-3">
            {goals.map((goal) => {
              const active = goal.id === selectedGoalId;
              const goalPlanDraft = planDrafts.find((item) => item.goalId === goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => selectGoal(goal)}
                  className={[
                    'w-full rounded-2xl border px-4 py-4 text-left transition',
                    active ? 'border-slate-900 bg-slate-900 text-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{goal.title}</div>
                      <div className={active ? 'mt-1 text-sm text-slate-200' : 'mt-1 text-sm text-slate-600'}>{goal.motivation}</div>
                    </div>
                    <Badge className={active ? 'bg-white/15 text-white' : priorityBadgeClassName(goal.priority)}>{goal.priority}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge className={active ? 'bg-white/10 text-white' : statusBadgeClassName(goal.status)}>{goalStatusLabel(goal.status)}</Badge>
                    <Badge className={active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}>{goal.cycle}</Badge>
                    {goal.id === activeGoalId ? <Badge className={active ? 'bg-emerald-400/20 text-emerald-50' : 'bg-emerald-100 text-emerald-700'}>当前主目标</Badge> : null}
                  </div>
                  <div className={active ? 'mt-3 text-xs text-slate-200' : 'mt-3 text-xs text-slate-500'}>{goalPlanDraft?.title ?? '自动草案待生成'}</div>
                </button>
              );
            })}
            {!goals.length ? <Muted>当前还没有目标，先创建一个可规划的学习方向。</Muted> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionTitle>{isCreating ? '新建学习目标' : '编辑学习目标'}</SectionTitle>
              <Muted className="mt-2">重点维护标题、动机、基础、周期、成功标准这些真正驱动计划的字段。</Muted>
            </div>
            <Badge className="bg-blue-100 text-blue-800">{isCreating ? 'Create' : 'Edit'}</Badge>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="目标名称" className="md:col-span-2">
              <input className={inputClassName} placeholder="例如：完成 Python + AI 工具开发入门" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            </Field>
            <Field label="优先级">
              <select className={inputClassName} value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as LearningGoal['priority'] }))}>
                <option value="P1">P1 · 当前最重要</option>
                <option value="P2">P2 · 持续推进</option>
                <option value="P3">P3 · 低优先储备</option>
              </select>
            </Field>
            <Field label="状态">
              <select className={inputClassName} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as LearningGoal['status'] }))}>
                <option value="active">进行中</option>
                <option value="paused">暂停</option>
                <option value="completed">已完成</option>
              </select>
            </Field>
            <Field label="学习动机" className="md:col-span-2">
              <textarea className={textareaClassName} rows={3} placeholder="为什么现在要学这件事？" value={draft.motivation} onChange={(event) => setDraft((current) => ({ ...current, motivation: event.target.value }))} />
            </Field>
            <Field label="当前基础" className="md:col-span-2">
              <textarea className={textareaClassName} rows={3} placeholder="当前掌握到什么程度、有哪些短板？" value={draft.baseline} onChange={(event) => setDraft((current) => ({ ...current, baseline: event.target.value }))} />
            </Field>
            <Field label="目标周期">
              <input className={inputClassName} placeholder="例如：6 周 / 30 天" value={draft.cycle} onChange={(event) => setDraft((current) => ({ ...current, cycle: event.target.value }))} />
            </Field>
            <Field label="成功标准">
              <textarea className={textareaClassName} rows={3} placeholder="如何判断这个目标达成？" value={draft.successMetric} onChange={(event) => setDraft((current) => ({ ...current, successMetric: event.target.value }))} />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={saving || deleting || !hasChanges}>
              {saving ? '保存中…' : isCreating ? '创建目标' : '保存修改'}
            </button>
            {!isCreating ? (
              <button className={selectedGoal?.id === activeGoalId ? successButtonClassName : secondaryButtonClassName} type="button" onClick={() => void onSetActiveGoal()} disabled={saving || deleting || !selectedGoal || selectedGoal.id === activeGoalId}>
                {selectedGoal?.id === activeGoalId ? '当前主目标' : '设为当前目标'}
              </button>
            ) : null}
            <button className={secondaryButtonClassName} type="button" onClick={restoreDraft} disabled={saving || deleting || !hasChanges}>
              {isCreating ? '清空草稿' : '恢复当前值'}
            </button>
            {!isCreating ? (
              <button className={dangerButtonClassName} type="button" onClick={onOpenDeleteConfirm} disabled={saving || deleting || !selectedGoal}>
                <Trash2 className="mr-1 inline h-4 w-4" />
                {deleting ? '删除中…' : '删除目标'}
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <StatusRow icon={<Flag className="h-4 w-4" />} label="目标链路" value="目标页表单 / 删除 / 设为当前目标 → Zustand store → preload IPC → main storage service → SQLite learning_goals + learning_plan_drafts + learning_plan_snapshots" />
            <StatusRow icon={<Target className="h-4 w-4" />} label="当前能力" value="已支持目标新建、编辑、删除、设为当前主目标，并同步清理该目标关联的计划草案与版本快照。" />
            <StatusRow icon={<PencilLine className="h-4 w-4" />} label="当前边界" value="本轮不含目标排序拖拽、AI 实时重算与多目标交叉依赖分析。" />
            <StatusRow icon={<Check className="h-4 w-4" />} label="Renderer 状态" value={hydrated ? '已完成 hydration，可直接编辑、新建和删除目标。' : '正在加载本地目标…'} />
            {lastSavedAt ? <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">最近一次成功操作：{lastSavedAt}</div> : null}
            {hydrationError ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">本地存储告警：{hydrationError}</div> : null}
            {notice ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">{notice}</div> : null}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <SectionTitle>{isCreating ? '新目标预览' : '目标详情预览'}</SectionTitle>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <GoalPreviewBlock title="目标名称" content={draft.title} emptyText="请输入目标名称" />
              <GoalPreviewBlock title="学习动机" content={draft.motivation} emptyText="说明这件事为什么值得现在做" />
              <GoalPreviewBlock title="当前基础" content={draft.baseline} emptyText="补充你的起点，计划才有依据" />
              <GoalPreviewBlock title="成功标准" content={draft.successMetric} emptyText="明确结果，后续才好跟踪" />
              {!isCreating ? <GoalPreviewBlock title="对应计划草案" content={selectedPlanDraft?.title ?? ''} emptyText="保存后会自动生成首版草案" /> : null}
              {!isCreating ? <GoalPreviewBlock title="历史快照数" content={String(selectedGoalSnapshots.length)} emptyText="0" /> : null}
              <div className="flex flex-wrap gap-2">
                <Badge className={priorityBadgeClassName(draft.priority)}>{draft.priority}</Badge>
                <Badge className={statusBadgeClassName(draft.status)}>{goalStatusLabel(draft.status)}</Badge>
                {draft.cycle.trim() ? <Badge className="bg-slate-100 text-slate-700">{draft.cycle}</Badge> : null}
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>填写建议</SectionTitle>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="rounded-lg bg-slate-50 px-3 py-2">目标名称尽量写成结果导向，而不是抽象愿望。</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">“当前基础”越具体，后续自动生成的首版草案越容易落到正确难度。</li>
              <li className="rounded-lg bg-slate-50 px-3 py-2">删除目标时，会同时清理它的计划草案和版本快照，避免留下脏的 active goal / dangling draft。</li>
            </ul>
          </Card>
        </div>
      </div>

      {showDeleteConfirm && selectedGoal && deletionPreview ? (
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
              <div>目标名称：{selectedGoal.title}</div>
              <div>将清理的计划草案：{deletionPreview.draftCount} 个。</div>
              <div>将清理的版本快照：{deletionPreview.snapshotCount} 个。</div>
              {deletionPreview.deletingActiveGoal && deletionPreview.nextActiveGoal ? <div>删除后新的当前主目标：{deletionPreview.nextActiveGoal.title}</div> : null}
              {deletionPreview.deletingActiveGoal && !deletionPreview.nextActiveGoal ? <div>删除后将不再有当前主目标，计划页会进入空状态。</div> : null}
              {!deletionPreview.deletingActiveGoal ? <div>当前主目标保持不变，只清理这个目标自己的数据。</div> : null}
              {hasChanges ? <div className="rounded-xl bg-amber-100/70 px-3 py-2 text-amber-900">你在表单里还有未保存修改；如果继续删除，这些修改不会保留。</div> : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button className={secondaryButtonClassName} type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                取消
              </button>
              <button className={dangerButtonClassName} type="button" onClick={() => void onConfirmDeleteGoal()} disabled={deleting}>
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SettingsContent() {
  const state = useAppStore();
  const saveAppState = useAppStore((store) => store.saveAppState);
  const aiRuntimeSummary = useAppStore((store) => store.aiRuntimeSummary);
  const aiObservability = useAppStore((store) => store.aiObservability);
  const refreshAiRuntimeSummary = useAppStore((store) => store.refreshAiRuntimeSummary);
  const refreshAiObservability = useAppStore((store) => store.refreshAiObservability);
  const providerConfiguredCount = state.settings.providers.filter((provider) => provider.hasSecret).length;
  const [settingsDraft, setSettingsDraft] = useState(state.settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  useEffect(() => {
    setSettingsDraft(state.settings);
  }, [state.settings]);

  useEffect(() => {
    void refreshAiRuntimeSummary();
    void refreshAiObservability();
  }, [refreshAiObservability, refreshAiRuntimeSummary]);

  const aiRuntimeSummaryByCapability = useMemo(
    () => new Map(aiRuntimeSummary.map((item) => [item.capability, item])),
    [aiRuntimeSummary],
  );
  const aiObservabilityByCapability = useMemo(
    () => new Map(aiObservability.capabilitySummaries.map((item) => [item.capability, item])),
    [aiObservability.capabilitySummaries],
  );

  const onSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      await saveAppState({
        profile: state.profile,
        dashboard: state.dashboard,
        goals: state.goals,
        plan: state.plan,
        conversation: state.conversation,
        reflection: state.reflection,
        settings: settingsDraft,
      });
      setSettingsNotice('应用偏好与用途路由已写入本地 SQLite，并同步刷新了主进程 runtime 摘要。');
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : '设置保存失败');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
      <Card>
        <SectionTitle>应用偏好</SectionTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="主题">
            <select className={inputClassName} value={settingsDraft.theme} onChange={(event) => setSettingsDraft((current) => ({ ...current, theme: event.target.value }))}>
              {themeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="启动页">
            <select className={inputClassName} value={settingsDraft.startPage} onChange={(event) => setSettingsDraft((current) => ({ ...current, startPage: event.target.value }))}>
              {startPageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div><span className="font-medium">设置入口定位：</span>集中管理 Provider、路由策略与本地数据能力。</div>
          <div><span className="font-medium">已安全配置 Provider：</span>{providerConfiguredCount} / {state.settings.providers.length}</div>
          {state.hydrationError ? <div className="text-amber-700"><span className="font-medium">本地存储状态：</span>{state.hydrationError}</div> : <div><span className="font-medium">本地存储状态：</span>{state.hydrated ? '已从 SQLite 加载' : '加载中'}</div>}
          {settingsNotice ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">{settingsNotice}</div> : null}
        </div>
        <div className="mt-4 flex gap-3">
          <button className={primaryButtonClassName} type="button" onClick={() => void onSaveSettings()} disabled={savingSettings}>
            {savingSettings ? '保存中…' : '保存应用设置'}
          </button>
          <button className={secondaryButtonClassName} type="button" onClick={() => setSettingsDraft(state.settings)} disabled={savingSettings}>
            还原当前值
          </button>
        </div>
      </Card>
      <Card>
        <SectionTitle>用途路由策略</SectionTitle>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          {routingItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-900">{item.label}</span>
              <select className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={settingsDraft.routing[item.key]} onChange={(event) => setSettingsDraft((current) => ({ ...current, routing: { ...current.routing, [item.key]: event.target.value as ProviderId } }))}>
                {providerOptions.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <SectionTitle>AI Runtime 摘要</SectionTitle>
        <Muted className="mt-2">主进程现在会直接从结构化 `settings / provider / route` 表解析 capability 落点，不再只依赖快照。</Muted>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {capabilityOptions.map((option) => {
            const summary = aiRuntimeSummaryByCapability.get(option.value);
            const observabilitySummary = aiObservabilityByCapability.get(option.value);
            return (
              <AiRuntimeStatusCard key={option.value} label={option.label} summary={summary} observability={observabilitySummary} />
            );
          })}
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <SectionTitle>请求日志与最小可观测性</SectionTitle>
        <Muted className="mt-2">只记录 capability、Provider、状态、耗时和错误摘要，不保存 prompt 或对话正文。</Muted>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AiObservabilityMetricCard label="总请求数" value={String(aiObservability.totalRequests)} tone="default" />
          <AiObservabilityMetricCard label="成功" value={String(aiObservability.successCount)} tone="success" />
          <AiObservabilityMetricCard label="失败" value={String(aiObservability.failureCount)} tone="warning" />
          <AiObservabilityMetricCard label="最近请求" value={aiObservability.lastRequestedAt ? formatTimestamp(aiObservability.lastRequestedAt) : '暂无'} tone="default" />
        </div>
        <div className="mt-4 space-y-3">
          {aiObservability.recentRequests.length
            ? aiObservability.recentRequests.map((entry) => <AiRequestLogRow key={entry.id} entry={entry} />)
            : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                尚未产生真实 capability 调用日志。执行一次建议提取、计划生成或计划调整后，这里会显示最新请求。
              </div>
            )}
        </div>
      </Card>
      <Card className="xl:col-span-2">
        <SectionTitle>Provider 列表</SectionTitle>
        <Muted className="mt-2">已接上 main/preload bridge，可编辑基础配置并单独保存 / 清空 secret。</Muted>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {state.settings.providers.map((provider) => (
            <ProviderEditor key={provider.id} provider={provider} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function AiRuntimeStatusCard({
  label,
  summary,
  observability,
}: {
  label: string;
  summary: AiRuntimeSummaryItem | undefined;
  observability: AiCapabilityObservabilitySummary | undefined;
}) {
  const badgeLabel = !summary
    ? 'loading'
    : (!summary.ready
      ? 'blocked'
      : (summary.healthStatus === 'ready'
        ? 'healthy'
        : (summary.healthStatus === 'warning' ? 'warning' : 'configured')));
  const badgeClassName = !summary
    ? 'bg-slate-100 text-slate-700'
    : (!summary.ready
      ? 'bg-amber-100 text-amber-800'
      : providerHealthBadgeClassName(summary.healthStatus));

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{label}</div>
          <div className="mt-1 text-xs text-slate-500">
            {summary ? `${summary.providerLabel} · ${summary.model}` : '正在加载运行时摘要…'}
          </div>
        </div>
        <Badge className={badgeClassName}>
          {badgeLabel}
        </Badge>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
        {summary
          ? `route -> ${summary.providerId}${summary.blockedReason ? ` · ${summary.blockedReason}` : ' · 已具备统一 AI service 调用前置条件'}`
          : '等待 main process 返回当前 capability 的 route 与 readiness。'}
      </div>
      {summary ? (
        <div className="mt-3 space-y-1 text-xs text-slate-500">
          <div>健康状态：{providerHealthStatusLabel(summary.healthStatus)}{summary.healthHint ? ` · ${summary.healthHint}` : ''}</div>
          <div>
            最近请求：{observability?.totalRequests
              ? `${requestLogStatusLabel(observability.lastStatus)} · ${formatDuration(observability.lastDurationMs)} · ${formatTimestamp(observability.lastRequestedAt)}`
              : '尚无请求日志'}
          </div>
          <div>调用统计：成功 {observability?.successCount ?? 0} / 失败 {observability?.failureCount ?? 0}</div>
        </div>
      ) : null}
    </div>
  );
}

function AiObservabilityMetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'success' | 'warning';
}) {
  const className = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50'
    : (tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white');

  return (
    <div className={`rounded-xl border px-4 py-4 ${className}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function AiRequestLogRow({ entry }: { entry: AiRequestLogEntry }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{capabilityLabel(entry.capability)}</div>
          <div className="mt-1 text-xs text-slate-500">{entry.providerLabel} · {entry.model}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={requestLogBadgeClassName(entry.status)}>{requestLogStatusLabel(entry.status)}</Badge>
          <span className="text-xs text-slate-500">{formatDuration(entry.durationMs)}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>时间：{formatTimestamp(entry.finishedAt)}</span>
        <span>Provider：{entry.providerId}</span>
      </div>
      {entry.errorMessage ? (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {entry.errorMessage}
        </div>
      ) : null}
    </div>
  );
}

function ProviderEditor({ provider }: { provider: ProviderConfig }) {
  const upsertProviderConfig = useAppStore((store) => store.upsertProviderConfig);
  const clearProviderSecret = useAppStore((store) => store.clearProviderSecret);
  const runProviderHealthCheck = useAppStore((store) => store.runProviderHealthCheck);
  const [draft, setDraft] = useState<ProviderConfigInput>({
    id: provider.id,
    label: provider.label,
    enabled: provider.enabled,
    endpoint: provider.endpoint,
    model: provider.model,
    authMode: provider.authMode,
    capabilityTags: provider.capabilityTags,
    healthStatus: provider.healthStatus,
  });
  const [secretDraft, setSecretDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'info' | 'success' | 'warning'>('info');

  useEffect(() => {
    setDraft({
      id: provider.id,
      label: provider.label,
      enabled: provider.enabled,
      endpoint: provider.endpoint,
      model: provider.model,
      authMode: provider.authMode,
      capabilityTags: provider.capabilityTags,
      healthStatus: provider.healthStatus,
    });
    setSecretDraft('');
  }, [provider]);

  const capabilitySet = useMemo(() => new Set(draft.capabilityTags), [draft.capabilityTags]);

  const toggleCapability = (capability: ModelCapability) => {
    setDraft((current) => ({
      ...current,
      capabilityTags: current.capabilityTags.includes(capability)
        ? current.capabilityTags.filter((item) => item !== capability)
        : [...current.capabilityTags, capability],
    }));
  };

  const onSave = async () => {
    setSaving(true);
    setNotice(null);
    setNoticeTone('info');
    try {
      await upsertProviderConfig({ config: draft, secret: secretDraft.trim() ? secretDraft : undefined });
      setNotice(secretDraft.trim() ? '配置与 secret 已保存，可继续执行一次健康检查确认连通性。' : '配置已保存。');
      setSecretDraft('');
    } catch (error) {
      setNoticeTone('warning');
      setNotice(error instanceof Error ? error.message : 'Provider 保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onClearSecret = async () => {
    setSaving(true);
    setNotice(null);
    setNoticeTone('info');
    try {
      await clearProviderSecret(provider.id);
      setSecretDraft('');
      setNotice('已清空本地保存的 secret。');
    } catch (error) {
      setNoticeTone('warning');
      setNotice(error instanceof Error ? error.message : '清空 secret 失败');
    } finally {
      setSaving(false);
    }
  };

  const onCheckHealth = async () => {
    setCheckingHealth(true);
    setNotice(null);
    try {
      const result = await runProviderHealthCheck(provider.id);
      setNoticeTone(result.healthStatus === 'ready' ? 'success' : 'warning');
      setNotice(renderHealthCheckNotice(result));
    } catch (error) {
      setNoticeTone('warning');
      setNotice(error instanceof Error ? error.message : 'Provider 健康检查失败');
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{provider.id}</div>
          <Muted className="mt-1">最近安全预览：{provider.keyPreview}</Muted>
        </div>
        <Badge className={draft.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>{draft.enabled ? '已启用' : '未启用'}</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        <Field label="展示名称"><input className={inputClassName} value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} /></Field>
        <Field label="Endpoint"><input className={inputClassName} value={draft.endpoint} onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))} /></Field>
        <Field label="模型名"><input className={inputClassName} value={draft.model} onChange={(event) => setDraft((current) => ({ ...current, model: event.target.value }))} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="认证方式">
            <select className={inputClassName} value={draft.authMode} onChange={(event) => setDraft((current) => ({ ...current, authMode: event.target.value as ProviderConfigInput['authMode'] }))}>
              <option value="apiKey">API Key</option>
              <option value="bearer">Bearer</option>
              <option value="none">None</option>
            </select>
          </Field>
          <Field label="健康状态">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge className={providerHealthBadgeClassName(provider.healthStatus)}>{providerHealthStatusLabel(provider.healthStatus)}</Badge>
                <span className="text-xs text-slate-500">{providerHealthDescription(provider.healthStatus)}</span>
              </div>
            </div>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
          启用该 Provider
        </label>
        <Field label="能力标签">
          <div className="flex flex-wrap gap-2">
            {capabilityOptions.map((option) => (
              <button key={option.value} type="button" className={capabilitySet.has(option.value) ? primaryChipClassName : secondaryChipClassName} onClick={() => toggleCapability(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Secret（仅在填写时更新）">
          <input className={inputClassName} type="password" placeholder={provider.hasSecret ? '已有已保存 secret，如需更新请重新输入' : '输入 API Key / Token'} value={secretDraft} onChange={(event) => setSecretDraft(event.target.value)} />
        </Field>
        <div className="text-xs text-slate-500">
          <div>安全状态：{provider.hasSecret ? '已安全保存' : '未配置'}</div>
          <div>连通性状态：{providerHealthStatusLabel(provider.healthStatus)}</div>
          <div>最近更新时间：{provider.updatedAt ?? '暂无'}</div>
        </div>
        {notice ? <div className={providerNoticeClassName(noticeTone)}>{notice}</div> : null}
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={saving}>{saving ? '保存中…' : '保存 Provider'}</button>
          <button className={secondaryButtonClassName} type="button" onClick={() => {
            setDraft({ id: provider.id, label: provider.label, enabled: provider.enabled, endpoint: provider.endpoint, model: provider.model, authMode: provider.authMode, capabilityTags: provider.capabilityTags, healthStatus: provider.healthStatus });
            setSecretDraft('');
            setNoticeTone('info');
            setNotice('已恢复为最近一次持久化的值。');
          }} disabled={saving}>恢复</button>
          <button className={secondaryButtonClassName} type="button" onClick={() => void onClearSecret()} disabled={saving || checkingHealth}>清空 Secret</button>
          <button className={secondaryButtonClassName} type="button" onClick={() => void onCheckHealth()} disabled={saving || checkingHealth}>
            {checkingHealth ? '检查中…' : '检查连通性'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalPreviewBlock({ title, content, emptyText }: { title: string; content: string; emptyText: string }) {
  return (
    <div>
      <div className="font-medium text-slate-900">{title}</div>
      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700">{content.trim() || emptyText}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function conversationActionTargetLabel(target: ConversationActionScope) {
  switch (target) {
    case 'profile':
      return '画像';
    case 'goal':
      return '目标';
    case 'plan':
      return '计划';
    default:
      return target;
  }
}

function conversationActionStatusLabel(status: ConversationActionStatus) {
  switch (status) {
    case 'proposed':
      return '待确认';
    case 'pending':
      return '进行中';
    case 'applied':
      return '已应用';
    default:
      return status;
  }
}

function conversationActionKindLabel(kind: ConversationActionKind) {
  switch (kind) {
    case 'profile_update':
      return '画像更新';
    case 'goal_update':
      return '目标更新';
    case 'plan_update':
      return '计划调整';
    case 'plan_generation':
      return '计划生成';
    case 'unknown':
      return '通用建议';
    default:
      return kind;
  }
}

function conversationActionTargetBadgeClassName(target: ConversationActionScope) {
  switch (target) {
    case 'profile':
      return 'bg-cyan-100 text-cyan-800';
    case 'goal':
      return 'bg-amber-100 text-amber-800';
    case 'plan':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function conversationActionStatusBadgeClassName(status: ConversationActionStatus) {
  switch (status) {
    case 'proposed':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
      return 'bg-rose-100 text-rose-800';
    case 'applied':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function conversationActionReviewLabel(action: ConversationActionPreview) {
  if (action.status === 'applied') {
    return '已应用';
  }

  if (!action.reviewable) {
    return '尚不可确认';
  }

  switch (action.reviewStatus) {
    case 'accepted':
      return '已接受';
    case 'rejected':
      return '已拒绝';
    case 'unreviewed':
      return '待审核';
    default:
      return action.reviewStatus;
  }
}

function conversationActionReviewBadgeClassName(action: ConversationActionPreview) {
  if (action.status === 'applied') {
    return 'bg-sky-100 text-sky-800';
  }

  if (!action.reviewable) {
    return 'bg-slate-100 text-slate-700';
  }

  switch (action.reviewStatus) {
    case 'accepted':
      return 'bg-emerald-100 text-emerald-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-800';
    case 'unreviewed':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function conversationActionIcon(action: ConversationActionPreview) {
  if (action.status === 'pending') {
    return <CircleAlert className="h-4 w-4" />;
  }

  switch (action.target) {
    case 'profile':
      return <Sparkles className="h-4 w-4" />;
    case 'goal':
      return <Target className="h-4 w-4" />;
    case 'plan':
      return <GitCompareArrows className="h-4 w-4" />;
    default:
      return <Flag className="h-4 w-4" />;
  }
}

function conversationActionIconWrapClassName(action: ConversationActionPreview) {
  if (action.status === 'pending') {
    return 'flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700';
  }

  switch (action.target) {
    case 'profile':
      return 'flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700';
    case 'goal':
      return 'flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700';
    case 'plan':
      return 'flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700';
    default:
      return 'flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700';
  }
}

function goalStatusLabel(status: LearningGoal['status']) {
  switch (status) {
    case 'active':
      return '进行中';
    case 'paused':
      return '暂停';
    case 'completed':
      return '已完成';
    default:
      return status;
  }
}

function priorityBadgeClassName(priority: LearningGoal['priority']) {
  switch (priority) {
    case 'P1':
      return 'bg-rose-100 text-rose-700';
    case 'P2':
      return 'bg-amber-100 text-amber-700';
    case 'P3':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusBadgeClassName(status: LearningGoal['status']) {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-700';
    case 'paused':
      return 'bg-slate-200 text-slate-700';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function capabilityLabel(capability: AiObservabilitySnapshot['capabilitySummaries'][number]['capability']) {
  return capabilityOptions.find((option) => option.value === capability)?.label ?? capability;
}

function requestLogStatusLabel(status: AiCapabilityObservabilitySummary['lastStatus']) {
  switch (status) {
    case 'success':
      return '成功';
    case 'error':
      return '失败';
    default:
      return '暂无';
  }
}

function requestLogBadgeClassName(status: AiRequestLogEntry['status']) {
  switch (status) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800';
    case 'error':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDuration(durationMs?: number) {
  if (durationMs === undefined) {
    return '暂无耗时';
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return '暂无';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function providerHealthStatusLabel(status: ProviderConfig['healthStatus']) {
  switch (status) {
    case 'ready':
      return '已通过检查';
    case 'warning':
      return '存在风险';
    default:
      return '待检查';
  }
}

function providerHealthDescription(status: ProviderConfig['healthStatus']) {
  switch (status) {
    case 'ready':
      return '最近一次健康检查或真实调用成功。';
    case 'warning':
      return '最近一次健康检查或真实调用失败，建议先排查配置。';
    default:
      return '尚未执行健康检查。';
  }
}

function providerHealthBadgeClassName(status: ProviderConfig['healthStatus']) {
  switch (status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-800';
    case 'warning':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function renderHealthCheckNotice(result: AiProviderHealthCheckResult) {
  return `${result.providerLabel}：${result.message}`;
}

function providerNoticeClassName(tone: 'info' | 'success' | 'warning') {
  switch (tone) {
    case 'success':
      return 'rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700';
    case 'warning':
      return 'rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800';
    default:
      return 'rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700';
  }
}

function diffKindLabel(kind: PlanDiffKind) {
  switch (kind) {
    case 'added':
      return '新增';
    case 'removed':
      return '移除';
    case 'updated':
      return '调整';
    default:
      return kind;
  }
}

function diffKindBadgeClassName(kind: PlanDiffKind) {
  switch (kind) {
    case 'added':
      return 'bg-emerald-100 text-emerald-700';
    case 'removed':
      return 'bg-rose-100 text-rose-700';
    case 'updated':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function taskStatusLabel(status: TaskStatus) {
  switch (status) {
    case 'todo':
      return '待开始';
    case 'in_progress':
      return '进行中';
    case 'done':
      return '已完成';
    case 'delayed':
      return '已延后';
    default:
      return status;
  }
}

function ProfilePreviewBlock({ title, items, emptyText = '暂无内容' }: { title: string; items: string[]; emptyText?: string }) {
  return (
    <div>
      <div className="font-medium text-slate-900">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={`${title}-${item}`} className="bg-slate-100 text-slate-700">{item}</Badge>) : <Muted>{emptyText}</Muted>}
      </div>
    </div>
  );
}

function ComparisonValueCard({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={[
      'rounded-xl border px-3 py-3 text-sm',
      emphasized ? 'border-blue-200 bg-blue-50 text-blue-950' : 'border-slate-200 bg-slate-50 text-slate-700',
    ].join(' ')}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 leading-6">{value.trim() || '暂无内容'}</div>
    </div>
  );
}

function PlanDiffSection({
  title,
  items,
  emptyText,
  previousLabel,
}: {
  title: string;
  items: PlanDiffEntry[];
  emptyText: string;
  previousLabel: string;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-900">{title}</div>
        <Badge className="bg-slate-100 text-slate-700">{items.length} 处</Badge>
      </div>
      {items.length ? (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-slate-900">{item.label}</div>
                <Badge className={diffKindBadgeClassName(item.kind)}>{diffKindLabel(item.kind)}</Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ComparisonValueCard label={previousLabel} value={item.previous ?? '无'} />
                <ComparisonValueCard label="当前草案" value={item.current ?? '无'} emphasized />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">{emptyText}</div>
      )}
    </div>
  );
}

function StatusRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div>
        <span className="font-medium text-slate-900">{label}：</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={["grid gap-2 text-sm text-slate-700", className].filter(Boolean).join(' ')}>
      <span className="font-medium text-slate-900">{label}</span>
      {children}
    </label>
  );
}

const inputClassName = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const textareaClassName = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 resize-y disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const primaryButtonClassName = 'rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName = 'rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
const successButtonClassName = 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition disabled:cursor-not-allowed disabled:opacity-60';
const dangerButtonClassName = 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60';
const primaryChipClassName = 'rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white';
const secondaryChipClassName = 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700';
