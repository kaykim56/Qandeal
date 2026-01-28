"use client";

export default function Providers({ children }: { children: React.ReactNode }) {
  // NextAuth SessionProvider 제거됨 - Supabase Auth 사용
  return <>{children}</>;
}
