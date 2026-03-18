import { BookOpen, Bot, Flag, Home, RefreshCcw, Settings, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PageDefinition = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  hero: string;
  sections: Array<{
    title: string;
    bullets: string[];
  }>;
};

export const pages: PageDefinition[] = [
  {
    id: 'home',
    title: '首页',
    description: '聚合今日状态、进度、提醒与快捷动作。',
    icon: Home,
    hero: '把今天最重要的学习动作压缩成一屏可执行看板。',
    sections: [
      { title: '今日聚焦', bullets: ['最重要任务', '阶段定位', '预计投入时长'] },
      { title: '进度与提醒', bullets: ['本周完成率', '延迟任务', '里程碑提醒'] },
      { title: '快捷动作', bullets: ['开始学习', '发起对话', '快速新建目标'] },
    ],
  },
  {
    id: 'plans',
    title: '学习计划',
    description: '查看阶段、周、日计划及重排入口。',
    icon: BookOpen,
    hero: '把目标和画像翻译成可执行的阶段路径与日常任务。',
    sections: [
      { title: '计划层级', bullets: ['阶段视图', '周视图', '日视图'] },
      { title: '计划依据', bullets: ['画像驱动原因', '强度说明', '风险提示'] },
      { title: '调整动作', bullets: ['重排任务', '切换强度', '插入临时任务'] },
    ],
  },
  {
    id: 'goals',
    title: '目标',
    description: '管理目标、优先级与完成标准。',
    icon: Flag,
    hero: '把“想学什么”定义成有边界、可衡量、能规划的目标。',
    sections: [
      { title: '目标列表', bullets: ['进行中 / 暂停 / 已完成', '优先级', '周期'] },
      { title: '目标详情', bullets: ['基础说明', '结果定义', '成功标准'] },
      { title: '联动提示', bullets: ['是否已生成计划', '最近更新时间', '覆盖度'] },
    ],
  },
  {
    id: 'conversation',
    title: '对话',
    description: '承接建档、调整计划和动态反馈。',
    icon: Bot,
    hero: '让自然语言成为画像更新与计划调整的主入口。',
    sections: [
      { title: '会话上下文', bullets: ['当前目标', '引用计划', '关联画像标签'] },
      { title: '消息流', bullets: ['用户提问', '系统建议', '结构化变更预览'] },
      { title: '建议动作', bullets: ['采纳建议', '仅更新画像', '稍后处理'] },
    ],
  },
  {
    id: 'profile',
    title: '用户画像',
    description: '查看系统理解、偏好与阻力因素。',
    icon: UserRound,
    hero: '画像不是静态档案，而是影响规划强度和节奏的决策输入。',
    sections: [
      { title: '画像总览', bullets: ['身份阶段', '时间预算', '学习节奏偏好'] },
      { title: '行为特征', bullets: ['最佳学习时段', '容易中断原因', '偏好方式'] },
      { title: '影响解释', bullets: ['画像如何作用于计划', '最近更新记录', '手动修正入口'] },
    ],
  },
  {
    id: 'reflection',
    title: '复盘',
    description: '沉淀完成情况、偏差原因与调整建议。',
    icon: RefreshCcw,
    hero: '让执行反馈回流到画像与计划，而不是停留在自责。',
    sections: [
      { title: '复盘周期', bullets: ['日复盘', '周复盘', '阶段复盘'] },
      { title: '数据回看', bullets: ['完成任务数', '实际投入时长', '偏差'] },
      { title: '后续动作', bullets: ['同步画像', '重排计划', '生成下一周期建议'] },
    ],
  },
  {
    id: 'settings',
    title: '设置',
    description: '管理模型配置、主题偏好与本地数据。',
    icon: Settings,
    hero: '保持桌面应用的可控性：模型、主题、数据都在用户手里。',
    sections: [
      { title: 'AI 配置', bullets: ['提供方', 'API Key / Endpoint', '默认策略'] },
      { title: '应用偏好', bullets: ['主题', '启动页', '通知'] },
      { title: '数据管理', bullets: ['导入导出', '缓存清理', '版本信息'] },
    ],
  },
];
