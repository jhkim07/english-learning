import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [userCount, artifactCount, jobCount, errorCount] = await Promise.all([
    prisma.user.count(),
    prisma.aIArtifact.count(),
    prisma.generationJob.count(),
    prisma.errorRecord.count(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Users", value: userCount },
          { label: "AI Artifacts", value: artifactCount },
          { label: "Generation Jobs", value: jobCount },
          { label: "Error Records", value: errorCount },
        ].map((stat) => (
          <div key={stat.label} className="border rounded-lg p-4">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
