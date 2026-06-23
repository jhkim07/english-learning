"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";

export interface FrozenLesson {
  dailyLessonId: string;
  studyDay: number;
  frozenAt: Date;
  artifacts: {
    vocabCards: unknown[];
    sentenceCards: unknown[];
    mnemonicImages: unknown[];
    readingPassage: unknown | null;
    speakingScenario: unknown | null;
    writingPrompt: unknown | null;
  };
}

export async function openLesson(dailyLessonId: string): Promise<FrozenLesson> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const lesson = await prisma.dailyLesson.findFirst({
    where: {
      id: dailyLessonId,
      curriculum: { userId },
      generationStatus: "READY",
    },
  });

  if (!lesson) {
    throw new Error("Lesson not found or not ready");
  }

  const frozenAt = new Date();

  // Atomic freeze: only updates if frozenAt is still null (wins the race)
  await prisma.dailyLesson.updateMany({
    where: { id: dailyLessonId, frozenAt: null },
    data: { frozenAt, isOpen: true },
  });

  // Regardless of who won the race, fetch the current frozenAt
  const finalLesson = await prisma.dailyLesson.findUnique({
    where: { id: dailyLessonId },
    select: { frozenAt: true },
  });
  const finalFrozenAt = finalLesson!.frozenAt!;

  const artifacts = await prisma.aIArtifact.findMany({
    where: { dailyLessonId, userId, validationStatus: "PASSED" },
    select: {
      artifactId: true,
      artifactType: true,
      content: true,
    },
  });

  return {
    dailyLessonId,
    studyDay: lesson.studyDay,
    frozenAt: finalFrozenAt,
    artifacts: {
      vocabCards: artifacts
        .filter((a) => a.artifactType === "VOCABULARY_CARD")
        .map((a) => a.content),
      sentenceCards: artifacts
        .filter((a) => a.artifactType === "SENTENCE_CARD")
        .map((a) => a.content),
      mnemonicImages: artifacts
        .filter((a) => a.artifactType === "MNEMONIC_IMAGE")
        .map((a) => a.content),
      readingPassage:
        artifacts.find((a) => a.artifactType === "READING_PASSAGE")?.content ?? null,
      speakingScenario:
        artifacts.find((a) => a.artifactType === "SPEAKING_SCENARIO")?.content ?? null,
      writingPrompt:
        artifacts.find((a) => a.artifactType === "WRITING_PROMPT")?.content ?? null,
    },
  };
}
