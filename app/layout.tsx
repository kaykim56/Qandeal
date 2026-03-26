import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import { decodeJwt } from "jose";
import "./globals.css";
import Providers from "@/components/Providers";
import { QandaUserProvider } from "@/components/QandaUserProvider";
import { MixpanelProvider } from "@/components/MixpanelProvider";

export const metadata: Metadata = {
  title: "QANDA 챌린지 - 90% 페이백",
  description: "최대 90% 페이백 받고 상품 체험하기",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

async function getQandaUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();

    // 1. Authorization 헤더에서 JWT 디코딩
    const authHeader = headersList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.slice(7);
        const payload = decodeJwt(token);
        if (payload.sub) {
          return payload.sub as string;
        }
      } catch {
        // 디코딩 실패 시 다음 방법 시도
      }
    }

    // 2. access_token 쿠키에서 JWT 디코딩
    const accessToken = cookieStore.get("access_token")?.value;
    if (accessToken) {
      try {
        const payload = decodeJwt(accessToken);
        if (payload.sub) {
          return payload.sub as string;
        }
      } catch {
        // 디코딩 실패 시 다음 방법 시도
      }
    }

    // 3. qanda_user_id 쿠키 직접 사용
    const qandaUserId = cookieStore.get("qanda_user_id")?.value;
    if (qandaUserId) {
      return qandaUserId;
    }

    return null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getQandaUserId();

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jua&display=swap"
        />
      </head>
      <body className="font-sans antialiased bg-gray-100 min-h-screen">
        <Providers>
          <QandaUserProvider userId={userId}>
            <MixpanelProvider>
              <div className="flex justify-center min-h-screen">
                <div className="w-full max-w-[430px] bg-white shadow-xl relative">
                  {children}
                </div>
              </div>
            </MixpanelProvider>
          </QandaUserProvider>
        </Providers>
      </body>
    </html>
  );
}
