import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/layouts/app-shell';
import { defaultStartPageId } from '@/pages/page-data';
import { useAppStore } from '@/store/app-store';

const startPageMap: Record<string, string> = {
  首页: 'today',
  今日: 'today',
  学习计划: 'path',
  学习路径: 'path',
  目标: 'path',
  对话: 'today',
  用户画像: 'profile',
  学习档案: 'profile',
  日历: 'calendar',
  复盘: 'today',
  设置: 'settings',
};

const legacyPageMap: Record<string, string> = {
  home: 'today',
  plans: 'path',
  goals: 'path',
  conversation: 'today',
  reflection: 'today',
  profile: 'profile',
  calendar: 'calendar',
  settings: 'settings',
};

export default function App() {
  const startPage = useAppStore((state) => state.settings.startPage);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrateFromStorage = useAppStore((state) => state.hydrateFromStorage);
  const [page, setPage] = useState(defaultStartPageId);

  const resolvedStartPage = useMemo(
    () => startPageMap[startPage] ?? legacyPageMap[startPage] ?? defaultStartPageId,
    [startPage],
  );

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (hydrated) {
      setPage(resolvedStartPage);
    }
  }, [hydrated, resolvedStartPage]);

  return <AppShell currentPage={legacyPageMap[page] ?? page} onPageChange={setPage} />;
}
