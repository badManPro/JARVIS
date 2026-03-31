import type { UserProfile } from './app-state.js';

export type CompanionMode = 'reminder' | 'celebration' | 'status';

export type CompanionMotion = 'lean-in' | 'bounce' | 'hover';

export type CompanionExpression = 'alert' | 'cheerful' | 'steady';

export type CompanionCueSource = 'today' | 'calendar';

export type CompanionActionIntent =
  | 'continue-onboarding'
  | 'resume-flow'
  | 'resolve-risk'
  | 'review-schedule';

export type CompanionAction = {
  kind: 'navigate';
  label: string;
  pageId: string;
  intent: CompanionActionIntent;
};

export type CompanionPresence = {
  motion: CompanionMotion;
  motionLabel: string;
  expression: CompanionExpression;
  expressionLabel: string;
};

export type CompanionPersonaTone = 'direct' | 'encouraging' | 'steady';

export type CompanionPersona = {
  id: 'direct-guide' | 'encouraging-partner' | 'steady-operator';
  label: string;
  tone: CompanionPersonaTone;
  toneLabel: string;
  summary: string;
  boundary: string;
};

export type CompanionPersonaProfile = Pick<
  UserProfile,
  'planningStyle' | 'decisionSupportLevel' | 'feedbackTone' | 'autonomyPreference'
>;

export type CompanionCuePersonaHint = CompanionPersonaTone;

export type CompanionCue = {
  id: string;
  source: CompanionCueSource;
  sourceLabel: string;
  sourceDetail?: string;
  mode: CompanionMode;
  label: string;
  title: string;
  detail: string;
  note: string;
  chips: string[];
  action: CompanionAction;
  personaHint?: CompanionCuePersonaHint;
};

export type CompanionCueInput = Omit<CompanionCue, 'id'>;

export const companionPresenceByMode: Record<CompanionMode, CompanionPresence> = {
  reminder: {
    motion: 'lean-in',
    motionLabel: '前倾提醒',
    expression: 'alert',
    expressionLabel: '警觉聚焦',
  },
  celebration: {
    motion: 'bounce',
    motionLabel: '轻跳庆祝',
    expression: 'cheerful',
    expressionLabel: '开心微笑',
  },
  status: {
    motion: 'hover',
    motionLabel: '悬停同步',
    expression: 'steady',
    expressionLabel: '平静确认',
  },
};

const companionPersonaByTone: Record<CompanionPersonaTone, CompanionPersona> = {
  direct: {
    id: 'direct-guide',
    label: '直接推进型',
    tone: 'direct',
    toneLabel: '直接推进',
    summary: '更偏向短句、明确下一步和结果导向的提醒。',
    boundary: '只把当前最该做的动作说清楚，不扩展成新的操作入口。',
  },
  encouraging: {
    id: 'encouraging-partner',
    label: '鼓励陪跑型',
    tone: 'encouraging',
    toneLabel: '先肯定后推进',
    summary: '先确认进展，再把注意力带回下一步。',
    boundary: '只增强推进感和陪伴感，不抢页面主流程的判断权。',
  },
  steady: {
    id: 'steady-operator',
    label: '稳定同步型',
    tone: 'steady',
    toneLabel: '清晰克制',
    summary: '更偏向解释系统判断和当前节奏，而不是制造情绪波动。',
    boundary: '只同步状态和排程原因，不把自己做成新的管理面板。',
  },
};

function includesAny(source: string, patterns: string[]) {
  return patterns.some((pattern) => source.includes(pattern));
}

function resolvePersonaTone(profile: CompanionPersonaProfile): CompanionPersonaTone {
  const combined = [
    profile.planningStyle,
    profile.decisionSupportLevel,
    profile.feedbackTone,
    profile.autonomyPreference,
  ].join('｜');

  if (includesAny(combined, ['鼓励', '肯定'])) {
    return 'encouraging';
  }

  if (includesAny(combined, ['直接', '短句', '系统可以直接给出下一步', '自动执行'])) {
    return 'direct';
  }

  return 'steady';
}

export function resolveCompanionPersona(
  profile: CompanionPersonaProfile,
  hint?: CompanionCuePersonaHint,
): CompanionPersona {
  return companionPersonaByTone[hint ?? resolvePersonaTone(profile)];
}

export function createCompanionNavigateAction(
  label: string,
  pageId: string,
  intent: CompanionActionIntent,
): CompanionAction {
  return {
    kind: 'navigate',
    label,
    pageId,
    intent,
  };
}
