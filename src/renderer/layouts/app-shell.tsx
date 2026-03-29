import { useMemo } from 'react';
import { pages, type PageDefinition } from '@/pages/page-data';
import { Badge, Card, SectionTitle } from '@/components/ui';
import { PageContent } from '@/pages/page-content';
import { useAppStore } from '@/store/app-store';

type AppShellProps = {
  currentPage: string;
  onPageChange: (id: string) => void;
};

export function AppShell({ currentPage, onPageChange }: AppShellProps) {
  const activePage = useMemo<PageDefinition>(
    () => pages.find((page) => page.id === currentPage) ?? pages[0],
    [currentPage],
  );
  const dashboard = useAppStore((state) => state.dashboard);
  const profile = useAppStore((state) => state.profile);
  const planState = useAppStore((state) => state.plan);
  const settings = useAppStore((state) => state.settings);
  const activePlanDraft = useMemo(
    () => planState.drafts.find((draft) => draft.goalId === planState.activeGoalId) ?? planState.drafts[0] ?? null,
    [planState],
  );

  return (
    <div className="relative h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-10 h-64 w-64 rounded-full bg-white/60 blur-3xl" />
        <div className="absolute right-[8%] top-[12%] h-72 w-72 rounded-full bg-[#ffe4d9]/70 blur-3xl" />
        <div className="absolute bottom-[8%] left-[22%] h-80 w-80 rounded-full bg-[#dde7f4]/80 blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        <aside className="neo-panel flex w-full shrink-0 flex-col overflow-y-auto p-5 text-slate-700 lg:h-full lg:w-[18.75rem] lg:max-w-[18.75rem] lg:overflow-y-auto">
          <div className="space-y-4">
            <Badge className="bg-white/75 text-[color:var(--neo-muted)]">Soft Interface</Badge>
            <div className="neo-inset rounded-[2rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.06em] text-[color:var(--neo-foreground-strong)]">JARVIS</h1>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--neo-muted)]">本地优先的学习规划桌面客户端</p>
                </div>
                <div className="neo-icon-well h-12 w-12 text-lg font-semibold text-[color:var(--neo-accent-strong)]">J</div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="neo-panel-soft p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--neo-muted)]">连续</div>
                  <div className="mt-2 text-xl font-semibold text-[color:var(--neo-foreground-strong)]">{dashboard.streakDays}</div>
                  <div className="text-xs text-[color:var(--neo-muted)]">学习天数</div>
                </div>
                <div className="neo-panel-soft p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--neo-muted)]">完成率</div>
                  <div className="mt-2 text-xl font-semibold text-[color:var(--neo-foreground-strong)]">{dashboard.weeklyCompletion}%</div>
                  <div className="text-xs text-[color:var(--neo-muted)]">本周进度</div>
                </div>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-3">
          {pages.map((page) => {
            const Icon = page.icon;
            const active = page.id === activePage.id;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onPageChange(page.id)}
                className={[
                  'group flex w-full items-start gap-3 rounded-[1.55rem] px-4 py-4 text-left transition duration-200',
                  active ? 'neo-panel-soft text-[color:var(--neo-foreground-strong)]' : 'neo-inset text-[color:var(--neo-muted)] hover:text-[color:var(--neo-foreground)]',
                ].join(' ')}
              >
                <div className={[
                  'neo-icon-well mt-0.5 h-10 w-10 shrink-0 text-[color:var(--neo-muted)] transition duration-200',
                  active ? 'text-[color:var(--neo-accent-strong)]' : 'group-hover:text-[color:var(--neo-foreground-strong)]',
                ].join(' ')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{page.title}</div>
                  <div className="mt-1 text-xs leading-5 opacity-90">{page.description}</div>
                </div>
              </button>
            );
          })}
          </nav>

          <div className="neo-inset mt-auto rounded-[1.9rem] p-4 text-sm text-[color:var(--neo-muted)]">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-[color:var(--neo-foreground-strong)]">{dashboard.onboarding.active ? '首次启动引导' : '当前计划草案'}</div>
              <Badge className="bg-white/70 text-[color:var(--neo-muted)]">{dashboard.stage}</Badge>
            </div>
            <p className="mt-3 leading-6">{dashboard.onboarding.active ? dashboard.onboarding.detail : (activePlanDraft?.summary ?? '切换目标后会加载该目标对应的计划草案。')}</p>
            <div className="mt-4 text-xs leading-5 text-[color:var(--neo-muted)]">当前用户：{profile.name || '未命名'} · 默认通用对话模型：{settings.routing.generalChat}</div>
          {dashboard.onboarding.active ? (
              <div className="mt-2 text-xs leading-5 text-[color:var(--neo-muted)]">
              下一步：{dashboard.onboarding.steps.find((step) => step.status !== 'complete')?.actionLabel ?? '回到首页查看引导'}
              </div>
          ) : null}
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto lg:min-w-0 lg:h-full lg:overflow-y-auto">
          <section className="mb-6 grid gap-4 xl:grid-cols-[1.8fr,1fr]">
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <Badge className="bg-white/80 text-[color:var(--neo-muted)]">当前页面</Badge>
                  <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--neo-foreground-strong)]">{activePage.title}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--neo-muted)]">{activePage.hero}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
              {activePage.sections.map((section) => (
                    <span key={section.title} className="neo-pill px-4 py-2 text-sm font-medium text-[color:var(--neo-foreground)]">{section.title}</span>
              ))}
                  </div>
                </div>

                <div className="neo-inset w-full rounded-[2rem] p-5 xl:max-w-[20rem]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--neo-muted)]">Workspace Pulse</div>
                      <div className="mt-2 text-lg font-semibold text-[color:var(--neo-foreground-strong)]">今日面板焦点</div>
                    </div>
                    <div className="neo-icon-well h-11 w-11 text-[color:var(--neo-accent-strong)]">{activePage.sections.length}</div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="neo-panel-soft px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--neo-muted)]">当前阶段</div>
                      <div className="mt-2 text-sm font-medium text-[color:var(--neo-foreground-strong)]">{dashboard.stage}</div>
                    </div>
                    <div className="neo-panel-soft px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--neo-muted)]">主要风险</div>
                      <div className="mt-2 text-sm font-medium text-[color:var(--neo-foreground-strong)]">{dashboard.riskSignals.length} 条待处理</div>
                    </div>
                    <div className="neo-panel-soft px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--neo-muted)]">当前用户</div>
                      <div className="mt-2 text-sm font-medium text-[color:var(--neo-foreground-strong)]">{profile.name || '未命名'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle>当前实现边界</SectionTitle>
              <div className="mt-4 space-y-3">
                {[
                  '已按目标保存独立计划草案，并支持切换当前目标时同步切换计划内容',
                  '用户画像、目标、计划草案、设置已接通 SQLite 持久化链路',
                  '真实 AI 请求、计划自动重算与更细粒度计划编辑仍待接入',
                ].map((item) => (
                  <div key={item} className="neo-inset rounded-[1.35rem] px-4 py-3 text-sm leading-6 text-[color:var(--neo-muted)]">{item}</div>
                ))}
              </div>
            </Card>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
          {activePage.sections.map((section) => (
              <Card key={section.title}>
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle>{section.title}</SectionTitle>
                  <div className="neo-icon-well h-10 w-10 text-[color:var(--neo-accent-strong)]">{section.bullets.length}</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-[color:var(--neo-muted)]">用于定义页面首屏骨架与后续交互边界。</div>
                <ul className="mt-4 space-y-3 text-sm text-[color:var(--neo-foreground)]">
                {section.bullets.map((item) => (
                    <li key={item} className="neo-inset rounded-[1.2rem] px-4 py-3">{item}</li>
                ))}
                </ul>
              </Card>
          ))}
          </section>

          <PageContent page={activePage} onPageChange={onPageChange} />
        </main>
      </div>
    </div>
  );
}
