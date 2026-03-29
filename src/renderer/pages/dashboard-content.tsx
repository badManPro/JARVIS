import type { PageDefinition } from '@/pages/page-data';
import { PathPage } from '@/pages/dashboard/path-page';
import { ProfilePage } from '@/pages/dashboard/profile-page';
import { SettingsPage } from '@/pages/dashboard/settings-page';
import { TodayPage } from '@/pages/dashboard/today-page';

export { CoachDrawer } from '@/pages/dashboard/coach-drawer';

export function PageContent({
  page,
  onPageChange,
  onOpenCoach,
}: {
  page: PageDefinition;
  onPageChange: (pageId: string) => void;
  onOpenCoach: () => void;
}) {
  switch (page.id) {
    case 'today':
      return <TodayPage onOpenCoach={onOpenCoach} onPageChange={onPageChange} />;
    case 'path':
      return <PathPage onOpenCoach={onOpenCoach} />;
    case 'profile':
      return <ProfilePage />;
    case 'settings':
      return <SettingsPage onPageChange={onPageChange} />;
    default:
      return null;
  }
}
