import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { WritingRoomClient } from "@/components/writing/writing-room-client";
import type { WritingPrompt } from "@/lib/ai/generators/writing";

export default async function WritingPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const artifact = await prisma.aIArtifact.findFirst({
    where: {
      dailyLessonId: params.lessonId,
      userId,
      artifactType: "WRITING_PROMPT",
      validationStatus: "PASSED",
    },
  });

  if (!artifact) redirect(`/lesson/${params.lessonId}`);

  return (
    <div className="min-h-screen p-4">
      <WritingRoomClient
        lessonId={params.lessonId}
        prompt={artifact.content as unknown as WritingPrompt}
      />
    </div>
  );
}
