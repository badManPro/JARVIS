import type { AppState, ModelCapability, ProviderConfig } from '../../shared/app-state.js';
import { seedState } from '../../shared/app-state.js';
import { ensurePlanDrafts } from '../../shared/plan-draft.js';

type RouteKey = keyof AppState['settings']['routing'];

export type AppStateConsistencyIssue = {
  code: 'plan_repaired' | 'plan_snapshot_repaired' | 'settings_route_repaired' | 'settings_route_unresolved';
  message: string;
};

export type AppStateConsistencyResult = {
  state: AppState;
  issues: AppStateConsistencyIssue[];
  repaired: boolean;
};

const capabilityByRouteKey = {
  profileExtraction: 'profile_extraction',
  planGeneration: 'plan_generation',
  planAdjustment: 'plan_adjustment',
  reflectionSummary: 'reflection_summary',
  generalChat: 'chat_general',
} satisfies Record<RouteKey, ModelCapability>;

function pickFallbackProviderId(
  providers: ProviderConfig[],
  routeKey: RouteKey,
  capability: ModelCapability,
) {
  const seedProviderId = seedState.settings.routing[routeKey];
  const seedProvider = providers.find((provider) => provider.id === seedProviderId);
  if (seedProvider) {
    return seedProviderId;
  }

  return providers.find((provider) => provider.capabilityTags.includes(capability))?.id
    ?? providers[0]?.id
    ?? null;
}

export function normalizeAppStateConsistency(state: AppState): AppStateConsistencyResult {
  const issues: AppStateConsistencyIssue[] = [];
  let repaired = false;

  const ensuredPlan = ensurePlanDrafts(state.goals, state.plan, state.profile);
  if (JSON.stringify(ensuredPlan) !== JSON.stringify(state.plan)) {
    repaired = true;
    issues.push({
      code: 'plan_repaired',
      message: '已重建 activeGoalId / draft / snapshot 的基础目标归属关系。',
    });
  }

  const draftsByGoalId = new Map(ensuredPlan.drafts.map((draft) => [draft.goalId, draft]));
  const snapshots = ensuredPlan.snapshots.flatMap((snapshot) => {
    const draft = draftsByGoalId.get(snapshot.goalId);
    if (!draft) {
      repaired = true;
      issues.push({
        code: 'plan_snapshot_repaired',
        message: `已移除缺少目标草案归属的计划快照 ${snapshot.id}。`,
      });
      return [];
    }

    if (snapshot.draftId === draft.id) {
      return [snapshot];
    }

    repaired = true;
    issues.push({
      code: 'plan_snapshot_repaired',
      message: `已把计划快照 ${snapshot.id} 的 draftId 从 ${snapshot.draftId} 修正为 ${draft.id}。`,
    });
    return [{
      ...snapshot,
      draftId: draft.id,
    }];
  });

  const routing = {
    ...state.settings.routing,
  };

  (Object.keys(routing) as RouteKey[]).forEach((routeKey) => {
    const capability = capabilityByRouteKey[routeKey];
    const currentProviderId = routing[routeKey];
    const currentProvider = state.settings.providers.find((provider) => provider.id === currentProviderId);

    if (currentProvider) {
      return;
    }

    const fallbackProviderId = pickFallbackProviderId(state.settings.providers, routeKey, capability);
    if (!fallbackProviderId) {
      issues.push({
        code: 'settings_route_unresolved',
        message: `用途路由 ${routeKey} 当前指向 ${currentProviderId}，且没有可用 Provider 可回退。`,
      });
      return;
    }

    if (fallbackProviderId === currentProviderId) {
      return;
    }

    repaired = true;
    routing[routeKey] = fallbackProviderId;
    issues.push({
      code: 'settings_route_repaired',
      message: `用途路由 ${routeKey} 已从 ${currentProviderId} 修正到 ${fallbackProviderId}。`,
    });
  });

  return {
    state: {
      ...state,
      plan: {
        ...ensuredPlan,
        snapshots,
      },
      settings: {
        ...state.settings,
        routing,
      },
    },
    issues,
    repaired,
  };
}
