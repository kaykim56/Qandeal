import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

export function middleware(request: NextRequest) {
  // 기존 access_token 쿠키가 있으면 스킵
  if (request.cookies.get("access_token")) {
    return NextResponse.next();
  }

  // JWT 토큰 추출 (Authorization 헤더 우선, 커스텀 헤더 폴백)
  let token: string | null = null;

  // 1. Authorization 헤더 확인
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // 2. 커스텀 헤더 폴백
  if (!token) {
    token =
      request.headers.get("x-qanda-token") ||
      request.headers.get("x-auth-token") ||
      request.headers.get("x-access-token");
  }

  // 토큰이 없으면 통과
  if (!token) {
    return NextResponse.next();
  }

  // JWT 디코딩 및 쿠키 설정
  try {
    const payload = decodeJwt(token);
    const userId = payload.sub as string | undefined;

    const response = NextResponse.next();

    // 쿠키 설정 (httpOnly: false로 클라이언트에서 접근 가능)
    const cookieOptions = {
      path: "/",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7일
    };

    // access_token: JWT 토큰 원본
    response.cookies.set("access_token", token, cookieOptions);

    // qanda_token: JWT 토큰 원본 (API 호환성)
    response.cookies.set("qanda_token", token, cookieOptions);

    // qanda_user_id: JWT의 sub 값 (유저 ID)
    if (userId) {
      response.cookies.set("qanda_user_id", userId, cookieOptions);
    }

    return response;
  } catch {
    // JWT 디코딩 실패 시 그냥 통과
    console.error("Failed to decode JWT in middleware");
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 대해 미들웨어 실행:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.html$).*)",
  ],
};
