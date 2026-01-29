"use client";

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import mixpanel from "mixpanel-browser";
import { useQandaUser } from "./QandaUserProvider";

const MixpanelContext = createContext<typeof mixpanel | null>(null);

export function MixpanelProvider({ children }: { children: ReactNode }) {
  const { user } = useQandaUser();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (!token) {
      console.warn("Mixpanel token not found");
      return;
    }

    mixpanel.init(token, {
      debug: process.env.NODE_ENV === "development",
      track_pageview: false,
      persistence: "localStorage",
    });

    initialized.current = true;
  }, []);

  // 유저 ID로 초기 identify
  useEffect(() => {
    if (user?.userId && initialized.current) {
      mixpanel.identify(user.userId);
      mixpanel.people.set({
        qanda_user_id: user.userId,
        service: "qanda-ad-challenge",
      });
    }
  }, [user?.userId]);

  return (
    <MixpanelContext.Provider value={mixpanel}>
      {children}
    </MixpanelContext.Provider>
  );
}

export function useMixpanel() {
  return useContext(MixpanelContext);
}

// 공통 속성 (서비스 구분용)
const COMMON_PROPERTIES = {
  service: "qanda-ad-challenge",
};

// 이벤트 트래킹 헬퍼
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    mixpanel.track(eventName, {
      ...COMMON_PROPERTIES,
      ...properties,
    });
  }
}

// 전화번호 인증 후 identify 변경
export function identifyByPhone(phoneNumber: string, qandaUserId?: string) {
  mixpanel.identify(phoneNumber);
  mixpanel.people.set({
    $phone: phoneNumber,
    qanda_user_id: qandaUserId,
    service: "qanda-ad-challenge",
  });
}
