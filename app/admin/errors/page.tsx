import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export default async function AdminErrorsPage() {
  await requireAdmin();

  const errors = await prisma.errorRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      domain: true,
      errorType: true,
      feedback: true,
      createdAt: true,
    },
  });

  const domainColor: Record<string, string> = {
    conversation: "bg-blue-100 text-blue-700",
    reading: "bg-green-100 text-green-700",
    writing: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Error Records</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Domain</th>
              <th className="text-left p-3">Error Type</th>
              <th className="text-left p-3">Feedback</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {errors.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No errors recorded yet</td></tr>
            )}
            {errors.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3">
                  <Badge className={`text-xs ${domainColor[e.domain] ?? "bg-gray-100 text-gray-700"}`}>
                    {e.domain}
                  </Badge>
                </td>
                <td className="p-3 text-xs">{e.errorType}</td>
                <td className="p-3 text-xs text-muted-foreground truncate max-w-[250px]">{e.feedback}</td>
                <td className="p-3 text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
