import { requireAdmin } from "@/lib/admin/admin-guard";
import { prisma } from "@/lib/db";

export default async function AdminCurriculumPage() {
  await requireAdmin();

  const curricula = await prisma.monthlyCurriculum.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      userId: true,
      month: true,
      year: true,
      createdAt: true,
      _count: { select: { dailyLessons: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Curriculum</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Month</th>
              <th className="text-left p-3">Lessons</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {curricula.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">No curricula yet</td></tr>
            )}
            {curricula.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono text-xs">{c.userId.slice(0, 8)}…</td>
                <td className="p-3">{c.year}-{String(c.month).padStart(2, "0")}</td>
                <td className="p-3">{c._count.dailyLessons}</td>
                <td className="p-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
