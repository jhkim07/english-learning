import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await requireAuth();

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/diagnosis");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-2">학습 캘린더</h1>
      <p className="text-muted-foreground">
        안녕하세요, {session.user?.name ?? session.user?.email}님.
      </p>
      <p className="text-sm text-muted-foreground mt-4">
        캘린더 화면은 Task 8에서 구현됩니다.
      </p>
    </div>
  );
}
