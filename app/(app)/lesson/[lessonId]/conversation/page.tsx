import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { ConversationRoom } from "@/components/conversation/conversation-room";
import type { SpeakingScenario } from "@/lib/ai/generators/speaking";

export default async function ConversationPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const scenario = await prisma.aIArtifact.findFirst({
    where: {
      dailyLessonId: params.lessonId,
      artifactType: "SPEAKING_SCENARIO",
      userId,
      validationStatus: "PASSED",
    },
  });

  if (!scenario) redirect(`/lesson/${params.lessonId}`);

  return (
    <div className="h-screen flex flex-col">
      <ConversationRoom
        lessonId={params.lessonId}
        scenario={scenario.content as unknown as SpeakingScenario}
      />
    </div>
  );
}
