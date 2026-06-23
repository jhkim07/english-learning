"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";

async function getAuthenticatedUserId(): Promise<string> {
  if (DEV_BYPASS_AUTH) return "dev-user-id";
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// Update audio consent preference
export async function updateAudioConsent(input: { consent: boolean }): Promise<void> {
  const userId = await getAuthenticatedUserId();
  await prisma.userProfile.update({
    where: { userId },
    data: { audioConsent: input.consent },
  });
}

// Delete conversation transcripts and writing submissions
// Note: ConversationTurn and WritingSubmission models do not yet exist in schema.
// This action is a no-op placeholder — it will delete data once those models are added.
export async function deleteTranscripts(): Promise<void> {
  // ConversationTurn and WritingSubmission are not yet in the schema (V2 models).
  // When added, call:
  //   await prisma.conversationTurn.deleteMany({ where: { userId } });
  //   await prisma.writingSubmission.deleteMany({ where: { userId } });
}

// Full account deletion cascade
export async function deleteAccount(): Promise<void> {
  const userId = await getAuthenticatedUserId();

  // Delete in dependency order (children before parents)
  // 1. Learning data
  await prisma.flashcardAttempt.deleteMany({ where: { userId } });
  await prisma.errorRecord.deleteMany({ where: { userId } });
  await prisma.weeklyAssessment.deleteMany({ where: { userId } });
  await prisma.monthlyExam.deleteMany({ where: { userId } });
  await prisma.progressionDecision.deleteMany({ where: { userId } });

  // 2. AI artifacts and jobs
  await prisma.aIArtifact.deleteMany({ where: { userId } });
  await prisma.generationJob.deleteMany({ where: { userId } });

  // 3. Curriculum (DailyLesson cascades via Prisma onDelete: Cascade)
  await prisma.monthlyCurriculum.deleteMany({ where: { userId } });

  // 4. Profile and user
  await prisma.userProfile.delete({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}
