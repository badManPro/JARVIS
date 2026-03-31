import type { GoalStatus, LearningGoal, LearningGoalDomain, LearningGoalRole } from './app-state.js';

export const DEFAULT_MAIN_GOAL_WEIGHT = 70;
export const DEFAULT_SECONDARY_GOAL_WEIGHT = 30;
export const MIN_MAIN_GOAL_SHARE = 60;
const MIN_GOAL_WEIGHT = 10;
const MAX_GOAL_WEIGHT = 100;

export type LearningGoalInput = {
  id?: string;
  title: string;
  motivation: string;
  baseline: string;
  cycle: string;
  successMetric: string;
  priority: LearningGoal['priority'];
  status: GoalStatus;
  domain?: LearningGoalDomain;
  role?: LearningGoalRole;
  scheduleWeight?: number;
};

const programmingDomainKeywords = [
  'python',
  'javascript',
  'typescript',
  'react',
  'vue',
  'node',
  'next.js',
  'nextjs',
  'api',
  'sql',
  '数据库',
  '前端',
  '后端',
  'cli',
  '脚本',
  '代码',
  '编程',
  '开发',
  '调试',
  '算法',
  'git',
  'llm',
  'ai',
];

const instrumentDomainKeywords = [
  '吉他',
  'guitar',
  '钢琴',
  'piano',
  '键盘',
  '电子琴',
  '小提琴',
  'violin',
  '尤克里里',
  'ukulele',
  '贝斯',
  'bass',
  '架子鼓',
  '鼓',
  'drum',
  'drums',
  '乐器',
  '弹唱',
  '指弹',
  '和弦',
  '音阶',
  '练琴',
  '练鼓',
  '调音',
  '节拍器',
];

const fitnessDomainKeywords = [
  '健身',
  '力量训练',
  '增肌',
  '减脂',
  '燃脂',
  '体能',
  '跑步',
  '慢跑',
  '马拉松',
  '配速',
  '有氧',
  '心肺',
  'hiit',
  'tabata',
  '深蹲',
  '卧推',
  '硬拉',
  '杠铃',
  '哑铃',
  '引体向上',
  '俯卧撑',
  '平板支撑',
  '波比',
  '自重',
  '徒手',
  '居家健身',
  '核心',
  '瑜伽',
  '拉伸',
  '柔韧',
  'mobility',
  'cardio',
  'run',
  'running',
];

export const learningGoalDomainOptions: Array<{ value: LearningGoalDomain; label: string }> = [
  { value: 'general', label: '通用' },
  { value: 'programming', label: '编程' },
  { value: 'instrument', label: '乐器' },
  { value: 'fitness', label: '健身' },
];

export function normalizeLearningGoalRole(role?: string): LearningGoalRole {
  return role === 'secondary' ? 'secondary' : 'main';
}

export function normalizeLearningGoalDomain(domain?: string): LearningGoalDomain {
  switch (domain) {
    case 'programming':
    case 'instrument':
    case 'fitness':
      return domain;
    case 'general':
    default:
      return 'general';
  }
}

export function inferLearningGoalDomain(goal: Partial<Pick<LearningGoalInput, 'title' | 'motivation' | 'baseline' | 'successMetric'>>) {
  const combined = [
    goal.title,
    goal.motivation,
    goal.baseline,
    goal.successMetric,
  ].join(' ').toLowerCase();

  if (programmingDomainKeywords.some((keyword) => combined.includes(keyword))) {
    return 'programming' as const;
  }

  if (instrumentDomainKeywords.some((keyword) => combined.includes(keyword))) {
    return 'instrument' as const;
  }

  if (fitnessDomainKeywords.some((keyword) => combined.includes(keyword))) {
    return 'fitness' as const;
  }

  return 'general' as const;
}

export function normalizeGoalScheduleWeight(weight: number | undefined, role: LearningGoalRole) {
  if (!Number.isFinite(weight) || (weight ?? 0) <= 0) {
    return role === 'main' ? DEFAULT_MAIN_GOAL_WEIGHT : DEFAULT_SECONDARY_GOAL_WEIGHT;
  }

  return Math.max(MIN_GOAL_WEIGHT, Math.min(MAX_GOAL_WEIGHT, Math.round(weight ?? 0)));
}

export function getMainGoalId<T extends { id: string; role?: LearningGoalRole }>(
  goals: T[],
  preferredMainGoalId?: string,
) {
  if (preferredMainGoalId && goals.some((goal) => goal.id === preferredMainGoalId)) {
    return preferredMainGoalId;
  }

  return goals.find((goal) => goal.role === 'main')?.id ?? goals[0]?.id ?? '';
}

export function resolveGoalScheduling<T extends {
  id: string;
  title?: string;
  motivation?: string;
  baseline?: string;
  successMetric?: string;
  domain?: LearningGoalDomain;
  role?: LearningGoalRole;
  scheduleWeight?: number;
}>(
  goals: T[],
  preferredMainGoalId?: string,
): {
  goals: Array<T & { domain: LearningGoalDomain; role: LearningGoalRole; scheduleWeight: number }>;
  activeGoalId: string;
} {
  const activeGoalId = getMainGoalId(goals, preferredMainGoalId);

  return {
    activeGoalId,
    goals: goals.map((goal) => {
      const role: LearningGoalRole = goal.id === activeGoalId ? 'main' : 'secondary';
      return {
        ...goal,
        domain: goal.domain === undefined ? inferLearningGoalDomain(goal) : normalizeLearningGoalDomain(goal.domain),
        role,
        scheduleWeight: normalizeGoalScheduleWeight(goal.scheduleWeight, role),
      };
    }),
  };
}

export function buildGoalScheduleAllocations<T extends {
  id: string;
  title: string;
  motivation?: string;
  baseline?: string;
  successMetric?: string;
  domain?: LearningGoalDomain;
  role?: LearningGoalRole;
  scheduleWeight?: number;
}>(
  goals: T[],
  preferredMainGoalId?: string,
): {
  activeGoalId: string;
  allocations: Array<T & {
    role: LearningGoalRole;
    scheduleWeight: number;
    scheduledShare: number;
    lane: 'anchor' | 'support';
  }>;
} {
  const resolved = resolveGoalScheduling(goals, preferredMainGoalId);
  const scheduledGoals = resolved.goals;
  const mainGoal = scheduledGoals.find((goal) => goal.role === 'main');
  const secondaryGoals = scheduledGoals.filter((goal) => goal.role === 'secondary');

  if (!mainGoal) {
    return {
      activeGoalId: resolved.activeGoalId,
      allocations: [],
    };
  }

  if (!secondaryGoals.length) {
    return {
      activeGoalId: resolved.activeGoalId,
      allocations: [
        {
          ...mainGoal,
          lane: 'anchor',
          scheduledShare: 100,
        },
      ],
    };
  }

  const totalWeight = scheduledGoals.reduce((sum, goal) => sum + goal.scheduleWeight, 0) || 1;
  const rawMainShare = Math.round((mainGoal.scheduleWeight / totalWeight) * 100);
  const mainShare = Math.min(
    Math.max(rawMainShare, MIN_MAIN_GOAL_SHARE),
    100 - secondaryGoals.length,
  );
  const remainingShare = Math.max(0, 100 - mainShare);
  const secondaryWeightTotal = secondaryGoals.reduce((sum, goal) => sum + goal.scheduleWeight, 0) || secondaryGoals.length;
  const draftedSecondary = secondaryGoals.map((goal) => {
    const exactShare = secondaryWeightTotal
      ? (goal.scheduleWeight / secondaryWeightTotal) * remainingShare
      : remainingShare / secondaryGoals.length;
    return {
      goal,
      exactShare,
      scheduledShare: Math.floor(exactShare),
    };
  });
  let remainingPoints = remainingShare - draftedSecondary.reduce((sum, item) => sum + item.scheduledShare, 0);
  const secondaryWithRemainder = draftedSecondary
    .slice()
    .sort((left, right) => {
      const remainderDiff = (right.exactShare - right.scheduledShare) - (left.exactShare - left.scheduledShare);
      if (remainderDiff !== 0) {
        return remainderDiff;
      }
      return right.goal.scheduleWeight - left.goal.scheduleWeight;
    })
    .map((item) => {
      if (remainingPoints <= 0) {
        return item;
      }
      remainingPoints -= 1;
      return {
        ...item,
        scheduledShare: item.scheduledShare + 1,
      };
    });
  const secondaryShareById = new Map(
    secondaryWithRemainder.map((item) => [item.goal.id, item.scheduledShare]),
  );

  return {
    activeGoalId: resolved.activeGoalId,
    allocations: scheduledGoals
      .map((goal) => (
        goal.role === 'main'
          ? {
            ...goal,
            lane: 'anchor' as const,
            scheduledShare: mainShare,
          }
          : {
            ...goal,
            lane: 'support' as const,
            scheduledShare: secondaryShareById.get(goal.id) ?? 0,
          }
      ))
      .sort((left, right) => {
        if (left.role !== right.role) {
          return left.role === 'main' ? -1 : 1;
        }
        return right.scheduledShare - left.scheduledShare;
      }),
  };
}

export function goalRoleLabel(role: LearningGoalRole) {
  return role === 'main' ? '主目标' : '副目标';
}

export function goalDomainLabel(domain: LearningGoalDomain) {
  switch (domain) {
    case 'programming':
      return '编程';
    case 'instrument':
      return '乐器';
    case 'fitness':
      return '健身';
    case 'general':
    default:
      return '通用';
  }
}
