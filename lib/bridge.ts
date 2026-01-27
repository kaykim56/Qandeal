// 웹뷰 브릿지 유틸리티
// Android: window.QandaWebView.postMessage
// iOS: window.webkit.messageHandlers.Qanda.postMessage

declare global {
  interface Window {
    QandaWebView?: {
      postMessage: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        Qanda?: {
          postMessage: (message: string) => void;
        };
      };
    };
  }
}

interface BridgeMessage {
  name: string;
  payload?: Record<string, unknown>;
}

/**
 * 웹뷰 환경인지 체크
 */
export const isWebView = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window.QandaWebView?.postMessage || window.webkit?.messageHandlers?.Qanda?.postMessage);
};

/**
 * 브릿지 메시지 전송
 */
const sendMessage = (message: BridgeMessage): boolean => {
  if (typeof window === "undefined") return false;

  const messageStr = JSON.stringify(message);

  // Android
  if (window.QandaWebView?.postMessage) {
    window.QandaWebView.postMessage(messageStr);
    return true;
  }

  // iOS
  if (window.webkit?.messageHandlers?.Qanda?.postMessage) {
    window.webkit.messageHandlers.Qanda.postMessage(messageStr);
    return true;
  }

  return false;
};

/**
 * 브릿지 인터페이스
 */
export const getBridge = () => ({
  /**
   * 웹뷰 닫기
   * 웹뷰가 아닌 환경에서는 history.back() 폴백
   */
  closeWebview: () => {
    const sent = sendMessage({ name: "closeWebview" });
    if (!sent) {
      // 웹 브라우저 폴백
      window.history.back();
    }
  },

  /**
   * 네이티브 공유 기능 (선택적)
   */
  share: (title: string, url: string) => {
    return sendMessage({
      name: "share",
      payload: { title, url },
    });
  },
});
