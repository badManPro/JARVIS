import { BookOpenCheck, Layers3, Settings, Sparkles, UserRound } from 'lucide-react';
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
    description: '只看现在该做什么。',
    icon: Sparkles,
  },
  {
    id: 'path',
    title: '学习路径',
    description: '当前主目标、阶段和最近任务。',
    icon: Layers3,
  },
  {
    id: 'profile',
    title: '学习档案',
    description: '学习背景与人物画像。',
    icon: UserRound,
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
export const settingsPageId = 'settings';
export const onboardingPageIcon = BookOpenCheck;
