// 챌린지 타입 정의

export interface Challenge {
  id: string;
  platform: string;
  title: string;
  option: string;
  purchaseDeadline: string; // 구매 인증 기한 (ISO datetime)
  reviewDeadline: string; // 리뷰 인증 기한 (ISO datetime)
  originalPrice: number;
  paybackRate: number;
  paybackAmount: number;
  finalPrice: number;
  productImage: string;
  productLink: string;
  detailImages: string[];
  status: "draft" | "published" | "deleted";
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  challengeId: string;
  order: number;
  title: string;
  steps: string[];
  note: string | null;
  exampleImage: string | null;
}

export interface ChallengeWithMissions extends Challenge {
  missions: Mission[];
}

// 폼 입력용 타입
export interface ChallengeInput {
  platform: string;
  title: string;
  option: string;
  purchaseDeadline: string; // 구매 인증 기한 (ISO datetime)
  reviewDeadline: string; // 리뷰 인증 기한 (ISO datetime)
  originalPrice: number;
  paybackRate: number;
  paybackAmount: number;
  finalPrice: number;
  productImage: string;
  productLink: string;
  detailImages: string[];
  status: "draft" | "published";
}

export interface MissionInput {
  title: string;
  steps: string[];
  note: string | null;
  exampleImage: string | null;
}
