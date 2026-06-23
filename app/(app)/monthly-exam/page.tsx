import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { MonthlyExamClient } from "@/components/assessment/monthly-exam-client";

export default async function MonthlyExamPage() {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { currentLevel: true },
  });

  if (!profile) redirect("/diagnosis");

  return (
    <div className="min-h-screen p-4">
      <MonthlyExamClient currentLevel={profile.currentLevel} />
    </div>
  );
}
