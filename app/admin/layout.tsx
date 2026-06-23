import { ReactNode } from "react";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/prompts", label: "Prompt Versions" },
  { href: "/admin/content", label: "Content Inspection" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/costs", label: "Costs & Timing" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/jobs", label: "Generation Jobs" },
  { href: "/admin/artifacts", label: "Artifacts" },
  { href: "/admin/errors", label: "Error Records" },
  { href: "/admin/curriculum", label: "Curriculum" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-48 border-r bg-muted/30 p-4 space-y-1 shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Admin</p>
        {ADMIN_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block text-sm px-3 py-1.5 rounded hover:bg-accent transition-colors"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
