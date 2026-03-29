import { asc, eq } from 'drizzle-orm';
import type { LearningGoal, LearningPlanDraft, LearningPlanSnapshot, LearningPlanStage, LearningPlanState, PlanTask, ReflectionEntry, UserProfile } from '../../shared/app-state.js';
import { normalizeUserProfile } from '../../shared/app-state.js';
import type { LearningGoalInput } from '../../shared/goal.js';
import { learningGoals, learningPlanDrafts, learningPlans, learningPlanSnapshots, reflectionEntries, planSnapshotStages, planSnapshotTasks, planStages, planTasks, userProfiles } from '../db/schema.js';
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

    return normalizeUserProfile({
      name: row.name,
      identity: row.identity,
      timeBudget: row.timeBudget,
      pacePreference: row.pacePreference,
      strengths: parseJsonArray<string>(row.strengthsJson),
      blockers: parseJsonArray<string>(row.blockersJson),
      bestStudyWindow: row.bestStudyWindow,
      planImpact: parseJsonArray<string>(row.planImpactJson),
      ageBracket: row.ageBracket,
      gender: row.gender,
      personalityTraits: parseJsonArray<string>(row.personalityTraitsJson),
      mbti: row.mbti,
      motivationStyle: row.motivationStyle,
      stressResponse: row.stressResponse,
      feedbackPreference: row.feedbackPreference,
    });
  }

  saveUserProfile(profile: UserProfile) {
    const now = new Date();
    const normalizedProfile = normalizeUserProfile(profile);
    this.db
      .insert(userProfiles)
      .values({
        id: PROFILE_ID,
        name: normalizedProfile.name,
        identity: normalizedProfile.identity,
        timeBudget: normalizedProfile.timeBudget,
        pacePreference: normalizedProfile.pacePreference,
        strengthsJson: JSON.stringify(normalizedProfile.strengths),
        blockersJson: JSON.stringify(normalizedProfile.blockers),
        bestStudyWindow: normalizedProfile.bestStudyWindow,
        planImpactJson: JSON.stringify(normalizedProfile.planImpact),
        ageBracket: normalizedProfile.ageBracket,
        gender: normalizedProfile.gender,
        personalityTraitsJson: JSON.stringify(normalizedProfile.personalityTraits),
        mbti: normalizedProfile.mbti,
        motivationStyle: normalizedProfile.motivationStyle,
        stressResponse: normalizedProfile.stressResponse,
        feedbackPreference: normalizedProfile.feedbackPreference,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userProfiles.id,
        set: {
          name: normalizedProfile.name,
          identity: normalizedProfile.identity,
          timeBudget: normalizedProfile.timeBudget,
          pacePreference: normalizedProfile.pacePreference,
          strengthsJson: JSON.stringify(normalizedProfile.strengths),
          blockersJson: JSON.stringify(normalizedProfile.blockers),
          bestStudyWindow: normalizedProfile.bestStudyWindow,
          planImpactJson: JSON.stringify(normalizedProfile.planImpact),
          ageBracket: normalizedProfile.ageBracket,
          gender: normalizedProfile.gender,
          personalityTraitsJson: JSON.stringify(normalizedProfile.personalityTraits),
          mbti: normalizedProfile.mbti,
          motivationStyle: normalizedProfile.motivationStyle,
          stressResponse: normalizedProfile.stressResponse,
          feedbackPreference: normalizedProfile.feedbackPreference,
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
            statusNote: taskRow.statusNote,
            statusUpdatedAt: taskRow.statusUpdatedAt?.toISOString(),
          }));

        return {
          id: row.id,
          goalId: row.goalId,
          title: row.title,
          summary: row.summary,
          basis: parseJsonArray<string>(row.basisJson),
          stages,
          milestones: parseJsonArray<LearningPlanDraft['milestones'][number]>(row.milestonesJson),
          tasks,
          todayPlan: JSON.parse(row.todayPlanJson) as LearningPlanDraft['todayPlan'],
          todayContext: JSON.parse(row.todayContextJson) as LearningPlanDraft['todayContext'],
          updatedAt: row.updatedAt.toISOString(),
        } satisfies LearningPlanDraft;
      });

    const snapshots = this.db
      .select()
      .from(learningPlanSnapshots)
      .orderBy(asc(learningPlanSnapshots.goalId), asc(learningPlanSnapshots.version))
      .all()
      .map((row) => {
        const stages = this.db
          .select()
          .from(planSnapshotStages)
          .where(eq(planSnapshotStages.snapshotId, row.id))
          .orderBy(asc(planSnapshotStages.sortOrder))
          .all()
          .map((stageRow) => ({
            title: stageRow.title,
            outcome: stageRow.outcome,
            progress: stageRow.progress,
          })) satisfies LearningPlanStage[];

        const tasks = this.db
          .select()
          .from(planSnapshotTasks)
          .where(eq(planSnapshotTasks.snapshotId, row.id))
          .orderBy(asc(planSnapshotTasks.sortOrder))
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
          draftId: row.draftId,
          goalId: row.goalId,
          version: row.version,
          source: row.source as LearningPlanSnapshot['source'],
          title: row.title,
          summary: row.summary,
          basis: parseJsonArray<string>(row.basisJson),
          stages,
          milestones: parseJsonArray<LearningPlanSnapshot['milestones'][number]>(row.milestonesJson),
          tasks,
          createdAt: row.createdAt.toISOString(),
        } satisfies LearningPlanSnapshot;
      })
      .sort((left, right) => {
        if (left.goalId !== right.goalId) {
          return left.goalId.localeCompare(right.goalId);
        }

        return right.version - left.version;
      });

    return {
      activeGoalId: planRow.activeGoalId,
      drafts,
      snapshots,
    };
  }

  loadReflectionEntries(): ReflectionEntry[] {
    return this.db
      .select()
      .from(reflectionEntries)
      .orderBy(asc(reflectionEntries.period))
      .all()
      .map((row) => ({
        period: row.period as ReflectionEntry['period'],
        label: '',
        completedTasks: 0,
        actualDuration: '0 分钟',
        deviation: '',
        obstacle: row.obstacle,
        difficultyFit: row.difficultyFit as ReflectionEntry['difficultyFit'],
        timeFit: row.timeFit as ReflectionEntry['timeFit'],
        moodScore: row.moodScore,
        confidenceScore: row.confidenceScore,
        accomplishmentScore: row.accomplishmentScore,
        insight: row.insight,
        nextActions: [],
        followUpActions: parseJsonArray<string>(row.followUpActionsJson),
        recentTaskExecutions: [],
        updatedAt: row.updatedAt.toISOString(),
      }));
  }

  saveReflectionEntries(entries: ReflectionEntry[]) {
    const now = new Date();
    this.db.delete(reflectionEntries).run();
    if (!entries.length) return;

    this.db
      .insert(reflectionEntries)
      .values(entries.map((entry) => ({
        period: entry.period,
        obstacle: entry.obstacle,
        difficultyFit: entry.difficultyFit,
        timeFit: entry.timeFit,
        moodScore: entry.moodScore,
        confidenceScore: entry.confidenceScore,
        accomplishmentScore: entry.accomplishmentScore,
        insight: entry.insight,
        followUpActionsJson: JSON.stringify(entry.followUpActions),
        updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : now,
      })))
      .run();
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
    this.db.delete(planSnapshotStages).run();
    this.db.delete(planSnapshotTasks).run();
    this.db.delete(learningPlanSnapshots).run();

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
          milestonesJson: JSON.stringify(draft.milestones),
          todayPlanJson: JSON.stringify(draft.todayPlan),
          todayContextJson: JSON.stringify(draft.todayContext),
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
      statusNote: task.statusNote?.trim() ?? '',
      statusUpdatedAt: task.statusUpdatedAt ? new Date(task.statusUpdatedAt) : null,
      sortOrder: index,
      updatedAt: now,
    })));

    if (allTasks.length) {
      this.db.insert(planTasks).values(allTasks).run();
    }

    if (!planState.snapshots.length) return;

    this.db
      .insert(learningPlanSnapshots)
      .values(
        planState.snapshots.map((snapshot) => ({
          id: snapshot.id,
          draftId: snapshot.draftId,
          goalId: snapshot.goalId,
          version: snapshot.version,
          source: snapshot.source,
          title: snapshot.title,
          summary: snapshot.summary,
          basisJson: JSON.stringify(snapshot.basis),
          milestonesJson: JSON.stringify(snapshot.milestones),
          createdAt: new Date(snapshot.createdAt),
        })),
      )
      .run();

    const allSnapshotStages = planState.snapshots.flatMap((snapshot) => snapshot.stages.map((stage, index) => ({
      id: `${snapshot.id}-stage-${index + 1}`,
      snapshotId: snapshot.id,
      title: stage.title,
      outcome: stage.outcome,
      progress: stage.progress,
      sortOrder: index,
    })));

    if (allSnapshotStages.length) {
      this.db.insert(planSnapshotStages).values(allSnapshotStages).run();
    }

    const allSnapshotTasks = planState.snapshots.flatMap((snapshot) => snapshot.tasks.map((task, index) => ({
      id: `${snapshot.id}-task-${index + 1}`,
      snapshotId: snapshot.id,
      title: task.title,
      duration: task.duration,
      status: task.status,
      note: task.note,
      sortOrder: index,
    })));

    if (allSnapshotTasks.length) {
      this.db.insert(planSnapshotTasks).values(allSnapshotTasks).run();
    }
  }
}
