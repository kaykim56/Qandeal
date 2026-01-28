import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// =====================================================
// 환경 변수
// =====================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// =====================================================
// 브라우저 클라이언트 (클라이언트 컴포넌트용)
// =====================================================
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// =====================================================
// 서버 클라이언트 (서버 컴포넌트/API 라우트용 - anon key)
// =====================================================
export function createServerSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// 서비스 롤 클라이언트 (API 라우트 전용 - RLS 우회)
// 주의: 절대 클라이언트에 노출하면 안 됨
// =====================================================
export function createServiceRoleClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =====================================================
// 관리자 인증 헬퍼
// =====================================================

// Supabase Auth 세션에서 관리자 여부 확인
export async function isAdminUser(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !data) return false;
  return true;
}

// API 라우트에서 관리자 인증 확인 (Bearer 토큰)
export async function getAdminSession(request: Request): Promise<{
  isAdmin: boolean;
  email: string | null;
}> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { isAdmin: false, email: null };
  }

  const token = authHeader.substring(7);

  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    return { isAdmin: false, email: null };
  }

  const isAdmin = await isAdminUser(user.email);
  return { isAdmin, email: user.email };
}

// 서버 사이드에서 쿠키로 세션 확인 (API 라우트용)
export async function getSessionFromCookie(request: Request): Promise<{
  user: { email: string } | null;
  isAdmin: boolean;
}> {
  const cookieHeader = request.headers.get("cookie") || "";
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieHeader,
      },
    },
  });

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user?.email) {
    return { user: null, isAdmin: false };
  }

  const isAdmin = await isAdminUser(session.user.email);
  return {
    user: { email: session.user.email },
    isAdmin,
  };
}
