import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminReportsPage() {
  await requireAdmin();

  // ContentReport model may not exist yet — use a try/catch graceful fallback
  let reports: { id: string; reason: string; createdAt: Date; artifactId: string }[] = [];
  try {
    reports = await (prisma as any).contentReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    // Model doesn't exist yet
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Content Reports</h1>
      {reports.length === 0 ? (
        <p className="text-muted-foreground">No reports yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Artifact ID</th>
                <th className="text-left p-3">Reason</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.artifactId}</td>
                  <td className="p-3">{r.reason}</td>
                  <td className="p-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
