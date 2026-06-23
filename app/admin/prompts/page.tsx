import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminPromptsPage() {
  await requireAdmin();

  const prompts = await prisma.promptVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Prompt Versions</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Version</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {prompts.length === 0 && (
              <tr><td colSpan={3} className="p-3 text-center text-muted-foreground">No prompt versions yet</td></tr>
            )}
            {prompts.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-mono text-xs">{p.name}</td>
                <td className="p-3">{p.version}</td>
                <td className="p-3 text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
