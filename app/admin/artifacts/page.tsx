import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminArtifactsPage() {
  await requireAdmin();

  const artifacts = await prisma.aIArtifact.findMany({
    orderBy: { generatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      artifactType: true,
      validationStatus: true,
      modelVersion: true,
      promptVersion: true,
      generatedAt: true,
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI Artifacts</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Validation</th>
              <th className="text-left p-3">Model</th>
              <th className="text-left p-3">Prompt</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {artifacts.length === 0 && (
              <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No artifacts yet</td></tr>
            )}
            {artifacts.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-mono text-xs">{a.artifactType}</td>
                <td className="p-3 text-xs">{a.validationStatus}</td>
                <td className="p-3 text-xs text-muted-foreground">{a.modelVersion}</td>
                <td className="p-3 text-xs text-muted-foreground">{a.promptVersion}</td>
                <td className="p-3 text-muted-foreground">{new Date(a.generatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
