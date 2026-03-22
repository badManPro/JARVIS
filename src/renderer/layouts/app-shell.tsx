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
    <div className="flex min-h-screen bg-transparent text-foreground">
      <aside className="flex w-72 flex-col border-r border-white/60 bg-slate-950 px-5 py-6 text-slate-50">
        <div className="mb-8 space-y-2">
          <Badge className="bg-blue-500/20 text-blue-100">Alpha Skeleton</Badge>
          <h1 className="text-2xl font-semibold">Learning Companion</h1>
          <p className="text-sm text-slate-300">本地优先的学习规划桌面客户端</p>
        </div>

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
                  'flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left transition',
                  active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                ].join(' ')}
              >
                <Icon className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">{page.title}</div>
                  <div className="text-xs opacity-80">{page.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="font-medium text-white">{dashboard.onboarding.active ? '首次启动引导' : '当前计划草案'}</div>
          <p className="mt-2">{dashboard.onboarding.active ? dashboard.onboarding.detail : (activePlanDraft?.summary ?? '切换目标后会加载该目标对应的计划草案。')}</p>
          <div className="mt-3 text-xs text-slate-400">当前用户：{profile.name || '未命名'} · 默认通用对话模型：{settings.routing.generalChat}</div>
          {dashboard.onboarding.active ? (
            <div className="mt-2 text-xs text-slate-400">
              下一步：{dashboard.onboarding.steps.find((step) => step.status !== 'complete')?.actionLabel ?? '回到首页查看引导'}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">
        <section className="mb-6 grid gap-4 xl:grid-cols-[2fr,1fr]">
          <Card className="border-white/60 bg-white/80 backdrop-blur">
            <Badge>当前页面</Badge>
            <h2 className="mt-4 text-3xl font-semibold">{activePage.title}</h2>
            <p className="mt-3 max-w-3xl text-base text-slate-600">{activePage.hero}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activePage.sections.map((section) => (
                <Badge key={section.title} className="bg-slate-100 text-slate-700">{section.title}</Badge>
              ))}
            </div>
          </Card>

          <Card className="border-white/60 bg-white/80 backdrop-blur">
            <SectionTitle>当前实现边界</SectionTitle>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>已按目标保存独立计划草案，并支持切换当前目标时同步切换计划内容</div>
              <div>用户画像、目标、计划草案、设置已接通 SQLite 持久化链路</div>
              <div>真实 AI 请求、计划自动重算与更细粒度计划编辑仍待接入</div>
            </div>
          </Card>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          {activePage.sections.map((section) => (
            <Card key={section.title} className="border-white/60 bg-white/80 backdrop-blur">
              <SectionTitle>{section.title}</SectionTitle>
              <div className="mt-2 text-sm text-slate-600">用于定义页面首屏骨架与后续交互边界。</div>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {section.bullets.map((item) => (
                  <li key={item} className="rounded-lg bg-slate-50 px-3 py-2">{item}</li>
                ))}
              </ul>
            </Card>
          ))}
        </section>

        <PageContent page={activePage} onPageChange={onPageChange} />
      </main>
    </div>
  );
}
