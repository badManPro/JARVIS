import { BellRing, Orbit, PartyPopper, Sparkles } from 'lucide-react';
import { Badge, Muted } from '@/components/ui';
import { cn } from '@/lib/utils';
import { pages } from '@/pages/page-data';
import { getActiveDraft, getActiveGoal, getFocusTodayPlanStep } from '@/pages/dashboard/shared';
import { useAppStore } from '@/store/app-store';
import {
  companionPresenceByMode,
  createCompanionNavigateAction,
  resolveCompanionPersona,
  type CompanionAction,
  type CompanionCue,
  type CompanionMode,
  type CompanionPersona,
  type CompanionPersonaProfile,
  type CompanionPresence,
} from '@shared/companion';
import type { DashboardRiskSignal, LearningPlanDraft } from '@shared/app-state';

type DesktopCompanionProps = {
  currentPage: string;
  onOpenCoach: () => void;
  onPageChange: (pageId: string) => void;
};

type CompanionBrief = {
  mode: CompanionMode;
  label: string;
  title: string;
  detail: string;
  note: string;
  presence: CompanionPresence;
  persona: CompanionPersona;
  chips: string[];
  action: CompanionAction;
  cueSource?: string;
  cueSourceLabel?: string;
  cueSourceDetail?: string;
};

const companionDuties = [
  {
    mode: 'reminder' as const,
    label: '提醒',
    detail: '只指出当前下一步和风险，不替代页面主流程。',
  },
  {
    mode: 'celebration' as const,
    label: '庆祝',
    detail: '在你完成步骤或拉起连续推进时确认进展。',
  },
  {
    mode: 'status' as const,
    label: '状态反馈',
    detail: '解释系统为什么重排、为什么建议当前动作。',
  },
];

function withPresence(
  brief: Omit<CompanionBrief, 'presence' | 'persona'>,
  personaProfile: CompanionPersonaProfile,
  personaHint?: CompanionCue['personaHint'],
): CompanionBrief {
  return {
    ...brief,
    presence: companionPresenceByMode[brief.mode],
    persona: resolveCompanionPersona(personaProfile, personaHint),
  };
}

function getPageTitle(pageId: string) {
  return pages.find((page) => page.id === pageId)?.title ?? '当前页面';
}

function resolveRiskPageId(signal: DashboardRiskSignal) {
  if (signal.id === 'main-goal-continuity') {
    return 'calendar';
  }

  if (signal.id.startsWith('first-run-setup')) {
    return 'today';
  }

  return 'today';
}

function buildCelebrationBrief(
  activeDraft: LearningPlanDraft | null,
  personaProfile: CompanionPersonaProfile,
): CompanionBrief | null {
  const todayPlan = activeDraft?.todayPlan;
  const completedCount = todayPlan?.steps.filter((step) => step.status === 'done').length ?? 0;
  if (!todayPlan || completedCount === 0) {
    return null;
  }

  const nextFocusStep = getFocusTodayPlanStep(activeDraft);

  return withPresence({
    mode: 'celebration',
    label: '角色庆祝',
    title: nextFocusStep
      ? `今天已经推进 ${completedCount} 个步骤，下一步保持连续感`
      : '今天的步骤已经完成，节奏没有断线',
    detail: nextFocusStep
      ? `角色会在你完成步骤后确认进展，并把焦点重新收束到「${nextFocusStep.title}」。`
      : '角色会在步骤清空后确认今天的产出，避免你为了“做完了什么”再额外切换页面。',
    note: '庆祝职责只负责确认推进感，不额外制造新的决策负担。',
    chips: [
      `${completedCount} 步已完成`,
      todayPlan.deliverable || '今日产出已更新',
      nextFocusStep?.duration ?? '继续保持连续推进',
    ],
    action: createCompanionNavigateAction('查看今日执行', 'today', 'resume-flow'),
  }, personaProfile, 'encouraging');
}

function buildCueBrief(
  cue: CompanionCue,
  personaProfile: CompanionPersonaProfile,
): CompanionBrief {
  return withPresence({
    mode: cue.mode,
    label: cue.label,
    title: cue.title,
    detail: cue.detail,
    note: cue.note,
    chips: cue.chips,
    action: cue.action,
    cueSource: cue.source,
    cueSourceLabel: cue.sourceLabel,
    cueSourceDetail: cue.sourceDetail ?? cue.title,
  }, personaProfile, cue.personaHint);
}

function buildCompanionBrief({
  currentPage,
  dashboard,
  activeGoalTitle,
  activeDraft,
  companionCue,
  personaProfile,
}: {
  currentPage: string;
  dashboard: ReturnType<typeof useAppStore.getState>['dashboard'];
  activeGoalTitle: string;
  activeDraft: LearningPlanDraft | null;
  companionCue: CompanionCue | null;
  personaProfile: CompanionPersonaProfile;
}): CompanionBrief {
  if (companionCue) {
    return buildCueBrief(companionCue, personaProfile);
  }

  const nextOnboardingStep = dashboard.onboarding.steps.find((step) => step.status !== 'complete') ?? dashboard.onboarding.steps[0];
  if (dashboard.onboarding.active) {
    return withPresence({
      mode: 'reminder',
      label: '角色提醒',
      title: `先完成：${nextOnboardingStep?.actionLabel ?? '开始建档'}`,
      detail: `${dashboard.onboarding.detail} 角色当前只负责把你送到下一个必要动作，不抢主流程入口。`,
      note: '提醒职责在首次启动期优先工作，把页面主线保持在“先完成下一步”。',
      chips: [
        dashboard.onboarding.title,
        nextOnboardingStep?.title ?? '开始使用',
        activeGoalTitle,
      ],
      action: createCompanionNavigateAction(
        nextOnboardingStep?.actionLabel ?? '开始建档',
        nextOnboardingStep?.pageId ?? 'today',
        'continue-onboarding',
      ),
    }, personaProfile, 'direct');
  }

  const primaryRisk = dashboard.riskSignals[0] ?? null;
  if (primaryRisk?.level === 'high') {
    return withPresence({
      mode: 'reminder',
      label: '角色提醒',
      title: primaryRisk.title,
      detail: `${primaryRisk.detail} 角色会把风险翻译成一条动作，但不会直接改写你的计划流程。`,
      note: '提醒职责在高风险时优先出现，先把最需要处理的问题说清楚。',
      chips: [
        primaryRisk.action,
        activeGoalTitle,
        dashboard.duration,
      ],
      action: createCompanionNavigateAction('处理当前风险', resolveRiskPageId(primaryRisk), 'resolve-risk'),
    }, personaProfile, 'direct');
  }

  if (dashboard.priorityAction.kind === 'start') {
    return withPresence({
      mode: 'reminder',
      label: '角色提醒',
      title: dashboard.priorityAction.title,
      detail: `${dashboard.priorityAction.reason} 角色会把当前最应该开始的动作压缩成一句提醒，不额外扩展流程。`,
      note: '提醒职责在常规推进里也成立，用来把“现在先做什么”说清楚。',
      chips: [
        dashboard.duration,
        dashboard.stage,
        activeGoalTitle,
      ],
      action: createCompanionNavigateAction(`前往${getPageTitle(currentPage)}`, currentPage, 'resume-flow'),
    }, personaProfile);
  }

  const celebrationBrief = buildCelebrationBrief(activeDraft, personaProfile);
  if (celebrationBrief) {
    return celebrationBrief;
  }

  const primaryAllocation = dashboard.scheduling.allocations.find((allocation) => allocation.role === 'main') ?? null;
  if (dashboard.scheduling.allocations.length) {
    return withPresence({
      mode: 'status',
      label: '角色状态反馈',
      title: currentPage === 'calendar'
        ? '系统正在解释这一周为什么这样安排'
        : dashboard.priorityAction.title,
      detail: currentPage === 'calendar'
        ? `${dashboard.scheduling.headline} 角色只负责解释排程原因，不把自己做成新的排程入口。`
        : `${dashboard.priorityAction.reason} 角色会持续同步主目标推进、补位和延期状态。`,
      note: '状态反馈职责用于讲清系统判断，不替代你在页面里的实际操作。',
      chips: [
        primaryAllocation ? `主目标占位 ${primaryAllocation.scheduledShare}%` : '等待主目标占位',
        dashboard.scheduling.delayedPlacements.length ? `延期补回 ${dashboard.scheduling.delayedPlacements.length}` : '当前无延期补回',
        activeGoalTitle,
      ],
      action: createCompanionNavigateAction(
        currentPage === 'calendar' ? '查看当前排程' : `前往${getPageTitle('calendar')}`,
        'calendar',
        'review-schedule',
      ),
    }, personaProfile, 'steady');
  }

  return withPresence({
    mode: 'status',
    label: '角色状态反馈',
    title: dashboard.priorityAction.title,
    detail: `${dashboard.priorityAction.reason} 当前角色层只同步状态，不改页面主路径。`,
    note: '状态反馈职责在常规推进时工作，把系统判断压缩成一句可执行反馈。',
    chips: [
      dashboard.stage,
      dashboard.duration,
      activeGoalTitle,
    ],
    action: createCompanionNavigateAction(`回到${getPageTitle(currentPage)}`, currentPage, 'resume-flow'),
  }, personaProfile);
}

function CompanionModeIcon({ mode }: { mode: CompanionMode }) {
  switch (mode) {
    case 'reminder':
      return <BellRing className="h-4 w-4" />;
    case 'celebration':
      return <PartyPopper className="h-4 w-4" />;
    case 'status':
    default:
      return <Orbit className="h-4 w-4" />;
  }
}

export function DesktopCompanion({
  currentPage,
  onOpenCoach,
  onPageChange,
}: DesktopCompanionProps) {
  const dashboard = useAppStore((state) => state.dashboard);
  const companionCue = useAppStore((state) => state.companionCue);
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const profile = useAppStore((state) => state.profile);
  const activeGoal = getActiveGoal(goals, plan.activeGoalId);
  const activeDraft = getActiveDraft(plan);
  const brief = buildCompanionBrief({
    currentPage,
    dashboard,
    activeGoalTitle: activeGoal?.title ?? '先完成第一轮建档',
    activeDraft,
    companionCue,
    personaProfile: profile,
  });

  return (
    <div className="desktop-companion-shell hidden xl:block" aria-live="polite">
      <div
        className="desktop-companion-panel"
        data-mode={brief.mode}
        data-cue-active={brief.cueSource ? 'true' : 'false'}
        data-linked-source={brief.cueSource ?? 'dashboard'}
        data-persona={brief.persona.id}
        data-tone={brief.persona.tone}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn('desktop-companion-avatar', `is-${brief.mode}`)}
            data-motion={brief.presence.motion}
            data-expression={brief.presence.expression}
            data-persona={brief.persona.id}
            data-tone={brief.persona.tone}
            aria-hidden="true"
          >
            <span className="desktop-companion-orbit" />
            <div className="desktop-companion-face">
              <div className="desktop-companion-brows">
                <span className="desktop-companion-brow" />
                <span className="desktop-companion-brow" />
              </div>
              <div className="desktop-companion-eyes">
                <span className="desktop-companion-eye" />
                <span className="desktop-companion-eye" />
              </div>
              <span className="desktop-companion-mouth" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <Badge className="bg-white/88 text-slate-700">桌面陪伴层</Badge>
              <div className="desktop-companion-mode-pill">
                <CompanionModeIcon mode={brief.mode} />
                {brief.label}
              </div>
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">JARVIS Companion</div>
            <div className="mt-2 text-lg font-semibold leading-7 text-slate-950">{brief.title}</div>
            <Muted className="mt-3 text-sm leading-6 text-slate-700">{brief.detail}</Muted>
            {brief.cueSourceLabel ? (
              <div className="desktop-companion-link mt-3">
                <div className="desktop-companion-link-label">最近联动</div>
                <div className="desktop-companion-link-value">{brief.cueSourceLabel}</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">{brief.cueSourceDetail}</div>
              </div>
            ) : null}
            <div className="desktop-companion-link mt-3">
              <div className="desktop-companion-link-label">人格基调</div>
              <div className="desktop-companion-link-value">{brief.persona.label}</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">{brief.persona.summary}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {brief.chips.map((chip) => (
            <Badge key={`${brief.mode}-${chip}`} className="bg-white/82 text-slate-700">
              {chip}
            </Badge>
          ))}
        </div>

        <div className="desktop-companion-presence mt-4">
          <div className="desktop-companion-presence-card">
            <div className="desktop-companion-presence-label">当前动作</div>
            <div className="desktop-companion-presence-value">{brief.presence.motionLabel}</div>
          </div>
          <div className="desktop-companion-presence-card">
            <div className="desktop-companion-presence-label">当前表情</div>
            <div className="desktop-companion-presence-value">{brief.presence.expressionLabel}</div>
          </div>
          <div className="desktop-companion-presence-card">
            <div className="desktop-companion-presence-label">当前语气</div>
            <div className="desktop-companion-presence-value">{brief.persona.toneLabel}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {companionDuties.map((duty) => (
            <div
              key={duty.mode}
              className={cn('desktop-companion-duty', duty.mode === brief.mode && 'is-active')}
              data-duty={duty.mode}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <CompanionModeIcon mode={duty.mode} />
                {duty.label}
              </div>
              <div className="mt-2 text-xs leading-5 text-slate-600">{duty.detail}</div>
            </div>
          ))}
        </div>

        <div className="desktop-companion-note mt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Sparkles className="h-4 w-4 text-slate-500" />
            陪伴层，不是主入口
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-600">{brief.note}</div>
          <div className="mt-2 text-xs leading-5 text-slate-500">{brief.persona.boundary}</div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="neo-button neo-button-primary inline-flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white"
            onClick={() => onPageChange(brief.action.pageId)}
          >
            {brief.action.label}
          </button>
          <button
            type="button"
            className="neo-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700"
            onClick={onOpenCoach}
          >
            记录变化
          </button>
        </div>
      </div>
    </div>
  );
}
