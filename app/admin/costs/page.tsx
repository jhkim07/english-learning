import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminCostsPage() {
  await requireAdmin();

  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      createdAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  const completedJobs = jobs.filter((j) => j.completedAt);
  const avgDurationMs =
    completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          const dur = new Date(j.completedAt!).getTime() - new Date(j.createdAt).getTime();
          return sum + dur;
        }, 0) / completedJobs.length
      : 0;

  const statusCounts = jobs.reduce(
    (acc, j) => {
      acc[j.status] = (acc[j.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Costs & Timing</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="border rounded-lg p-4">
          <p className="text-2xl font-bold">{completedJobs.length}</p>
          <p className="text-sm text-muted-foreground">Completed Jobs</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-2xl font-bold">{(avgDurationMs / 1000).toFixed(1)}s</p>
          <p className="text-sm text-muted-foreground">Avg Generation Time</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-2xl font-bold">{statusCounts["FAILED"] ?? 0}</p>
          <p className="text-sm text-muted-foreground">Failed Jobs</p>
        </div>
      </div>
      <div className="border rounded-lg p-4 text-sm text-muted-foreground">
        Cost tracking (token usage) requires Anthropic API billing data — not yet wired. V2 feature.
      </div>
    </div>
  );
}
