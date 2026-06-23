import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  // If already logged in, redirect to calendar
  const session = await auth();
  if (session?.user) {
    redirect("/calendar");
  }

  const params = await searchParams;
  const error = params.error;
  const callbackUrl = params.callbackUrl ?? "/calendar";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">AI 영어 학습</CardTitle>
        <CardDescription>
          하루 50분, AI와 함께하는 체계적인 영어 학습
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive text-center">
            {error === "OAuthAccountNotLinked"
              ? "이미 다른 방법으로 가입된 이메일입니다."
              : "로그인 중 오류가 발생했습니다. 다시 시도해주세요."}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <Button type="submit" className="w-full" size="lg">
            Google로 시작하기
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          계속하면 서비스 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주합니다.
        </p>
      </CardContent>
    </Card>
  );
}
