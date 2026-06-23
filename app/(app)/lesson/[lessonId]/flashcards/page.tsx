import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { FlashcardsClient } from "@/components/flashcard/flashcards-client";

export default async function FlashcardsPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const artifacts = await prisma.aIArtifact.findMany({
    where: {
      dailyLessonId: params.lessonId,
      userId,
      validationStatus: "PASSED",
      artifactType: { in: ["VOCABULARY_CARD", "SENTENCE_CARD", "MNEMONIC_IMAGE"] },
    },
  });

  return (
    <div className="min-h-screen p-4">
      <FlashcardsClient
        lessonId={params.lessonId}
        artifacts={artifacts.map((a) => ({ ...a, content: a.content as Record<string, unknown> }))}
      />
    </div>
  );
}
