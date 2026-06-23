import { prisma } from "@/lib/db";
import { LearningScheduleEngine } from "@/lib/engines";
import { enqueueGenerationJob } from "@/lib/queues";
import type { GenerationJobData } from "@/lib/queues";
import type { PlanningContext } from "@/lib/planning/types";
import type { MonthlyCurriculum, UserProfile } from "@prisma/client";

export async function runDailyGeneration(): Promise<void> {
  console.log(`[DailyGeneration] Starting at ${new Date().toISOString()}`);

  try {
    const scheduleEngine = new LearningScheduleEngine();

    // Get all active users who need generation today
    const activeUsers = await prisma.user.findMany({
      where: {
        profile: { isNot: null },
      },
      include: {
        profile: true,
        curricula: {
          where: {
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          },
          take: 1,
        },
      },
    });

    console.log(`[DailyGeneration] Processing ${activeUsers.length} active users`);

    for (const user of activeUsers) {
      try {
        await processUserGeneration(user, scheduleEngine);
      } catch (error) {
        alertGenerationFailure(user.id, error);
      }
    }
  } catch (error) {
    alertGenerationFailure("system", error);
    throw error;
  }
}

async function processUserGeneration(
  user: {
    id: string;
    profile: UserProfile | null;
    curricula: MonthlyCurriculum[];
  },
  scheduleEngine: LearningScheduleEngine
): Promise<void> {
  const schedule = await scheduleEngine.getNextStudyDay(user.id);

  if (!schedule.needsGeneration) {
    console.log(`[DailyGeneration] User ${user.id}: ${schedule.reason}`);
    return;
  }

  if (!schedule.studyDay || !user.profile || user.curricula.length === 0) {
    console.log(`[DailyGeneration] User ${user.id}: skipping — missing curriculum or profile`);
    return;
  }

  const curriculum = user.curricula[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create DailyLesson record if it doesn't exist yet
  let dailyLessonId = schedule.dailyLessonId;
  if (!dailyLessonId) {
    const lesson = await prisma.dailyLesson.create({
      data: {
        userId: user.id,
        curriculumId: curriculum.id,
        studyDay: schedule.studyDay,
        calendarDate: today,
        generationStatus: "PENDING",
        vocabStatus: "PENDING",
        sentenceStatus: "PENDING",
        readingStatus: "PENDING",
        speakingStatus: "PENDING",
        writingStatus: "PENDING",
      },
    });
    dailyLessonId = lesson.id;
    console.log(`[DailyGeneration] Created DailyLesson ${dailyLessonId} for user ${user.id} day ${schedule.studyDay}`);
  }

  if (!dailyLessonId) {
    console.log(`[DailyGeneration] User ${user.id}: skipping — could not obtain dailyLessonId`);
    return;
  }

  // Fetch previous words for cross-domain linking
  const previousArtifacts = await prisma.aIArtifact.findMany({
    where: {
      userId: user.id,
      artifactType: "VOCABULARY_CARD",
    },
    take: 100,
    orderBy: { generatedAt: "desc" },
  });

  const previousWords = previousArtifacts
    .map((a) => (a.content as { word?: string }).word)
    .filter((w): w is string => !!w);

  const planningContext: PlanningContext = {
    userId: user.id,
    studyDay: schedule.studyDay,
    curriculumVersion: curriculum.version,
    userLevel: user.profile.currentLevel,
    studyGoal: user.profile.studyGoal ?? "",
    previousWords,
    previousCategories: [],
    yesterdayErrors: [],
  };

  const jobData: GenerationJobData = {
    userId: user.id,
    studyDay: schedule.studyDay,
    dailyLessonId,
    planningContext,
  };

  const jobId = await enqueueGenerationJob(jobData);
  console.log(`[DailyGeneration] Enqueued job ${jobId} for user ${user.id} day ${schedule.studyDay}`);
}

function alertGenerationFailure(userId: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Structured failure alert — in production this would be sent to an alerting service
  const alert = {
    level: "ERROR",
    service: "daily-generation",
    userId,
    message: `Generation failed for user ${userId}: ${errorMessage}`,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  };

  console.error("[DailyGeneration] ALERT:", JSON.stringify(alert, null, 2));
}
