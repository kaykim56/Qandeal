// 미션 스텝 프리셋 정의

export interface StepPreset {
  id: string;
  title: string;
  description: string;
  isCustom?: boolean; // 사용자가 추가한 프리셋인지
}

// 기본 프리셋 목록
export const DEFAULT_STEP_PRESETS: StepPreset[] = [
  {
    id: "search",
    title: "검색 키워드 인증하기",
    description: "검색창에 키워드를 검색하고, 검색어가 보이도록 캡처해서 인증해주세요.",
  },
  {
    id: "wishlist",
    title: "찜하기 인증하기",
    description: "상품 페이지로 들어가 하트를 눌러 찜하기를 해주세요. 찜한 화면을 캡처해서 인증해주세요.",
  },
  {
    id: "cart",
    title: "장바구니 인증하기",
    description: "상품을 장바구니에 담고, 장바구니 화면을 캡처해서 인증해주세요.",
  },
  {
    id: "purchase",
    title: "구매 인증하기",
    description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처해주세요.",
  },
  {
    id: "review",
    title: "리뷰 인증하기",
    description: "구매처에 작성한 포토리뷰 화면을 캡처해주세요.",
  },
];

// localStorage 키
const CUSTOM_PRESETS_KEY = "qanda_custom_step_presets";

// 커스텀 프리셋 조회
export function getCustomPresets(): StepPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// 커스텀 프리셋 저장
export function saveCustomPreset(preset: Omit<StepPreset, "id" | "isCustom">): StepPreset {
  const customPresets = getCustomPresets();
  const newPreset: StepPreset = {
    id: `custom_${Date.now()}`,
    title: preset.title,
    description: preset.description,
    isCustom: true,
  };
  customPresets.push(newPreset);
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customPresets));
  return newPreset;
}

// 커스텀 프리셋 삭제
export function deleteCustomPreset(id: string): void {
  const customPresets = getCustomPresets();
  const filtered = customPresets.filter((p) => p.id !== id);
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(filtered));
}

// 모든 프리셋 조회 (기본 + 커스텀)
export function getAllPresets(): StepPreset[] {
  return [...DEFAULT_STEP_PRESETS, ...getCustomPresets()];
}
