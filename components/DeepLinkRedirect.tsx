"use client";

import { useEffect } from "react";

interface DeepLinkRedirectProps {
  challengeId: string;
}

export default function DeepLinkRedirect({ challengeId }: DeepLinkRedirectProps) {
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent;

    // 모바일 기기 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    if (!isMobile) {
      return;
    }

    // QANDA 앱 웹뷰 내부인지 감지
    const isQandaWebView = /QANDA|Mathpresso/i.test(userAgent);

    if (isQandaWebView) {
      return;
    }

    // 현재 페이지 URL 가져오기
    const currentUrl = window.location.href;

    // 딥링크 생성
    const encodedUrl = encodeURIComponent(currentUrl);
    const deepLink = `qandadir://web?link=${encodedUrl}&hiddenTopNavigation=true&hiddenBottomNavigation=true&backOwner=web`;

    // 여러 방법으로 딥링크 시도
    const tryDeepLink = () => {
      // 방법 1: 숨겨진 iframe 사용
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 3000);

      // 방법 2: location.href
      setTimeout(() => {
        window.location.href = deepLink;
      }, 100);

      // 방법 3: a 태그 클릭
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = deepLink;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 200);
    };

    const timer = setTimeout(tryDeepLink, 300);

    return () => clearTimeout(timer);
  }, [challengeId]);

  return null;
}
