import { NextRequest, NextResponse } from "next/server";

// 제품 URL에서 정보 추출
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // 페이지 HTML 가져오기
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
      return NextResponse.json({
        error: `페이지를 가져올 수 없습니다 (${response.status}). 이 사이트는 자동 가져오기를 지원하지 않습니다.`
      }, { status: 200 });
    }

    const html = await response.text();

    // 제품 정보 추출
    const productInfo = {
      title: extractTitle(html),
      price: extractPrice(html),
      image: extractImage(html, url),
      detailImages: extractDetailImages(html, url),
      description: extractDescription(html),
      platform: extractPlatform(url),
    };

    // 아무 정보도 없으면 에러
    if (!productInfo.title && !productInfo.price && !productInfo.image) {
      return NextResponse.json({
        error: "제품 정보를 찾을 수 없습니다. 직접 입력해주세요."
      }, { status: 200 });
    }

    return NextResponse.json(productInfo);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({
      error: "제품 정보 가져오기 실패. 직접 입력해주세요."
    }, { status: 200 });
  }
}

// 제목 추출
function extractTitle(html: string): string | null {
  // og:title
  const ogTitle = extractMeta(html, "og:title");
  if (ogTitle) return cleanText(ogTitle);

  // <title> 태그
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return cleanText(titleMatch[1]);

  return null;
}

// 가격 추출
function extractPrice(html: string): number | null {
  // 다양한 가격 패턴 시도
  const patterns = [
    // JSON-LD schema
    /"price":\s*"?(\d[\d,]*)"?/i,
    // meta 태그
    /property="product:price:amount"\s+content="(\d[\d,]*)"/i,
    /content="(\d[\d,]*)"\s+property="product:price:amount"/i,
    // 일반적인 가격 패턴 (원)
    /(\d{1,3}(?:,\d{3})+)\s*원/,
    // data 속성
    /data-price="(\d[\d,]*)"/i,
    // 클래스로 찾기
    /class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d{1,3}(?:,\d{3})+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/,/g, "");
      const price = parseInt(priceStr, 10);
      if (price > 0 && price < 100000000) { // 합리적인 가격 범위
        return price;
      }
    }
  }

  return null;
}

// 이미지 추출
function extractImage(html: string, baseUrl: string): string | null {
  // og:image
  let imageUrl = extractMeta(html, "og:image");

  // twitter:image
  if (!imageUrl) {
    imageUrl = extractMeta(html, "twitter:image");
  }

  // 상품 이미지 패턴
  if (!imageUrl) {
    const imgPatterns = [
      /<img[^>]+class="[^"]*(?:product|goods|item|main)[^"]*"[^>]+src="([^"]+)"/i,
      /<img[^>]+src="([^"]+)"[^>]+class="[^"]*(?:product|goods|item|main)[^"]*"/i,
      /<img[^>]+id="[^"]*(?:product|goods|item|main)[^"]*"[^>]+src="([^"]+)"/i,
    ];

    for (const pattern of imgPatterns) {
      const match = html.match(pattern);
      if (match) {
        imageUrl = match[1];
        break;
      }
    }
  }

  if (!imageUrl) return null;

  // 상대 경로를 절대 경로로
  if (imageUrl.startsWith("/")) {
    const urlObj = new URL(baseUrl);
    imageUrl = `${urlObj.origin}${imageUrl}`;
  } else if (!imageUrl.startsWith("http")) {
    const urlObj = new URL(baseUrl);
    imageUrl = `${urlObj.origin}/${imageUrl}`;
  }

  return imageUrl;
}

// 상세 이미지 추출 (다중 이미지 지원)
function extractDetailImages(html: string, baseUrl: string): string[] {
  const detailImages: string[] = [];
  const seen = new Set<string>();

  // 카카오 선물하기 editor 이미지 (st.kakaocdn.net/product/gift/editor/)
  const kakaoEditorPattern = /https?:\/\/st\.kakaocdn\.net\/product\/gift\/editor\/[^"'\s]+\.(?:jpg|jpeg|png|gif|webp)/gi;
  const kakaoMatches = html.match(kakaoEditorPattern);
  if (kakaoMatches && kakaoMatches.length > 0) {
    // 중복 제거하며 모든 editor 이미지 반환
    for (const img of kakaoMatches) {
      if (!seen.has(img)) {
        seen.add(img);
        detailImages.push(img);
      }
    }
    return detailImages;
  }

  // 기타 상세 이미지 패턴
  const detailPatterns = [
    // 카카오 선물하기 상세 이미지
    /<img[^>]+class="[^"]*detail[^"]*"[^>]+src="([^"]+)"/gi,
    /<img[^>]+src="([^"]+)"[^>]+class="[^"]*detail[^"]*"/gi,
    // data-src 패턴 (lazy loading)
    /<img[^>]+class="[^"]*detail[^"]*"[^>]+data-src="([^"]+)"/gi,
    // 상품 상세 이미지 영역
    /class="[^"]*(?:product-detail|item-detail|detail-image)[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi,
    // 일반적인 긴 상세 이미지 패턴
    /<img[^>]+src="([^"]+(?:detail|desc|content)[^"]*\.(?:jpg|jpeg|png|gif|webp))"/gi,
  ];

  for (const pattern of detailPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let imageUrl = match[1];

      // 상대 경로를 절대 경로로
      if (imageUrl.startsWith("/")) {
        const urlObj = new URL(baseUrl);
        imageUrl = `${urlObj.origin}${imageUrl}`;
      } else if (!imageUrl.startsWith("http")) {
        const urlObj = new URL(baseUrl);
        imageUrl = `${urlObj.origin}/${imageUrl}`;
      }

      if (!seen.has(imageUrl)) {
        seen.add(imageUrl);
        detailImages.push(imageUrl);
      }
    }
  }

  return detailImages;
}

// 설명 추출
function extractDescription(html: string): string | null {
  const desc = extractMeta(html, "og:description") || extractMeta(html, "description");
  return desc ? cleanText(desc) : null;
}

// 플랫폼 추출
function extractPlatform(url: string): string | null {
  const hostname = new URL(url).hostname.toLowerCase();

  const platformMap: Record<string, string> = {
    "gift.kakao.com": "카카오 선물하기",
    "www.oliveyoung.co.kr": "올리브영",
    "oliveyoung.co.kr": "올리브영",
    "www.coupang.com": "쿠팡",
    "coupang.com": "쿠팡",
    "www.11st.co.kr": "11번가",
    "11st.co.kr": "11번가",
    "www.gmarket.co.kr": "G마켓",
    "gmarket.co.kr": "G마켓",
    "www.auction.co.kr": "옥션",
    "auction.co.kr": "옥션",
    "smartstore.naver.com": "네이버 스마트스토어",
    "shopping.naver.com": "네이버 쇼핑",
    "www.ssg.com": "SSG",
    "ssg.com": "SSG",
    "www.lotteon.com": "롯데온",
    "lotteon.com": "롯데온",
    "www.kurly.com": "마켓컬리",
    "kurly.com": "마켓컬리",
  };

  for (const [domain, platform] of Object.entries(platformMap)) {
    if (hostname.includes(domain) || hostname === domain) {
      return platform;
    }
  }

  // 알 수 없는 경우 도메인 이름 사용
  return hostname.replace("www.", "").split(".")[0];
}

// 메타 태그 추출
function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// 텍스트 정리
function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
