import { BookOpenCheck, CalendarRange, Layers3, Settings, Sparkles, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PageDefinition = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const pages: PageDefinition[] = [
  {
    id: 'today',
    title: '今日',
    description: '生成并执行今天的详细计划。',
    icon: Sparkles,
  },
  {
    id: 'path',
    title: '学习路径',
    description: '查看粗版路径、周里程碑和关键节点。',
    icon: Layers3,
  },
  {
    id: 'profile',
    title: '学习档案',
    description: '学习背景与人物画像。',
    icon: UserRound,
  },
  {
    id: 'calendar',
    title: '日历',
    description: '查看系统如何安排这一周的学习时间块。',
    icon: CalendarRange,
  },
  {
    id: 'settings',
    title: '设置',
    description: '基础偏好与 Codex 连接。',
    icon: Settings,
  },
];

export const primaryActionPageId = 'today';
export const defaultStartPageId = 'today';
export const pathPageId = 'path';
export const profilePageId = 'profile';
export const calendarPageId = 'calendar';
export const settingsPageId = 'settings';
export const onboardingPageIcon = BookOpenCheck;
