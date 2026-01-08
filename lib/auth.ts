import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 허용된 이메일 목록
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim()) || [];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // 허용된 이메일만 로그인 가능
      if (ALLOWED_EMAILS.length === 0) {
        // 개발 모드: 모든 이메일 허용
        return true;
      }
      return ALLOWED_EMAILS.includes(user.email || "");
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
};
