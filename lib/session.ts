import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Use in Server Components and Route Handlers that require authentication
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

// Use when you want the session but don't require auth
export async function getSession() {
  return auth();
}
