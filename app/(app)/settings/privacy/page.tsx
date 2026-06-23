import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { PrivacySettingsClient } from "@/components/privacy/privacy-settings-client";

export default async function PrivacySettingsPage() {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { audioConsent: true },
  });

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Privacy Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control how your learning data is stored.
        </p>
      </div>
      <PrivacySettingsClient audioConsent={profile?.audioConsent ?? false} />
    </div>
  );
}
