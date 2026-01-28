import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const cookies: Record<string, string> = {};
  request.cookies.getAll().forEach((cookie) => {
    cookies[cookie.name] = cookie.value;
  });

  return NextResponse.json({
    headers,
    cookies,
    url: request.url,
  });
}
