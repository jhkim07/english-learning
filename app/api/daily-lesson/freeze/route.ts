import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dailyLessonId } = await request.json();

  if (!dailyLessonId || typeof dailyLessonId !== "string") {
    return NextResponse.json({ error: "dailyLessonId required" }, { status: 400 });
  }

  // Verify lesson belongs to user and is ready
  const lesson = await prisma.dailyLesson.findFirst({
    where: {
      id: dailyLessonId,
      curriculum: { userId },
      generationStatus: "READY",
    },
    include: {
      curriculum: { select: { userId: true } },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found or not ready" }, { status: 404 });
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

  const artifacts = await getArtifacts(dailyLessonId, userId);
  return NextResponse.json({ frozenAt: finalFrozenAt, artifacts });
}

async function getArtifacts(dailyLessonId: string, userId: string) {
  const artifacts = await prisma.aIArtifact.findMany({
    where: {
      dailyLessonId,
      userId,
      validationStatus: "PASSED",
    },
    select: {
      artifactId: true,
      artifactType: true,
      content: true,
      validationStatus: true,
    },
  });

  return {
    vocabCards: artifacts
      .filter((a) => a.artifactType === "VOCABULARY_CARD")
      .map((a) => a.content),
    sentenceCards: artifacts
      .filter((a) => a.artifactType === "SENTENCE_CARD")
      .map((a) => a.content),
    mnemonicImages: artifacts
      .filter((a) => a.artifactType === "MNEMONIC_IMAGE")
      .map((a) => a.content),
    readingPassage: artifacts.find((a) => a.artifactType === "READING_PASSAGE")?.content ?? null,
    speakingScenario: artifacts.find((a) => a.artifactType === "SPEAKING_SCENARIO")?.content ?? null,
    writingPrompt: artifacts.find((a) => a.artifactType === "WRITING_PROMPT")?.content ?? null,
  };
}
