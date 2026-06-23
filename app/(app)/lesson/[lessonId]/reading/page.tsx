import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { ReadingRoom } from "@/components/reading/reading-room";
import type { ReadingPassage } from "@/lib/ai/generators/reading";

export default async function ReadingPage({
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
      artifactType: "READING_PASSAGE",
      validationStatus: "PASSED",
    },
  });

  if (!artifact) redirect(`/lesson/${params.lessonId}`);

  return (
    <div className="h-screen flex flex-col">
      <ReadingRoom
        lessonId={params.lessonId}
        passage={artifact.content as unknown as ReadingPassage}
      />
    </div>
  );
}
