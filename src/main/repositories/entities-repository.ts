import { asc, eq } from 'drizzle-orm';
import type { LearningGoal, LearningPlanDraft, LearningPlanStage, LearningPlanState, PlanTask, UserProfile } from '../../shared/app-state.js';
import type { LearningGoalInput } from '../../shared/goal.js';
import { learningGoals, learningPlanDrafts, learningPlans, planStages, planTasks, userProfiles } from '../db/schema.js';
import type { LearningCompanionDatabase } from '../db/client.js';

const PROFILE_ID = 'default';
const PLAN_STATE_ID = 'default';

function parseJsonArray<T>(value: string): T[] {
  return JSON.parse(value) as T[];
}

export class EntitiesRepository {
  constructor(private readonly db: LearningCompanionDatabase) {}

  loadUserProfile(): UserProfile | null {
    const row = this.db.select().from(userProfiles).where(eq(userProfiles.id, PROFILE_ID)).get();
    if (!row) return null;

    return {
      name: row.name,
      identity: row.identity,
      timeBudget: row.timeBudget,
      pacePreference: row.pacePreference,
      strengths: parseJsonArray<string>(row.strengthsJson),
      blockers: parseJsonArray<string>(row.blockersJson),
      bestStudyWindow: row.bestStudyWindow,
      planImpact: parseJsonArray<string>(row.planImpactJson),
    };
  }

  saveUserProfile(profile: UserProfile) {
    const now = new Date();
    this.db
      .insert(userProfiles)
      .values({
        id: PROFILE_ID,
        name: profile.name,
        identity: profile.identity,
        timeBudget: profile.timeBudget,
        pacePreference: profile.pacePreference,
        strengthsJson: JSON.stringify(profile.strengths),
        blockersJson: JSON.stringify(profile.blockers),
        bestStudyWindow: profile.bestStudyWindow,
        planImpactJson: JSON.stringify(profile.planImpact),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userProfiles.id,
        set: {
          name: profile.name,
          identity: profile.identity,
          timeBudget: profile.timeBudget,
          pacePreference: profile.pacePreference,
          strengthsJson: JSON.stringify(profile.strengths),
          blockersJson: JSON.stringify(profile.blockers),
          bestStudyWindow: profile.bestStudyWindow,
          planImpactJson: JSON.stringify(profile.planImpact),
          updatedAt: now,
        },
      })
      .run();
  }

  loadLearningGoals(): LearningGoal[] {
    return this.db
      .select()
      .from(learningGoals)
      .orderBy(asc(learningGoals.id))
      .all()
      .map((row) => ({
        id: row.id,
        title: row.title,
        motivation: row.motivation,
        baseline: row.baseline,
        cycle: row.cycle,
        successMetric: row.successMetric,
        priority: row.priority as LearningGoal['priority'],
        status: row.status as LearningGoal['status'],
      }));
  }

  replaceLearningGoals(goals: LearningGoal[]) {
    const now = new Date();
    this.db.delete(learningGoals).run();
    if (!goals.length) return;

    this.db
      .insert(learningGoals)
      .values(
        goals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          motivation: goal.motivation,
          baseline: goal.baseline,
          cycle: goal.cycle,
          successMetric: goal.successMetric,
          priority: goal.priority,
          status: goal.status,
          updatedAt: now,
        })),
      )
      .run();
  }

  upsertLearningGoal(goal: LearningGoalInput & { id: string }) {
    const now = new Date();
    this.db
      .insert(learningGoals)
      .values({
        id: goal.id,
        title: goal.title,
        motivation: goal.motivation,
        baseline: goal.baseline,
        cycle: goal.cycle,
        successMetric: goal.successMetric,
        priority: goal.priority,
        status: goal.status,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: learningGoals.id,
        set: {
          title: goal.title,
          motivation: goal.motivation,
          baseline: goal.baseline,
          cycle: goal.cycle,
          successMetric: goal.successMetric,
          priority: goal.priority,
          status: goal.status,
          updatedAt: now,
        },
      })
      .run();

    return this.loadLearningGoals();
  }

  loadLearningPlanState(): LearningPlanState | null {
    const planRow = this.db.select().from(learningPlans).where(eq(learningPlans.id, PLAN_STATE_ID)).get();
    if (!planRow) return null;

    const drafts = this.db
      .select()
      .from(learningPlanDrafts)
      .orderBy(asc(learningPlanDrafts.goalId))
      .all()
      .map((row) => {
        const stages = this.db
          .select()
          .from(planStages)
          .where(eq(planStages.draftId, row.id))
          .orderBy(asc(planStages.sortOrder))
          .all()
          .map((stageRow) => ({
            title: stageRow.title,
            outcome: stageRow.outcome,
            progress: stageRow.progress,
          })) satisfies LearningPlanStage[];

        const tasks = this.db
          .select()
          .from(planTasks)
          .where(eq(planTasks.draftId, row.id))
          .orderBy(asc(planTasks.sortOrder))
          .all()
          .map((taskRow) => ({
            id: taskRow.id,
            title: taskRow.title,
            duration: taskRow.duration,
            status: taskRow.status as PlanTask['status'],
            note: taskRow.note,
          }));

        return {
          id: row.id,
          goalId: row.goalId,
          title: row.title,
          summary: row.summary,
          basis: parseJsonArray<string>(row.basisJson),
          stages,
          tasks,
          updatedAt: row.updatedAt.toISOString(),
        } satisfies LearningPlanDraft;
      });

    return {
      activeGoalId: planRow.activeGoalId,
      drafts,
    };
  }

  saveLearningPlanState(planState: LearningPlanState) {
    const now = new Date();
    this.db
      .insert(learningPlans)
      .values({
        id: PLAN_STATE_ID,
        activeGoalId: planState.activeGoalId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: learningPlans.id,
        set: {
          activeGoalId: planState.activeGoalId,
          updatedAt: now,
        },
      })
      .run();

    this.db.delete(planStages).run();
    this.db.delete(planTasks).run();
    this.db.delete(learningPlanDrafts).run();

    if (!planState.drafts.length) return;

    this.db
      .insert(learningPlanDrafts)
      .values(
        planState.drafts.map((draft) => ({
          id: draft.id,
          goalId: draft.goalId,
          title: draft.title,
          summary: draft.summary,
          basisJson: JSON.stringify(draft.basis),
          updatedAt: now,
        })),
      )
      .run();

    const allStages = planState.drafts.flatMap((draft) => draft.stages.map((stage, index) => ({
      id: `${draft.id}-stage-${index + 1}`,
      draftId: draft.id,
      title: stage.title,
      outcome: stage.outcome,
      progress: stage.progress,
      sortOrder: index,
      updatedAt: now,
    })));

    if (allStages.length) {
      this.db.insert(planStages).values(allStages).run();
    }

    const allTasks = planState.drafts.flatMap((draft) => draft.tasks.map((task, index) => ({
      id: task.id,
      draftId: draft.id,
      title: task.title,
      duration: task.duration,
      status: task.status,
      note: task.note,
      sortOrder: index,
      updatedAt: now,
    })));

    if (allTasks.length) {
      this.db.insert(planTasks).values(allTasks).run();
    }
  }
}
