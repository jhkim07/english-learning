import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import Credentials from "next-auth/providers/credentials";

const isDev = process.env.NODE_ENV === "development";
const isBypassMode = isDev && process.env.DEV_BYPASS_AUTH === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(isBypassMode
      ? [
          Credentials({
            id: "dev-bypass",
            name: "Dev Bypass",
            credentials: {},
            async authorize() {
              // Return a fake user for local dev
              // In real DB mode this user must exist (seed script creates it in Task 9)
              return {
                id: "dev-user-id",
                email: "dev@example.com",
                name: "Dev User",
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    session({ session, user, token }) {
      // In JWT mode (Credentials), use token.sub; in DB mode, use user.id
      if (session.user) {
        session.user.id = user?.id ?? token?.sub ?? "";
      }
      return session;
    },
  },
  // Credentials provider requires JWT session strategy
  session: {
    strategy: isBypassMode ? "jwt" : "database",
  },
});
