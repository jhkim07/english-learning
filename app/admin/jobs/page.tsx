import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function AdminJobsPage() {
  await requireAdmin();

  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      attempts: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const statusColor: Record<string, string> = {
    QUEUED: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Generation Jobs</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Attempts</th>
              <th className="text-left p-3">Error</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No jobs yet</td></tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-3 font-mono text-xs">{j.id.slice(0, 8)}…</td>
                <td className="p-3">
                  <Badge className={`text-xs ${statusColor[j.status] ?? ""}`}>{j.status}</Badge>
                </td>
                <td className="p-3">{j.attempts}</td>
                <td className="p-3 text-xs text-red-600 max-w-[200px] truncate">{j.errorMessage ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{new Date(j.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
