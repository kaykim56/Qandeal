import * as Mixpanel from "mixpanel";

// 서버 사이드 Mixpanel 클라이언트
const mixpanel = Mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "", {
  protocol: "https",
});

// 공통 속성
const COMMON_PROPERTIES = {
  service: "qanda-ad-challenge",
};

/**
 * 서버 사이드 Mixpanel 이벤트 트래킹
 * 클라이언트 측 차단(광고 차단기 등)에 영향받지 않음
 */
export function trackServerEvent(
  eventName: string,
  distinctId: string,
  properties?: Record<string, unknown>
) {
  try {
    mixpanel.track(eventName, {
      distinct_id: distinctId,
      ...COMMON_PROPERTIES,
      ...properties,
    });
  } catch (error) {
    console.error("[Mixpanel] Server track error:", error);
  }
}

/**
 * 서버 사이드 사용자 프로필 설정
 */
export function setServerUserProfile(
  distinctId: string,
  properties: Record<string, unknown>
) {
  try {
    mixpanel.people.set(distinctId, {
      ...COMMON_PROPERTIES,
      ...properties,
    });
  } catch (error) {
    console.error("[Mixpanel] Server people.set error:", error);
  }
}

export default mixpanel;
