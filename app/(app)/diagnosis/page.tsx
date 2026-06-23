import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { DiagnosisForm } from "@/components/diagnosis/diagnosis-form";

export default async function DiagnosisPage() {
  const session = await requireAuth();

  // If user already has a profile, skip diagnosis
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (profile) {
    redirect("/calendar");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">영어 실력 진단</h1>
          <p className="text-muted-foreground">
            몇 가지 질문으로 맞춤 학습 과정을 설정합니다.
          </p>
        </div>
        <DiagnosisForm userId={session.user.id} />
      </div>
    </div>
  );
}
