import { useEffect, useState } from 'react';
import { ArrowRight, Bot, LoaderCircle, Sparkles, X } from 'lucide-react';
import { Badge, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import {
  Field,
  codexStateLabel,
  getActiveGoal,
  ghostButtonClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  sectionCardClassName,
  splitLines,
  textareaClassName,
} from '@/pages/dashboard/shared';
import type {
  ConversationActionKind,
  ConversationActionPreview,
  ConversationActionReviewStatus,
  ConversationActionScope,
  ConversationActionStatus,
} from '@shared/app-state';

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
  const conversation = useAppStore((state) => state.conversation);
  const codexAuth = useAppStore((state) => state.codexAuth);
  const saveUserProfile = useAppStore((state) => state.saveUserProfile);
  const upsertLearningGoal = useAppStore((state) => state.upsertLearningGoal);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const appendConversationMessage = useAppStore((state) => state.appendConversationMessage);
  const runProfileExtraction = useAppStore((state) => state.runProfileExtraction);
  const generatePlanAdjustmentSuggestions = useAppStore((state) => state.generatePlanAdjustmentSuggestions);
  const reviewConversationActionPreview = useAppStore((state) => state.reviewConversationActionPreview);
  const applyAcceptedConversationActionPreviews = useAppStore((state) => state.applyAcceptedConversationActionPreviews);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const isFirstRun = !profile.identity.trim() || !profile.timeBudget.trim() || !goals.length;
  const unreviewedCount = conversation.actionPreviews.filter((item) => item.reviewable && item.reviewStatus === 'unreviewed').length;
  const acceptedCount = conversation.actionPreviews.filter((item) => item.reviewStatus === 'accepted' && item.status === 'proposed').length;
  const appliedCount = conversation.actionPreviews.filter((item) => item.status === 'applied').length;
  const rejectedCount = conversation.actionPreviews.filter((item) => item.reviewStatus === 'rejected').length;

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
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);
  const [applyingAccepted, setApplyingAccepted] = useState(false);
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

  async function handleReviewAction(payload: { actionId: string; reviewStatus: ConversationActionReviewStatus }) {
    const currentAction = conversation.actionPreviews.find((item) => item.id === payload.actionId);
    setUpdatingActionId(payload.actionId);
    setNotice(null);

    try {
      await reviewConversationActionPreview(payload);
      if (payload.reviewStatus === 'accepted') {
        setNotice(
          currentAction?.execution
            ? '该预览已加入待应用列表，点击“应用已接受变更”后会真正写入本地画像、目标或路径。'
            : '该预览已标记为接受，但它目前仍是解释型预览，真正应用时会被跳过。',
        );
        return;
      }

      if (payload.reviewStatus === 'rejected') {
        setNotice('该预览已标记为“暂不采纳”，当前不会进入后续应用。');
        return;
      }

      setNotice('已恢复为待确认状态。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新预览审核状态失败。');
    } finally {
      setUpdatingActionId(null);
    }
  }

  async function handleApplyAcceptedActions() {
    const acceptedProposedActions = conversation.actionPreviews.filter(
      (item) => item.reviewStatus === 'accepted' && item.status === 'proposed',
    );

    setApplyingAccepted(true);
    setNotice(null);

    try {
      const result = await applyAcceptedConversationActionPreviews();
      const appliedActions = acceptedProposedActions.filter((item) => result.appliedActionIds.includes(item.id));
      const nextPageId = getPreferredPageId(appliedActions);

      if (result.appliedActionIds.length) {
        const appliedTargetLabels = getAppliedTargetLabels(appliedActions);
        const summary = appliedTargetLabels.length ? `已写回${appliedTargetLabels.join(' / ')}。` : '已写回相关实体。';
        setNotice(
          result.skippedActionIds.length
            ? `${summary} 另有 ${result.skippedActionIds.length} 条解释型预览已跳过。`
            : `${summary} 当前页面状态已同步刷新。`,
        );
        if (nextPageId) {
          onPageChange(nextPageId);
        }
        return;
      }

      if (result.skippedActionIds.length) {
        setNotice(`当前没有可执行的已接受预览；已跳过 ${result.skippedActionIds.length} 条解释型预览。`);
        return;
      }

      setNotice('当前没有待应用的已接受预览。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '应用已接受预览失败。');
    } finally {
      setApplyingAccepted(false);
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

        {notice ? (
          <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {notice}
          </div>
        ) : null}

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
              <button type="button" className={primaryButtonClassName} onClick={() => void handleSaveChange('note')} disabled={submitting || applyingAccepted}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                保存到对话
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={() => void handleSaveChange('profile')} disabled={submitting || applyingAccepted || codexAuth.state !== 'connected'}>
                生成画像建议
              </button>
              <button type="button" className={secondaryButtonClassName} onClick={() => void handleSaveChange('path')} disabled={submitting || applyingAccepted || codexAuth.state !== 'connected' || !activeGoal}>
                生成路径调整
              </button>
            </div>

            <div className={sectionCardClassName}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">动作预览</div>
                  <Muted className="mt-2">先逐条确认，再将已接受建议统一应用到画像、目标或路径实体。</Muted>
                </div>
                <button
                  type="button"
                  className={primaryButtonClassName}
                  onClick={() => void handleApplyAcceptedActions()}
                  disabled={applyingAccepted || acceptedCount === 0}
                >
                  {applyingAccepted ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  应用已接受变更
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <PreviewStat label="待审核" value={String(unreviewedCount)} />
                <PreviewStat label="待应用" value={String(acceptedCount)} />
                <PreviewStat label="已应用" value={String(appliedCount)} />
                <PreviewStat label="已拒绝" value={String(rejectedCount)} />
              </div>

              {conversation.actionPreviews.length ? (
                <div className="mt-4 space-y-4">
                  {conversation.actionPreviews.map((action) => (
                    <ActionPreviewCard
                      key={action.id}
                      action={action}
                      updating={updatingActionId === action.id}
                      onAccept={() => void handleReviewAction({ actionId: action.id, reviewStatus: 'accepted' })}
                      onReject={() => void handleReviewAction({ actionId: action.id, reviewStatus: 'rejected' })}
                    />
                  ))}
                </div>
              ) : (
                <Muted className="mt-4">当前还没有可确认的结构化建议。先生成画像建议或路径调整，预览会出现在这里。</Muted>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] bg-slate-50 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function ActionPreviewCard({
  action,
  updating,
  onAccept,
  onReject,
}: {
  action: ConversationActionPreview;
  updating: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-900">{action.title}</div>
          <Muted className="mt-2">{action.summary}</Muted>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge className={previewStatusBadgeClassName(action.status)}>{previewStatusLabel(action.status)}</Badge>
          <Badge className={previewReviewBadgeClassName(action)}>{previewReviewLabel(action)}</Badge>
          <Badge className={previewTargetBadgeClassName(action.target)}>{previewTargetLabel(action.target)}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-white text-slate-600 ring-1 ring-slate-200">{previewKindLabel(action.kind)}</Badge>
        {action.scopes.map((scope) => (
          <Badge key={`${action.id}-${scope}`} className="bg-slate-100 text-slate-700">{previewTargetLabel(scope)}</Badge>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {action.changes.map((change) => (
          <div key={`${action.id}-${change.field}`} className="rounded-[1.1rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{change.label}</div>
            <div className="mt-2">当前：{change.before ?? '无'}</div>
            <div className="mt-1">建议后：{change.after ?? '无'}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.1rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">为什么建议这样改</div>
        <div className="mt-2">{action.reason}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {action.status === 'applied'
            ? '这条预览已经写入本地实体。'
            : action.reviewable
              ? `当前审核状态：${previewReviewLabel(action)}`
              : '这条建议仍依赖后续运行时接入，目前只保留为展示型预览。'}
        </div>
        {action.status === 'applied' ? (
          <Badge className="bg-sky-100 text-sky-800">已写回实体</Badge>
        ) : action.reviewable ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={onAccept}
              disabled={updating || action.reviewStatus === 'accepted'}
            >
              {updating && action.reviewStatus !== 'accepted' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              接受预览
            </button>
            <button
              type="button"
              className={secondaryButtonClassName}
              onClick={onReject}
              disabled={updating || action.reviewStatus === 'rejected'}
            >
              暂不采纳
            </button>
          </div>
        ) : (
          <Badge className="bg-slate-100 text-slate-700">等待运行时</Badge>
        )}
      </div>
    </div>
  );
}

function previewTargetLabel(target: ConversationActionScope) {
  switch (target) {
    case 'profile':
      return '画像';
    case 'goal':
      return '目标';
    case 'plan':
      return '路径';
    default:
      return target;
  }
}

function previewStatusLabel(status: ConversationActionStatus) {
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

function previewKindLabel(kind: ConversationActionKind) {
  switch (kind) {
    case 'profile_update':
      return '画像更新';
    case 'goal_update':
      return '目标更新';
    case 'plan_update':
      return '路径调整';
    case 'plan_generation':
      return '路径生成';
    case 'unknown':
      return '通用建议';
    default:
      return kind;
  }
}

function previewStatusBadgeClassName(status: ConversationActionStatus) {
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

function previewReviewLabel(action: ConversationActionPreview) {
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

function previewReviewBadgeClassName(action: ConversationActionPreview) {
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

function previewTargetBadgeClassName(target: ConversationActionScope) {
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

function getAppliedTargetLabels(actions: ConversationActionPreview[]) {
  const labels = ['profile', 'goal', 'plan']
    .filter((target) => actions.some((action) => action.target === target))
    .map((target) => previewTargetLabel(target as ConversationActionScope));

  return labels;
}

function getPreferredPageId(actions: ConversationActionPreview[]) {
  if (actions.some((action) => action.target === 'plan' || action.target === 'goal')) {
    return 'path';
  }

  if (actions.some((action) => action.target === 'profile')) {
    return 'today';
  }

  return null;
}
