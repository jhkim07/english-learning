import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function AdminContentPage() {
  await requireAdmin();

  const artifacts = await prisma.aIArtifact.findMany({
    orderBy: { generatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      artifactType: true,
      validationStatus: true,
      safetyStatus: true,
      generatedAt: true,
      userId: true,
    },
  });

  const statusColor: Record<string, string> = {
    PASSED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    SKIPPED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Content Inspection</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Validation</th>
              <th className="text-left p-3">Safety</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {artifacts.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No artifacts yet</td></tr>
            )}
            {artifacts.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-mono text-xs">{a.artifactType}</td>
                <td className="p-3">
                  <Badge className={`text-xs ${statusColor[a.validationStatus] ?? ""}`}>
                    {a.validationStatus}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge className={`text-xs ${a.safetyStatus === "SAFE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {a.safetyStatus}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(a.generatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
