import { requireAuth } from "@/lib/session";

export default async function TodayPage() {
  await requireAuth();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">오늘의 학습</h1>
      <p className="text-muted-foreground mt-2">
        학습 화면은 Phase 4에서 구현됩니다.
      </p>
    </div>
  );
}
