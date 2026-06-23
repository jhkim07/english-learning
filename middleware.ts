import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtectedRoute =
    req.nextUrl.pathname.startsWith("/app") ||
    req.nextUrl.pathname.startsWith("/today") ||
    req.nextUrl.pathname.startsWith("/calendar") ||
    req.nextUrl.pathname.startsWith("/conversation") ||
    req.nextUrl.pathname.startsWith("/reading") ||
    req.nextUrl.pathname.startsWith("/writing") ||
    req.nextUrl.pathname.startsWith("/review");

  if (isProtectedRoute && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
