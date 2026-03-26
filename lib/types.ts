// 챌린지 타입 정의

// 미션 스텝 (커스텀 인증 단계)
export interface MissionStep {
  order: number;
  title: string;
  description: string;
  exampleImages: string[]; // 예시 이미지 (여러 개 가능)
  deadline: string; // 종료일 (ISO date 또는 datetime)
  deadlineStart?: string; // 시작일 (ISO date 또는 datetime)
}

export interface Challenge {
  id: string;
  platform: string;
  title: string;
  option: string;
  purchaseDeadline: string; // 구매 인증 기한 (ISO datetime) - 하위 호환용
  reviewDeadline: string; // 리뷰 인증 기한 (ISO datetime) - 하위 호환용
  originalPrice: number;
  paybackRate: number;
  paybackAmount: number;
  finalPrice: number;
  productImage: string;
  productLink: string;
  detailImages: string[];
  missionSteps: MissionStep[]; // 동적 미션 스텝
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
  purchaseDeadline: string; // 구매 인증 기한 (ISO datetime) - 하위 호환용
  reviewDeadline: string; // 리뷰 인증 기한 (ISO datetime) - 하위 호환용
  originalPrice: number;
  paybackRate: number;
  paybackAmount: number;
  finalPrice: number;
  productImage: string;
  productLink: string;
  detailImages: string[];
  missionSteps: MissionStep[]; // 동적 미션 스텝
  status: "draft" | "published";
}

export interface MissionInput {
  title: string;
  steps: string[];
  note: string | null;
  exampleImage: string | null;
}
