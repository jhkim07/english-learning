import { requireAuth } from "@/lib/session";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LessonStatusChecker } from "@/components/notifications/lesson-status-checker";
import { getTodaysLessonId } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const lessonId = await getTodaysLessonId();

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal top bar — hidden during active learning sessions via mode classes */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">AI 영어 학습</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {session.user?.name ?? session.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </header>
      <LessonStatusChecker lessonId={lessonId} />
      <main>{children}</main>
    </div>
  );
}
