import { NextRequest, NextResponse } from "next/server";

// 제품 URL에서 이미지 추출
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // 페이지 HTML 가져오기 (브라우저처럼 보이게 헤더 추가)
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        error: `페이지를 가져올 수 없습니다 (${response.status}). 직접 이미지 URL을 입력해주세요.`
      }, { status: 200 }); // 200으로 반환하여 클라이언트에서 에러 메시지 표시
    }

    const html = await response.text();

    // og:image 메타 태그에서 이미지 추출
    let imageUrl = extractMetaImage(html, 'og:image');

    // 없으면 twitter:image 시도
    if (!imageUrl) {
      imageUrl = extractMetaImage(html, 'twitter:image');
    }

    // 없으면 첫 번째 큰 이미지 시도
    if (!imageUrl) {
      imageUrl = extractFirstImage(html);
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "이미지를 찾을 수 없습니다. 직접 URL을 입력해주세요." }, { status: 200 });
    }

    // 상대 경로를 절대 경로로 변환
    if (imageUrl.startsWith("/")) {
      const urlObj = new URL(url);
      imageUrl = `${urlObj.origin}${imageUrl}`;
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return NextResponse.json({ error: "이미지 추출 실패. 직접 URL을 입력해주세요." }, { status: 200 });
  }
}

function extractMetaImage(html: string, property: string): string | null {
  // <meta property="og:image" content="..."> 형식
  const regex1 = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match1 = html.match(regex1);
  if (match1) return match1[1];

  // <meta content="..." property="og:image"> 형식
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i');
  const match2 = html.match(regex2);
  if (match2) return match2[1];

  // name 속성 사용하는 경우
  const regex3 = new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match3 = html.match(regex3);
  if (match3) return match3[1];

  return null;
}

function extractFirstImage(html: string): string | null {
  // 큰 이미지 찾기 (product, main, hero 등 키워드 포함)
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    // 작은 아이콘이나 로고 제외
    if (src.includes('logo') || src.includes('icon') || src.includes('sprite')) {
      continue;
    }
    // 상품 이미지일 가능성 높은 것
    if (src.includes('product') || src.includes('goods') || src.includes('item')) {
      return src;
    }
  }

  return null;
}
