import { redirect } from "next/navigation";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  redirect(`/login?error=${searchParams.error ?? "unknown"}`);
}
