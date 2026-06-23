import { Queue, Worker } from "bullmq";
import { DailyPlanner } from "@/lib/planning";
import { prisma } from "@/lib/db";
import type { PlanningContext } from "@/lib/planning/types";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
};

export const generationQueue = new Queue("daily-generation", { connection });

export interface GenerationJobData {
  userId: string;
  studyDay: number;
  dailyLessonId: string;
  planningContext: PlanningContext;
}

export function createGenerationWorker() {
  return new Worker<GenerationJobData>(
    "daily-generation",
    async (job) => {
      const { dailyLessonId, planningContext } = job.data;

      try {
        await prisma.dailyLesson.update({
          where: { id: dailyLessonId },
          data: { generationStatus: "PARTIAL" },
        });

        const planner = new DailyPlanner();
        const result = await planner.plan(planningContext, dailyLessonId);

        return result;
      } catch (error) {
        await prisma.dailyLesson.update({
          where: { id: dailyLessonId },
          data: { generationStatus: "FAILED" },
        });
        throw error;
      }
    },
    { connection }
  );
}

export async function enqueueGenerationJob(data: GenerationJobData): Promise<string> {
  const job = await generationQueue.add("generate-daily-lesson", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
  return job.id ?? "";
}
