import type { AppState, UserProfile } from './app-state.js';

export type OnboardingPresetOption = {
  label: string;
  value: string;
};

export type InitialPlanSource = 'ai' | 'template_fallback';

export type PlanningConfirmation = Pick<
  UserProfile,
  'planningStyle' | 'decisionSupportLevel' | 'feedbackTone' | 'autonomyPreference'
>;

export type CompleteInitialOnboardingPayload = {
  goalTitle: string;
  baseline: string;
  timeBudget: string;
  bestStudyWindow: string;
  pacePreference: string;
  ageBracket: string;
  gender: string;
  personalityTraits: string[];
  mbti: string;
  motivationStyle: string;
  stressResponse: string;
  feedbackPreference: string;
  cycle: string;
};

export type InitialOnboardingSummary = {
  personaHighlights: string[];
  planningHighlights: string[];
  goalTitle: string;
  planTitle: string;
  planSummary: string;
  firstTaskTitle: string;
  firstTaskDuration: string;
  firstTaskNote: string;
};

export type CompleteInitialOnboardingResult = {
  state: AppState;
  planSource: InitialPlanSource;
  providerLabel?: string;
  fallbackReason?: string;
  summary: InitialOnboardingSummary;
};

export const onboardingFieldOptions = {
  timeBudget: [
    { label: '工作日 30 分钟', value: '工作日 30 分钟' },
    { label: '工作日 45 分钟', value: '工作日 45 分钟' },
    { label: '工作日 1 小时', value: '工作日 1 小时' },
    { label: '周末 2 小时', value: '周末 2 小时' },
    { label: '工作日 45 分钟，周末 2 小时', value: '工作日 45 分钟，周末 2 小时' },
  ],
  bestStudyWindow: [
    { label: '工作日早晨', value: '工作日早晨 07:30 - 08:00' },
    { label: '午休时段', value: '工作日午休 12:30 - 13:00' },
    { label: '工作日晚间', value: '工作日晚间 20:30 - 21:15' },
    { label: '周六上午', value: '周六上午 09:00 - 11:00' },
    { label: '周日下午', value: '周日下午 15:00 - 17:00' },
  ],
  pacePreference: [
    { label: '小步快跑', value: '先用 30-45 分钟的小步快跑' },
    { label: '稳定推进', value: '保持稳定频次，每周持续推进' },
    { label: '先易后难', value: '先做低阻力动作建立节奏，再逐步加难' },
    { label: '周末集中', value: '平日轻量维持，重点任务放到周末整块时间' },
  ],
  ageBracket: [
    { label: '18-24 岁', value: '18-24 岁' },
    { label: '25-34 岁', value: '25-34 岁' },
    { label: '35-44 岁', value: '35-44 岁' },
    { label: '45 岁以上', value: '45 岁以上' },
  ],
  gender: [
    { label: '女性', value: '女性' },
    { label: '男性', value: '男性' },
    { label: '不填写', value: '' },
  ],
  mbti: [
    { label: 'INTJ', value: 'INTJ' },
    { label: 'INFJ', value: 'INFJ' },
    { label: 'INFP', value: 'INFP' },
    { label: 'ISTJ', value: 'ISTJ' },
    { label: 'ENTJ', value: 'ENTJ' },
    { label: 'ENFP', value: 'ENFP' },
    { label: 'ISFJ', value: 'ISFJ' },
    { label: 'ESFJ', value: 'ESFJ' },
  ],
  motivationStyle: [
    { label: '明确里程碑', value: '看到清晰里程碑更有动力' },
    { label: '真实成果驱动', value: '更适合围绕真实可交付结果推进' },
    { label: '被提醒启动', value: '需要明确提醒和开始动作来启动' },
    { label: '连续反馈', value: '完成后能立即看到反馈会更有动力' },
  ],
  stressResponse: [
    { label: '降难度恢复', value: '压力大时先恢复低阻力任务节奏' },
    { label: '先做最小步', value: '状态波动时先做 15-20 分钟最小动作' },
    { label: '保持明确下一步', value: '更需要明确下一步，不想额外做判断' },
    { label: '减少并行事项', value: '压力波动时先减少并行事项，保留主线任务' },
  ],
  feedbackPreference: [
    { label: '直接简短', value: '提醒直接、简短，并明确下一步动作' },
    { label: '鼓励式反馈', value: '先给肯定，再指出下一步怎么推进' },
    { label: '结构化复盘', value: '希望按问题、原因、行动三段式给反馈' },
    { label: '结果导向', value: '更关注是否靠近成果，而不是过程描述' },
  ],
  planningStyle: [
    { label: '框架优先', value: '先框架后执行，先确认主线再拆到当天动作' },
    { label: '低阻力启动', value: '先低阻力启动，再逐步加深到完整训练或练习' },
    { label: '主线拆解', value: '先确认本周主线，再拆成今天可直接开始的动作' },
  ],
  decisionSupportLevel: [
    { label: '系统直接给', value: '系统可以直接给出下一步，只在大调整时再确认' },
    { label: '结构化建议', value: '系统先给结构化建议，关键切换由你确认' },
  ],
  feedbackTone: [
    { label: '直接结果导向', value: '直接、短句、结果导向' },
    { label: '先肯定后推进', value: '先肯定进展，再明确下一步' },
    { label: '清晰克制', value: '清晰、克制、明确下一步' },
  ],
  autonomyPreference: [
    { label: '小调自动', value: '小调整自动执行，大调整先确认' },
    { label: '先提建议', value: '默认先给建议，再由你确认是否改动计划' },
  ],
  personalityTraits: [
    { label: '偏好明确反馈', value: '偏好明确反馈' },
    { label: '容易过度准备', value: '容易过度准备' },
    { label: '更看重成果感', value: '更看重成果感' },
    { label: '需要低摩擦开始', value: '需要低摩擦开始' },
    { label: '喜欢先理解框架', value: '喜欢先理解整体框架' },
    { label: '执行力强但易分心', value: '执行力强但易分心' },
  ],
} satisfies Record<string, OnboardingPresetOption[]>;

export const changeQuickActionOptions: OnboardingPresetOption[] = [
  { label: '时间变少了', value: '最近可投入时间变少了，需要把任务压缩到更短时段。' },
  { label: '学习窗口变了', value: '我的学习窗口变了，后续任务需要重新安排时段。' },
  { label: '目标变了', value: '当前主目标需要调整，之前的成功标准已经不完全适用。' },
  { label: '希望反馈更直接', value: '我希望后续提醒和反馈更直接，少一点铺垫。' },
];

function includesAny(source: string, patterns: string[]) {
  return patterns.some((pattern) => source.includes(pattern));
}

export function derivePlanningConfirmation(profile: Pick<
  UserProfile,
  'pacePreference' | 'personalityTraits' | 'mbti' | 'motivationStyle' | 'stressResponse' | 'feedbackPreference'
>): PlanningConfirmation {
  const traits = profile.personalityTraits.join('；');
  const combined = [
    profile.pacePreference,
    traits,
    profile.mbti,
    profile.motivationStyle,
    profile.stressResponse,
    profile.feedbackPreference,
  ].join('｜');

  const prefersFramework = includesAny(combined, ['INTJ', 'INFJ', 'ISTJ', '整体框架', '明确里程碑', '框架']);
  const needsLowFriction = includesAny(combined, ['小步快跑', '低阻力', '先易后难', '最小步', '明确下一步']);
  const prefersDirectFeedback = includesAny(combined, ['直接', '简短', '结果导向']);
  const wantsAutopilot = includesAny(combined, ['明确下一步', '减少并行', '低阻力', '连续反馈', '直接']);

  return {
    planningStyle: prefersFramework
      ? '先框架后执行，先确认主线再拆到当天动作'
      : (needsLowFriction ? '先低阻力启动，再逐步加深到完整训练或练习' : '先确认本周主线，再拆成今天可直接开始的动作'),
    decisionSupportLevel: wantsAutopilot
      ? '系统可以直接给出下一步，只在大调整时再确认'
      : '系统先给结构化建议，关键切换由你确认',
    feedbackTone: prefersDirectFeedback
      ? '直接、短句、结果导向'
      : (includesAny(combined, ['鼓励']) ? '先肯定进展，再明确下一步' : '清晰、克制、明确下一步'),
    autonomyPreference: wantsAutopilot
      ? '小调整自动执行，大调整先确认'
      : '默认先给建议，再由你确认是否改动计划',
  };
}

export function buildPlanningConfirmationHighlights(confirmation: PlanningConfirmation) {
  return [
    confirmation.planningStyle ? `拆解方式：${confirmation.planningStyle}` : null,
    confirmation.decisionSupportLevel ? `决策支持：${confirmation.decisionSupportLevel}` : null,
    confirmation.feedbackTone ? `反馈语气：${confirmation.feedbackTone}` : null,
    confirmation.autonomyPreference ? `自动调整：${confirmation.autonomyPreference}` : null,
  ].filter(Boolean) as string[];
}
