import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, Flag, PencilLine, Plus, Sparkles, Target } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { useAppStore } from '@/store/app-store';
import type { PageDefinition } from '@/pages/page-data';
import type { AppState, HealthStatus, LearningGoal, LearningPlanDraft, LearningPlanStage, ModelCapability, PlanTask, ProviderConfig, ProviderId, TaskStatus, UserProfile } from '@shared/app-state';
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
      return (
        <div className="grid gap-4 xl:grid-cols-[1.2fr,0.9fr]">
          <Card>
            <SectionTitle>{state.conversation.title}</SectionTitle>
            <Muted className="mt-2">目标：{state.conversation.relatedGoal} · 计划：{state.conversation.relatedPlan}</Muted>
            <div className="mt-4 space-y-3">
              {state.conversation.messages.map((message) => (
                <div key={message.id} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{message.role}</div>
                  {message.content}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>建议动作</SectionTitle>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.conversation.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {state.conversation.suggestions.map((item) => (
                <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      );
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

function PlansContent() {
  const goals = useAppStore((state) => state.goals);
  const activeGoalId = useAppStore((state) => state.plan.activeGoalId);
  const planDrafts = useAppStore((state) => state.plan.drafts);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrationError = useAppStore((state) => state.hydrationError);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const saveLearningPlanDraft = useAppStore((state) => state.saveLearningPlanDraft);

  const activeGoal = goals.find((goal) => goal.id === activeGoalId) ?? goals[0] ?? null;
  const activePlanDraft = getActivePlanDraft(planDrafts, activeGoalId);

  const [draft, setDraft] = useState<LearningPlanDraft | null>(activePlanDraft ? cloneLearningPlanDraft(activePlanDraft) : null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!activePlanDraft) {
      setDraft(null);
      setEditing(false);
      setNotice(null);
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
    <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
      <Card className="border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="bg-slate-900 text-white">{editing ? '草案编辑中' : '当前主目标'}</Badge>
            <SectionTitle className="mt-4 text-2xl">{activeGoal?.title ?? '暂未设置主目标'}</SectionTitle>
            <Muted className="mt-2 max-w-2xl">{activeGoal ? activeGoal.motivation : '请先在目标页选择一个当前重点目标，计划页会跟随切换到该目标的独立草案。'}</Muted>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={editing ? successButtonClassName : secondaryButtonClassName} type="button" onClick={() => {
              setEditing((current) => !current);
              setNotice(null);
            }} disabled={saving}>
              {editing ? '结束编辑' : '编辑草案'}
            </button>
            <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={!editing || saving || !hasChanges}>
              {saving ? '保存中…' : '保存计划'}
            </button>
            <button className={secondaryButtonClassName} type="button" onClick={restoreDraft} disabled={saving || !hasChanges}>
              还原当前值
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard label="阶段数" value={String(stageProgressStats.total)} />
          <StatCard label="已完成阶段" value={String(stageProgressStats.completed)} />
          <StatCard label="任务完成" value={`${taskStats.completed}/${taskStats.total}`} />
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
                      disabled={!editing || saving}
                    />
                  </Field>
                </div>
                <div className="w-full max-w-[180px]">
                  <Field label="进度">
                    <select
                      className={inputClassName}
                      value={stage.progress}
                      onChange={(event) => updateStage(index, 'progress', event.target.value)}
                      disabled={!editing || saving}
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
                  disabled={!editing || saving}
                />
              </Field>
              {editing ? (
                <div className="mt-3 flex justify-end">
                  <button
                    className={dangerButtonClassName}
                    type="button"
                    onClick={() => removeStage(index)}
                    disabled={saving || draft.stages.length <= 1}
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
            <button className={secondaryButtonClassName} type="button" onClick={addStage} disabled={saving}>
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
            <StatusRow icon={<Check className="h-4 w-4" />} label="Renderer 状态" value={hydrated ? '已完成 hydration，可直接编辑当前目标草案。' : '正在加载本地计划草案…'} />
            <StatusRow icon={<Sparkles className="h-4 w-4" />} label="保存链路" value="saveLearningPlanDraft → preload IPC → main handler → AppStorageService → learning_plan_drafts / plan_stages / plan_tasks" />
            <StatusRow icon={<CircleAlert className="h-4 w-4" />} label="当前边界" value="本轮只覆盖手动编辑与持久化，不含重新生成、版本对比与 AI 重排。" />
            {lastSavedAt ? <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">最近一次成功保存：{lastSavedAt}</div> : null}
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
                  disabled={!editing || saving}
                />
              </Field>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="预计时长">
                  <input
                    className={inputClassName}
                    value={task.duration}
                    onChange={(event) => updateTask(index, 'duration', event.target.value)}
                    disabled={!editing || saving}
                  />
                </Field>
                <Field label="状态">
                  <select
                    className={inputClassName}
                    value={task.status}
                    onChange={(event) => updateTask(index, 'status', event.target.value)}
                    disabled={!editing || saving}
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
                  disabled={!editing || saving}
                />
              </Field>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Badge className="bg-slate-100 text-slate-700">{taskStatusLabel(task.status)}</Badge>
                {editing ? (
                  <button
                    className={dangerButtonClassName}
                    type="button"
                    onClick={() => removeTask(index)}
                    disabled={saving || draft.tasks.length <= 1}
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
            <button className={secondaryButtonClassName} type="button" onClick={addTask} disabled={saving}>
              <Plus className="mr-1 inline h-4 w-4" />新增任务
            </button>
          </div>
        ) : null}
      </Card>
    </div>
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
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrationError = useAppStore((state) => state.hydrationError);
  const upsertLearningGoal = useAppStore((state) => state.upsertLearningGoal);
  const setActiveGoal = useAppStore((state) => state.setActiveGoal);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id ?? 'new');
  const [draft, setDraft] = useState<LearningGoalInput>(goals[0] ? { ...goals[0] } : defaultGoalDraft());
  const [saving, setSaving] = useState(false);
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

  const startCreate = () => {
    setSelectedGoalId('new');
    setDraft(defaultGoalDraft());
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

  return (
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
          <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={saving || !hasChanges}>
            {saving ? '保存中…' : isCreating ? '创建目标' : '保存修改'}
          </button>
          {!isCreating ? (
            <button className={selectedGoal?.id === activeGoalId ? successButtonClassName : secondaryButtonClassName} type="button" onClick={() => void onSetActiveGoal()} disabled={saving || !selectedGoal || selectedGoal.id === activeGoalId}>
              {selectedGoal?.id === activeGoalId ? '当前主目标' : '设为当前目标'}
            </button>
          ) : null}
          <button className={secondaryButtonClassName} type="button" onClick={restoreDraft} disabled={saving || !hasChanges}>
            {isCreating ? '清空草稿' : '恢复当前值'}
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <StatusRow icon={<Flag className="h-4 w-4" />} label="目标链路" value="目标页表单 / 设为当前目标 → Zustand store → preload IPC → main storage service → SQLite learning_goals + learning_plan_drafts" />
          <StatusRow icon={<Target className="h-4 w-4" />} label="当前能力" value="已支持目标新建、编辑、设为当前主目标，并为每个目标维护独立 plan draft payload。" />
          <StatusRow icon={<PencilLine className="h-4 w-4" />} label="当前边界" value="本轮不含目标删除、排序拖拽、AI 实时重算与多目标交叉依赖分析。" />
          <StatusRow icon={<Check className="h-4 w-4" />} label="Renderer 状态" value={hydrated ? '已完成 hydration，可直接编辑和新建目标。' : '正在加载本地目标…'} />
          {lastSavedAt ? <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">最近一次成功保存：{lastSavedAt}</div> : null}
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
            <li className="rounded-lg bg-slate-50 px-3 py-2">保存新目标后会先生成本地模板草案，后续再接入真实 AI 生成。</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SettingsContent() {
  const state = useAppStore();
  const saveAppState = useAppStore((store) => store.saveAppState);
  const providerConfiguredCount = state.settings.providers.filter((provider) => provider.hasSecret).length;
  const [settingsDraft, setSettingsDraft] = useState(state.settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  useEffect(() => {
    setSettingsDraft(state.settings);
  }, [state.settings]);

  const onSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      await saveAppState({ ...state, settings: settingsDraft });
      setSettingsNotice('应用偏好与用途路由已写入本地 SQLite。');
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

function ProviderEditor({ provider }: { provider: ProviderConfig }) {
  const upsertProviderConfig = useAppStore((store) => store.upsertProviderConfig);
  const clearProviderSecret = useAppStore((store) => store.clearProviderSecret);
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
  const [notice, setNotice] = useState<string | null>(null);

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
    try {
      await upsertProviderConfig({ config: draft, secret: secretDraft.trim() ? secretDraft : undefined });
      setNotice(secretDraft.trim() ? '配置与 secret 已保存。' : '配置已保存。');
      setSecretDraft('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Provider 保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onClearSecret = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await clearProviderSecret(provider.id);
      setSecretDraft('');
      setNotice('已清空本地保存的 secret。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '清空 secret 失败');
    } finally {
      setSaving(false);
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
            <select className={inputClassName} value={draft.healthStatus} onChange={(event) => setDraft((current) => ({ ...current, healthStatus: event.target.value as HealthStatus }))}>
              <option value="unknown">unknown</option>
              <option value="ready">ready</option>
              <option value="warning">warning</option>
            </select>
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
          <div>最近更新时间：{provider.updatedAt ?? '暂无'}</div>
        </div>
        {notice ? <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div> : null}
        <div className="flex flex-wrap gap-3">
          <button className={primaryButtonClassName} type="button" onClick={() => void onSave()} disabled={saving}>{saving ? '保存中…' : '保存 Provider'}</button>
          <button className={secondaryButtonClassName} type="button" onClick={() => {
            setDraft({ id: provider.id, label: provider.label, enabled: provider.enabled, endpoint: provider.endpoint, model: provider.model, authMode: provider.authMode, capabilityTags: provider.capabilityTags, healthStatus: provider.healthStatus });
            setSecretDraft('');
            setNotice('已恢复为最近一次持久化的值。');
          }} disabled={saving}>恢复</button>
          <button className={secondaryButtonClassName} type="button" onClick={() => void onClearSecret()} disabled={saving}>清空 Secret</button>
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
