import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-gray-100 min-h-screen">
        <Providers>
          <div className="flex justify-center min-h-screen">
            <div className="w-full max-w-[430px] bg-white shadow-xl relative">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
