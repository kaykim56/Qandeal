import { NextRequest, NextResponse } from "next/server";

// GET /api/redirect?url=xxx - 외부 URL로 리다이렉트 (스팸 탐지 우회)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다" }, { status: 400 });
  }

  // 허용된 도메인만 리다이렉트 (보안)
  const allowedDomains = [
    "smartstore.naver.com",
    "brand.naver.com",
    "shopping.naver.com",
    "www.coupang.com",
    "www.oliveyoung.co.kr",
    "gift.kakao.com",
  ];

  try {
    const targetUrl = new URL(url);
    const isAllowed = allowedDomains.some(
      (domain) => targetUrl.hostname === domain || targetUrl.hostname.endsWith("." + domain)
    );

    if (!isAllowed) {
      return NextResponse.json({ error: "허용되지 않은 도메인입니다" }, { status: 403 });
    }

    // HTML 페이지 반환 (잠깐 보여주고 리다이렉트)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=${url}">
  <title>이동 중...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 20px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e5e5e5;
      border-top-color: #ff6600;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    p {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>상품 페이지로 이동 중...</p>
  </div>
  <script>
    window.location.href = "${url}";
  </script>
</body>
</html>
    `.trim();

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return NextResponse.json({ error: "잘못된 URL입니다" }, { status: 400 });
  }
}
