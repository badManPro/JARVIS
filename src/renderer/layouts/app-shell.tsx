import { useMemo, useState } from 'react';
import { ArrowRight, Bot, CircleAlert } from 'lucide-react';
import { Badge, Card, Muted, SectionTitle } from '@/components/ui';
import { pages, type PageDefinition } from '@/pages/page-data';
import { CoachDrawer, PageContent } from '@/pages/dashboard-content';
import { useAppStore } from '@/store/app-store';

type AppShellProps = {
  currentPage: string;
  onPageChange: (id: string) => void;
};

function getActiveGoalTitle(goals: ReturnType<typeof useAppStore.getState>['goals'], activeGoalId: string) {
  return goals.find((goal) => goal.id === activeGoalId)?.title ?? goals[0]?.title ?? '先完成第一轮建档';
}

export function AppShell({ currentPage, onPageChange }: AppShellProps) {
  const [coachOpen, setCoachOpen] = useState(false);
  const activePage = useMemo<PageDefinition>(
    () => pages.find((page) => page.id === currentPage) ?? pages[0],
    [currentPage],
  );
  const dashboard = useAppStore((state) => state.dashboard);
  const goals = useAppStore((state) => state.goals);
  const plan = useAppStore((state) => state.plan);
  const profile = useAppStore((state) => state.profile);
  const codexAuth = useAppStore((state) => state.codexAuth);
  const activeGoalTitle = getActiveGoalTitle(goals, plan.activeGoalId);
  const nextOnboardingStep = dashboard.onboarding.steps.find((step) => step.status !== 'complete');

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#f7f3ec_0%,_#eef2f5_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-[5%] h-64 w-64 rounded-full bg-[#ffd8bc]/55 blur-3xl" />
        <div className="absolute right-[10%] top-[16%] h-72 w-72 rounded-full bg-[#dce7f5]/70 blur-3xl" />
        <div className="absolute bottom-[6%] left-[22%] h-80 w-80 rounded-full bg-white/55 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        <aside className="neo-panel flex w-full shrink-0 flex-col gap-4 p-5 lg:min-h-[calc(100vh-3rem)] lg:w-[19.5rem] lg:max-w-[19.5rem]">
          <div>
            <Badge className="bg-white/85 text-slate-700">Learning Cockpit</Badge>
            <div className="mt-4">
              <h1 className="text-3xl font-semibold tracking-[-0.08em] text-[color:var(--neo-foreground-strong)]">JARVIS</h1>
              <p className="mt-2 text-sm leading-6 text-[color:var(--neo-muted)]">给不会规划的自学者一个能直接开始的学习驾驶舱。</p>
            </div>
          </div>

          <Card className="bg-white/75 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">当前主目标</div>
            <div className="mt-3 text-lg font-semibold text-slate-950">{activeGoalTitle}</div>
            <Muted className="mt-2">{dashboard.onboarding.active ? dashboard.onboarding.detail : dashboard.stage}</Muted>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-slate-900 text-white">{dashboard.duration}</Badge>
              <Badge className="bg-white/90 text-slate-700">{profile.mbti || 'MBTI 可选'}</Badge>
            </div>
          </Card>

          <nav className="space-y-2">
            {pages.map((page) => {
              const Icon = page.icon;
              const active = page.id === activePage.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onPageChange(page.id)}
                  className={[
                    'flex w-full items-start gap-3 rounded-[1.5rem] px-4 py-4 text-left transition duration-200',
                    active ? 'bg-slate-900 text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)]' : 'bg-white/65 text-slate-700 hover:bg-white/85 hover:text-slate-950',
                  ].join(' ')}
                >
                  <div className={[
                    'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]',
                    active ? 'bg-white/15' : 'bg-slate-100',
                  ].join(' ')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">{page.title}</div>
                    <div className={active ? 'mt-1 text-xs leading-5 text-white/75' : 'mt-1 text-xs leading-5 text-slate-500'}>{page.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          <button type="button" className="neo-button neo-button-primary inline-flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-white" onClick={() => setCoachOpen(true)}>
            <Bot className="h-4 w-4" />
            {dashboard.onboarding.active ? '开始对话建档' : '发起调整'}
          </button>

          <Card className="mt-auto bg-white/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">Codex 状态</div>
              <Badge className={codexAuth.state === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                {codexAuth.state === 'connected' ? '已连接' : '未连接'}
              </Badge>
            </div>
            <Muted className="mt-3">{codexAuth.message}</Muted>
            {dashboard.onboarding.active ? (
              <div className="mt-4 rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                下一步：{nextOnboardingStep?.actionLabel ?? '开始稳定推进'}
              </div>
            ) : null}
            <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950" onClick={() => onPageChange('settings')}>
              去设置
              <ArrowRight className="h-4 w-4" />
            </button>
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{activePage.title}</div>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.08em] text-[color:var(--neo-foreground-strong)]">{activePage.description}</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm text-slate-700">
                <CircleAlert className="h-4 w-4" />
                风险 {dashboard.riskSignals.length} 条
              </div>
              <button type="button" className="neo-button inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700" onClick={() => setCoachOpen(true)}>
                <Bot className="h-4 w-4" />
                {dashboard.onboarding.active ? '开始建档' : '我有变化'}
              </button>
            </div>
          </div>

          <PageContent page={activePage} onPageChange={onPageChange} onOpenCoach={() => setCoachOpen(true)} />
        </main>
      </div>

      <CoachDrawer open={coachOpen} onClose={() => setCoachOpen(false)} />
    </div>
  );
}
