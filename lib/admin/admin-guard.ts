import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function requireAdmin(): Promise<string> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  // In dev mode, always allow admin
  if (DEV_BYPASS_AUTH) return userId;

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { isAdmin: true },
  });

  if (!profile?.isAdmin) redirect("/calendar");
  return userId;
}
