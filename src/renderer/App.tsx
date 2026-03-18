import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/layouts/app-shell';
import { useAppStore } from '@/store/app-store';

const startPageMap: Record<string, string> = {
  首页: 'home',
  学习计划: 'plans',
  目标: 'goals',
  对话: 'conversation',
  用户画像: 'profile',
  复盘: 'reflection',
  设置: 'settings',
};

export default function App() {
  const startPage = useAppStore((state) => state.settings.startPage);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrateFromStorage = useAppStore((state) => state.hydrateFromStorage);
  const [page, setPage] = useState('home');

  const resolvedStartPage = useMemo(() => startPageMap[startPage] ?? 'home', [startPage]);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (hydrated) {
      setPage(resolvedStartPage);
    }
  }, [hydrated, resolvedStartPage]);

  return <AppShell currentPage={page} onPageChange={setPage} />;
}
