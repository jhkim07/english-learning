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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Minimal top bar — hidden during active learning sessions via mode classes */}
      <header className="shrink-0 border-b px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-sm font-medium">AI 영어 학습</span>
          <a
            href="/graph"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            학습 그래프
          </a>
          <LessonStatusChecker lessonId={lessonId} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {session.user?.name ?? session.user?.email}
          </span>
          <a
            href="/settings/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </a>
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
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
