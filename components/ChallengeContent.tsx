"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { Info, Clock, Check, ChevronUp } from "lucide-react";
import MissionSteps, { Step } from "./MissionSteps";
import VerifyUploadModal from "./VerifyUploadModal";
import PhoneVerificationModal from "./PhoneVerificationModal";
import PhoneCheckModal from "./PhoneCheckModal";
import Link from "next/link";
import { Participation } from "@/lib/db/participations";
import { MissionStep } from "@/lib/types";
import { useQandaUser } from "./QandaUserProvider";
import { trackEvent } from "./MixpanelProvider";

interface ChallengeContentProps {
  challenge: {
    id: string;
    shortId?: string;
    platform: string;
    title: string;
    option: string;
    purchaseDeadline: string; // 구매 인증 기한 (하위 호환용)
    reviewDeadline: string; // 리뷰 인증 기한 (하위 호환용)
    originalPrice: number;
    paybackRate: number;
    paybackAmount: number;
    finalPrice: number;
    productLink: string;
    detailImages: string[];
    missionSteps?: MissionStep[]; // 동적 미션 스텝
  };
}

// 날짜 포맷팅 헬퍼 함수
function formatDeadline(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayName = dayNames[date.getDay()];
    return `${month}/${day}(${dayName})`;
  } catch {
    return "";
  }
}

// 스텝별 인증 가능 여부 판단 함수
interface CanVerifyResult {
  canVerify: boolean;
  reason?: string;
}

function canVerifyStep(step: { title: string; deadline?: string }): CanVerifyResult {
  if (!step.deadline) {
    return { canVerify: true };
  }

  const now = new Date();
  const deadline = new Date(step.deadline);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

  // 리뷰 인증인지 확인 (title에 "리뷰" 포함)
  const isReviewStep = step.title.includes("리뷰");

  if (isReviewStep) {
    // 리뷰: deadline 날짜까지 가능
    if (today > deadlineDate) {
      return { canVerify: false, reason: "인증 기한이 지났습니다" };
    }
  } else {
    // 일반 스텝 (구매 인증 등): 당일에만 가능
    if (today < deadlineDate) {
      return { canVerify: false, reason: `${formatDeadline(step.deadline)} 당일에 인증 가능합니다` };
    }
    if (today > deadlineDate) {
      return { canVerify: false, reason: "인증 기한이 지났습니다" };
    }
  }

  return { canVerify: true };
}

// 번호 목록을 파싱하여 렌더링하는 컴포넌트
function FormattedDescription({ text }: { text: string }) {
  const lines = text.split("\n");
  const numberedPattern = /^(\d+)\.\s+(.+)$/;

  // 모든 줄이 번호로 시작하는지 확인
  const allNumbered = lines.every(line => line.trim() === "" || numberedPattern.test(line.trim()));

  if (allNumbered && lines.some(line => numberedPattern.test(line.trim()))) {
    const items = lines
      .filter(line => numberedPattern.test(line.trim()))
      .map(line => {
        const match = line.trim().match(numberedPattern);
        return match ? match[2] : line;
      });

    return (
      <div className="text-sm text-gray-500 space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex">
            <span className="flex-shrink-0 w-5">{idx + 1}.</span>
            <span className="flex-1">{item}</span>
          </div>
        ))}
      </div>
    );
  }

  // 번호 목록이 아니면 기존처럼 줄바꿈만 적용
  return <p className="text-sm text-gray-500 whitespace-pre-line">{text}</p>;
}

export default function ChallengeContent({ challenge }: ChallengeContentProps) {
  const { user: qandaUser, isQandaUser } = useQandaUser();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  // Supabase 세션에서 어드민 이메일 확인
  useEffect(() => {
    const checkAdminSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setAdminEmail(session.user.email);
      }
    };
    checkAdminSession();
  }, [supabase.auth]);

  // 콴다 유저 디버깅 로그
  useEffect(() => {
    console.log("[Challenge] Cookies:", document.cookie);
    console.log("[Challenge] isQandaUser:", isQandaUser);
    console.log("[Challenge] qandaUserId:", qandaUser?.userId);

    // 서버에서 받은 헤더 확인
    fetch("/api/debug-headers")
      .then((res) => res.json())
      .then((data) => {
        console.log("[Challenge] Server Headers:", JSON.stringify(data.headers, null, 2));
        console.log("[Challenge] Server Cookies:", JSON.stringify(data.cookies, null, 2));
      })
      .catch((err) => console.error("[Challenge] Debug fetch error:", err));
  }, [isQandaUser, qandaUser]);

  // Mixpanel - challenge_view 이벤트 (페이지 진입 시 1회)
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (!hasTrackedView.current) {
      trackEvent("challenge_view", {
        challenge_id: challenge.id,
        challenge_title: challenge.title,
        challenge_short_id: challenge.shortId || null,
      });
      hasTrackedView.current = true;
    }
  }, [challenge.id, challenge.title, challenge.shortId]);
  const [hasParticipated, setHasParticipated] = useState(false);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPhoneVerificationOpen, setIsPhoneVerificationOpen] = useState(false);
  const [currentVerifyStep, setCurrentVerifyStep] = useState<number | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [resetClickCount, setResetClickCount] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPaybackTooltip, setShowPaybackTooltip] = useState(false);
  const [showFinalPriceTooltip, setShowFinalPriceTooltip] = useState(false);
  const [verifyBlockToast, setVerifyBlockToast] = useState<string | null>(null);

  // 전화번호 확인 모달 (JWT userId 없는 경우)
  const [showPhoneCheck, setShowPhoneCheck] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  // 툴팁 자동 닫기 (5초)
  useEffect(() => {
    if (showPaybackTooltip) {
      const timer = setTimeout(() => setShowPaybackTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showPaybackTooltip]);

  useEffect(() => {
    if (showFinalPriceTooltip) {
      const timer = setTimeout(() => setShowFinalPriceTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showFinalPriceTooltip]);

  // 인증 불가 토스트 자동 닫기 (5초)
  useEffect(() => {
    if (verifyBlockToast) {
      const timer = setTimeout(() => setVerifyBlockToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [verifyBlockToast]);

  // 스크롤 위치 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 맨 위로 스크롤
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 동적 미션 스텝 (missionSteps가 있으면 사용, 없으면 기본 2개)
  const missionSteps = challenge.missionSteps?.length
    ? challenge.missionSteps
    : [
        {
          order: 1,
          title: "구매 인증하기",
          description: "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처하여 인증해주세요.",
          exampleImages: [],
          deadline: challenge.purchaseDeadline,
        },
        {
          order: 2,
          title: "리뷰 인증하기",
          description: "제품을 개봉하여 사용/섭취한 사진이 포함된 포토리뷰를 캡처하여 인증해주세요.",
          exampleImages: [],
          deadline: challenge.reviewDeadline,
        },
      ];

  // UI용 스텝 상태
  const [steps, setSteps] = useState<Step[]>(
    missionSteps.map((ms) => {
      const verifyResult = canVerifyStep(ms);
      return {
        title: ms.title.replace(/ /g, "\n"), // 공백을 줄바꿈으로
        status: "pending" as const,
        imageUrl: undefined,
        imageUrls: [],
        deadline: ms.deadline,
        description: ms.description,
        exampleImages: ms.exampleImages || [],
        canVerify: verifyResult.canVerify,
        verifyBlockReason: verifyResult.reason,
      };
    })
  );
  const [paybackStatus, setPaybackStatus] = useState<"pending" | "reviewing" | "paying" | "completed">("pending");
  const [participationStatus, setParticipationStatus] = useState<"pending" | "approved" | "rejected">("pending");

  // 기한 체크: 마지막 스텝의 기한을 기준으로
  const now = new Date();
  const lastStepDeadline = missionSteps[missionSteps.length - 1]?.deadline;
  const isLastDeadlinePassed = lastStepDeadline ? now > new Date(lastStepDeadline) : false;

  // 교체 가능 조건: 승인/거절 전 AND 마지막 기한 내
  const canReplace = participationStatus === "pending" && !isLastDeadlinePassed;

  // 테스터 여부 확인 (Supabase에 로그인된 어드민 이메일로 체크)
  const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "").split(",");
  const isTester = adminEmail && allowedEmails.includes(adminEmail);

  // userId: Qanda 앱 쿠키 → localStorage 폴백 → guest ID
  const userId = qandaUser?.userId
    || (typeof window !== "undefined" ? localStorage.getItem("userId") : null)
    || `guest_${Date.now()}`;

  // localStorage 폴백용 ID 저장 (qandaUser가 없는 경우에만)
  if (typeof window !== "undefined" && !qandaUser?.userId && !localStorage.getItem("userId")) {
    localStorage.setItem("userId", userId);
  }

  // JWT userId가 없고, 저장된 전화번호도 없으면 블러 + 모달 표시
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedPhone = localStorage.getItem("verifiedPhone");
    if (savedPhone) {
      setVerifiedPhone(savedPhone);
    }

    // JWT userId가 없고, 저장된 전화번호도 없으면 블러 처리
    if (!qandaUser?.userId && !savedPhone) {
      setIsBlurred(true);
      setShowPhoneCheck(true);
    }
  }, [qandaUser]);

  // 참여 상태 복원 헬퍼 함수
  const restoreParticipationState = (p: Participation) => {
    setParticipationId(p.id);
    setHasParticipated(true);
    setParticipationStatus(p.status);

    // 스텝 상태 복원 (동적 스텝 지원 + 여러 이미지)
    const newSteps: Step[] = missionSteps.map((ms) => {
      const verifyResult = canVerifyStep(ms);
      return {
        title: ms.title.replace(/ /g, "\n"),
        status: "pending" as const,
        imageUrl: undefined,
        imageUrls: [],
        deadline: ms.deadline,
        description: ms.description,
        exampleImages: ms.exampleImages || [],
        canVerify: verifyResult.canVerify,
        verifyBlockReason: verifyResult.reason,
      };
    });

    // 새로운 images 배열이 있으면 사용, 없으면 기존 방식
    if (p.images && p.images.length > 0) {
      const imagesByStep: { [key: number]: string[] } = {};
      p.images.forEach((img) => {
        const stepIndex = img.stepOrder - 1;
        if (!imagesByStep[stepIndex]) {
          imagesByStep[stepIndex] = [];
        }
        imagesByStep[stepIndex].push(img.imageUrl);
      });

      Object.entries(imagesByStep).forEach(([stepIndexStr, urls]) => {
        const stepIndex = parseInt(stepIndexStr, 10);
        if (stepIndex >= 0 && stepIndex < newSteps.length) {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            status: "completed",
            imageUrl: urls[0],
            imageUrls: urls,
          };
        }
      });
    } else {
      if (p.purchaseImageUrl) {
        newSteps[0] = { ...newSteps[0], status: "completed", imageUrl: p.purchaseImageUrl, imageUrls: [p.purchaseImageUrl] };
      }
      if (p.reviewImageUrl) {
        newSteps[1] = { ...newSteps[1], status: "completed", imageUrl: p.reviewImageUrl, imageUrls: [p.reviewImageUrl] };
      }
    }
    setSteps(newSteps);

    // 페이백 상태 결정
    if (p.status === "approved") {
      setPaybackStatus("paying");
    } else if (newSteps.every((s) => s.status === "completed")) {
      setPaybackStatus("reviewing");
    }
  };

  // 전화번호 확인 후 참여 상태 복원 (PhoneCheckModal에서 호출)
  const handlePhoneConfirmed = (phoneNumber: string, participation: Participation | null) => {
    // 전화번호 저장
    localStorage.setItem("verifiedPhone", phoneNumber);
    setVerifiedPhone(phoneNumber);

    // 블러 해제 및 모달 닫기
    setIsBlurred(false);
    setShowPhoneCheck(false);

    if (participation) {
      restoreParticipationState(participation);
    }
  };

  // 기존 참여 정보 불러오기
  useEffect(() => {
    const fetchParticipation = async () => {
      try {
        // 1. 먼저 userId로 조회
        const res = await fetch(
          `/api/participations?challengeId=${challenge.id}&userId=${userId}`
        );
        const data = await res.json();

        if (data.participation) {
          restoreParticipationState(data.participation);
          return;
        }

        // 2. userId로 못 찾으면 localStorage의 verifiedPhone으로 조회
        const savedPhone = localStorage.getItem("verifiedPhone");
        if (savedPhone) {
          const phoneRes = await fetch(
            `/api/participations?challengeId=${challenge.id}&phoneNumber=${savedPhone}`
          );
          const phoneData = await phoneRes.json();

          if (phoneData.participation) {
            restoreParticipationState(phoneData.participation);
          }
        }
      } catch (error) {
        console.error("Failed to fetch participation:", error);
      }
    };

    if (typeof window !== "undefined") {
      fetchParticipation();
    }
  }, [challenge.id, userId]);

  // 참가하기 버튼 클릭 → 전화번호 인증 모달 열기
  const handleParticipate = () => {
    trackEvent("participate_start", {
      challenge_id: challenge.id,
      challenge_title: challenge.title,
    });
    setIsPhoneVerificationOpen(true);
  };

  // 전화번호 인증 완료 후 참가 처리
  const handlePhoneVerified = async (phoneNumber: string, verificationToken: string) => {
    setIsPhoneVerificationOpen(false);

    // 즉시 성공 상태로 전환 (옵티미스틱 UI)
    setHasParticipated(true);
    setShowSuccessToast(true);

    // 백그라운드에서 참가 등록
    try {
      const res = await fetch("/api/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          userId,
          testerEmail: adminEmail || undefined,
          phoneNumber,
          verificationToken,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setParticipationId(data.participationId);
      } else {
        // 실패 시 롤백
        console.error("참가 등록 실패:", data.error);
        setHasParticipated(false);
        setShowSuccessToast(false);
        alert(data.error || "참가 중 오류가 발생했습니다");
      }
    } catch (error) {
      // 실패 시 롤백
      console.error("Failed to participate:", error);
      setHasParticipated(false);
      setShowSuccessToast(false);
      alert("참가 중 오류가 발생했습니다");
    }
  };

  const handleVerify = (stepIndex: number) => {
    // 업로드 모달 열기
    setCurrentVerifyStep(stepIndex);
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = (uploadedImageUrls: string[]) => {
    if (currentVerifyStep === null) return;

    // 스텝 완료 처리 + 이미지 URL 저장
    const newSteps = [...steps];
    const existingUrls = newSteps[currentVerifyStep].imageUrls || [];
    const allUrls = [...existingUrls, ...uploadedImageUrls];

    newSteps[currentVerifyStep].status = "completed";
    newSteps[currentVerifyStep].imageUrl = allUrls[0]; // 하위 호환
    newSteps[currentVerifyStep].imageUrls = allUrls;
    setSteps(newSteps);

    // 모든 스텝 완료시 검토중으로 변경
    if (newSteps.every((s) => s.status === "completed")) {
      setPaybackStatus("reviewing");

      // Mixpanel - participate_complete 이벤트
      trackEvent("participate_complete", {
        challenge_id: challenge.id,
        challenge_title: challenge.title,
      });
    }

    setCurrentVerifyStep(null);
  };

  // 이미지 삭제 핸들러 (soft delete)
  const handleDeleteImage = async (stepIndex: number, imageIndex: number) => {
    if (!participationId) return;

    const stepOrder = stepIndex + 1;
    const imageOrder = imageIndex + 1;

    const res = await fetch("/api/verify/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participationId,
        stepOrder,
        imageOrder,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "이미지 삭제에 실패했습니다");
    }

    // 로컬 상태 업데이트
    const newSteps = [...steps];
    const currentImages = newSteps[stepIndex].imageUrls || [];
    const newImages = currentImages.filter((_, idx) => idx !== imageIndex);

    if (newImages.length === 0) {
      // 이미지가 없으면 스텝을 pending으로 변경
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        status: "pending",
        imageUrl: undefined,
        imageUrls: [],
      };
      // 페이백 상태도 업데이트
      if (paybackStatus === "reviewing") {
        setPaybackStatus("pending");
      }
    } else {
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        imageUrl: newImages[0],
        imageUrls: newImages,
      };
    }

    setSteps(newSteps);
  };

  // 테스터 참여 기록 초기화
  const handleResetParticipation = async () => {
    if (!confirm("참여 기록을 초기화하시겠습니까?")) return;

    try {
      const res = await fetch(
        `/api/participations?challengeId=${challenge.id}&userId=${userId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        // 상태 초기화
        setHasParticipated(false);
        setParticipationId(null);
        setSteps(
          missionSteps.map((ms) => {
            const verifyResult = canVerifyStep(ms);
            return {
              title: ms.title.replace(/ /g, "\n"),
              status: "pending" as const,
              imageUrl: undefined,
              imageUrls: [],
              deadline: ms.deadline,
              description: ms.description,
              exampleImages: ms.exampleImages || [],
              canVerify: verifyResult.canVerify,
              verifyBlockReason: verifyResult.reason,
            };
          })
        );
        setPaybackStatus("pending");
        setParticipationStatus("pending");
      } else {
        alert("초기화에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to reset participation:", error);
      alert("초기화에 실패했습니다");
    }
  };

  const getNoticeText = () => {
    if (paybackStatus === "completed") return "환급이 완료되었습니다!";
    if (paybackStatus === "paying") return "환급이 진행 중입니다!";
    if (paybackStatus === "reviewing") return "검토 완료 후 환급이 진행됩니다!";
    return "제품 구매 시간을 지켜야 성공으로 처리돼요!";
  };

  return (
    <>
      {/* 블러 처리 래퍼 */}
      <div className={isBlurred ? "blur-sm pointer-events-none select-none" : ""}>
      {/* 제품 정보 카드 */}
      <section className="bg-white px-4 py-5 border-b border-gray-100">
        {/* 플랫폼 태그 */}
        <span
          className={`inline-block px-2.5 py-1 text-xs font-medium rounded mb-3 ${
            challenge.platform?.includes("스마트스토어")
              ? "bg-[#03C75A] text-white"
              : challenge.platform?.includes("쿠팡")
              ? "bg-blue-500 text-white"
              : challenge.platform?.includes("카카오")
              ? "bg-yellow-400 text-yellow-900"
              : challenge.platform?.includes("올리브영")
              ? "bg-green-600 text-white"
              : ""
          }`}
          style={
            !challenge.platform?.includes("스마트스토어") &&
            !challenge.platform?.includes("쿠팡") &&
            !challenge.platform?.includes("카카오") &&
            !challenge.platform?.includes("올리브영")
              ? { backgroundColor: "#fff4e5", color: "#cc4400" }
              : undefined
          }
        >
          {challenge.platform}
        </span>

        <h1 className="text-lg font-bold text-gray-900 mb-2">{challenge.title}</h1>

        <p className="text-sm text-gray-500 mb-4">
          {challenge.option ? (
            <>
              <span className="inline-block px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded mr-1.5">옵션 지정</span>
              {challenge.option}
            </>
          ) : "모든 옵션이 페이백 대상입니다"}
        </p>

        {/* 카카오 선물하기 안내 */}
        {challenge.platform === "카카오 선물하기" && (
          <div className="px-3 py-2.5 rounded-lg mb-4 bg-gray-100">
            <p className="text-sm font-medium text-gray-700">
              &apos;나에게 선물&apos;로만 참여가 가능합니다.
            </p>
          </div>
        )}

        {/* 참여 전: 가격 정보 테이블 / 참여 후: 미션 스텝 */}
        {hasParticipated ? (
          <MissionSteps
            steps={steps}
            paybackAmount={challenge.paybackAmount}
            paybackStatus={paybackStatus}
            onVerify={handleVerify}
            onVerifyBlocked={(reason) => setVerifyBlockToast(reason)}
            canReplace={canReplace}
            noticeText={getNoticeText()}
          />
        ) : (
          <>
            {/* 구매 시간 강조 */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-lg mb-3"
              style={{ backgroundColor: "#ffdfb8" }}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: "#cc4400" }} />
                <span className="font-bold" style={{ color: "#cc4400" }}>구매 시간</span>
              </div>
              <span className="font-bold text-lg" style={{ color: "#cc4400" }}>
                {formatDeadline(missionSteps[0]?.deadline || challenge.purchaseDeadline)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3 text-center">
              ⚠️ 위 날짜에 구매하고, 당일 인증해야 페이백을 받을 수 있어요!
            </p>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">구매가</span>
              <span className="text-sm text-gray-900">
                {challenge.originalPrice.toLocaleString()}원
              </span>
            </div>

            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                페이백
                <span className="relative">
                  <button
                    onClick={() => {
                      setShowFinalPriceTooltip(false);
                      setShowPaybackTooltip(!showPaybackTooltip);
                    }}
                    className="focus:outline-none"
                  >
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {showPaybackTooltip && (
                    <div className="absolute left-0 bottom-full z-10 mb-2 whitespace-nowrap px-4 py-2.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg text-center">
                      <div className="absolute -bottom-[6px] left-3 w-3 h-3 bg-gray-800 rotate-45" />
                      <span className="relative z-10">모든 인증 완료 시 환급드리는 금액입니다.</span>
                    </div>
                  )}
                </span>
              </span>
              <span className="text-sm">
                <span style={{ color: "#ff6600" }} className="font-semibold mr-1">
                  {challenge.paybackRate}%
                </span>
                <span style={{ color: "#ff6600" }} className="font-semibold">
                  {challenge.paybackAmount.toLocaleString()}원
                </span>
              </span>
            </div>

            <div
              className="flex justify-between items-center px-4 py-3"
              style={{ backgroundColor: "#fff4e5" }}
            >
              <span className="text-sm flex items-center gap-1" style={{ color: "#cc4400" }}>
                실구매가
                <span className="relative">
                  <button
                    onClick={() => {
                      setShowPaybackTooltip(false);
                      setShowFinalPriceTooltip(!showFinalPriceTooltip);
                    }}
                    className="focus:outline-none"
                  >
                    <Info className="w-3.5 h-3.5" style={{ color: "#cc4400" }} />
                  </button>
                  {showFinalPriceTooltip && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 z-10 ml-2 whitespace-nowrap px-4 py-2.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
                      <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-800 rotate-45" />
                      <span className="relative z-10">환급 후 구매자의 실제 지출 금액입니다.</span>
                    </div>
                  )}
                </span>
              </span>
              <span className="text-base font-bold text-gray-900">
                {challenge.finalPrice.toLocaleString()}원
              </span>
            </div>
            </div>
          </>
        )}
      </section>

      {/* 네이버페이 쿠폰 카드 - 항상 표시 */}
      <section className="mt-2 bg-white px-4 py-6">
        {/* 강조 문구 */}
        <p className="text-center text-gray-800 font-medium mb-5">
          {hasParticipated ? (
            <>
              인증 완료 시{" "}
              <span style={{ color: "#ff6600" }} className="font-bold">
                {challenge.paybackAmount.toLocaleString()}원
              </span>
              을 돌려드려요!
            </>
          ) : (
            <>
              제품 구매 후 리뷰 인증하면{" "}
              <span style={{ color: "#ff6600" }} className="font-bold">
                {challenge.paybackRate}%
              </span>
              를 돌려드려요!
            </>
          )}
        </p>

        {/* 네이버페이 쿠폰 카드 */}
          <div className="flex items-center justify-center mb-6">
            <div
              className="relative overflow-hidden"
              style={{
                width: "100%",
                maxWidth: "340px",
                height: "200px",
                borderRadius: "24px",
                background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 50%, #0f0f0f 100%)",
              }}
            >
              {/* 상단 - 콴다 페이백 */}
              <div className="absolute top-4 left-0 right-0 flex justify-center">
                <div
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: "#ffdfb8",
                    borderRadius: "24px",
                    padding: "6px 14px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#cc4400",
                  }}
                >
                  <img
                    src="/logo-qanda.png"
                    alt="콴다"
                    style={{ height: "18px" }}
                  />
                  <span>콴다에서 드리는 페이백</span>
                </div>
              </div>

              {/* 네이버페이 로고 (중앙) */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ marginTop: "-8px" }}
              >
                <img
                  src="/logo_naverpay.svg"
                  alt="네이버페이"
                  style={{ height: "48px" }}
                />
              </div>

              {/* 하단 영역 */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex justify-between items-end">
                {/* 좌하단 텍스트 */}
                <div className="flex flex-col">
                  <span style={{ color: "#808080", fontSize: "16px", fontWeight: "600" }}>
                    네이버페이
                  </span>
                  <span style={{ color: "#808080", fontSize: "16px", fontWeight: "600" }}>
                    포인트 쿠폰
                  </span>
                </div>

                {/* 우하단 금액 */}
                <span className="text-white font-bold" style={{ fontSize: "32px" }}>
                  {challenge.paybackAmount.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
      </section>

      {/* 페이백 받는 방법 - 참여 전에만 표시 */}
      {!hasParticipated && (
        <section className="bg-white px-4 pb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">페이백은 어떻게 받나요?</h3>

          <div className="space-y-4">
            {/* 참가하기 (항상 첫 번째) */}
            <div className="flex gap-3">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: "#ff6600" }}
              >
                1
              </span>
              <div>
                <p className="font-medium text-gray-900 mb-1">참가하기</p>
                <p className="text-sm text-gray-500">하단의 참가하기 버튼을 눌러 챌린지에 참가</p>
              </div>
            </div>

            {/* 동적 미션 스텝들 */}
            {missionSteps.map((step, index) => (
              <div key={index}>
                <div className="flex gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: "#ff6600" }}
                  >
                    {index + 2}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">{step.title}</p>
                      {step.deadline && (
                        <span className="text-xs text-orange-500">
                          {formatDeadline(step.deadline)}
                        </span>
                      )}
                    </div>
                    {step.title.includes("리뷰") && (
                      <div className="mb-3 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-bold text-orange-600">⚠️ 공정위 문구 작성 필수</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText("구매지원금을 받아 직접 구매 후 솔직한/주관적인 생각으로 작성하였습니다.");
                              alert("복사되었습니다!");
                            }}
                            className="px-2.5 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600 transition-colors"
                          >
                            복사
                          </button>
                        </div>
                        <p className="text-sm font-medium text-orange-700 bg-white px-2 py-1.5 rounded border border-orange-200">[구매지원금을 받아 직접 구매 후 솔직한/주관적인 생각으로 작성하였습니다.]</p>
                      </div>
                    )}
                    <FormattedDescription text={step.description} />
                  </div>
                </div>
                {/* 예시 이미지 - 화면 중앙 정렬 */}
                {step.exampleImages && step.exampleImages.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {step.exampleImages.map((img, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={img}
                        alt={`${step.title} 예시 ${imgIdx + 1}`}
                        className="max-w-[320px] rounded-lg border border-gray-200 mx-auto block"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4">※ 모든 인증은 기한 내 업로드 필수</p>
        </section>
      )}

      {/* 상품 상세 이미지 (다중) */}
      {challenge.detailImages && challenge.detailImages.length > 0 && (
        <section className="mt-2 bg-white">
          <div className="px-4 py-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">상품 상세 정보</h3>
            <div className="space-y-2">
              {challenge.detailImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`상품 상세 ${index + 1}`}
                  className="w-full rounded-lg"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 맨 위로 버튼 */}
      {showScrollTop && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 pointer-events-none">
          <button
            onClick={scrollToTop}
            className="absolute right-4 bottom-0 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all hover:shadow-xl active:scale-95 pointer-events-auto"
          >
            <ChevronUp className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      )}
      </div>
      {/* 블러 래퍼 끝 */}

      {/* 하단 고정 CTA */}
      <footer className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 px-4 py-3 z-20 ${isBlurred ? "blur-sm pointer-events-none" : ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🎉</span>
          <p className="text-sm text-gray-700">
            <span className="font-bold" style={{ color: "#ff6600" }}>
              {challenge.paybackAmount.toLocaleString()}원 페이백!
            </span>
            <span className="ml-1 text-gray-500">인증샷 검토 후 받을 수 있어요.</span>
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={challenge.productLink || "#"}
            target="_blank"
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors text-center"
            style={{ backgroundColor: "#3b82f6" }}
          >
            제품 바로가기
          </Link>

          {hasParticipated ? (
            <button
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#9ca3af" }}
              onClick={() => {
                if (!isTester) return;
                const newCount = resetClickCount + 1;
                setResetClickCount(newCount);
                if (newCount >= 5) {
                  setResetClickCount(0);
                  handleResetParticipation();
                }
              }}
            >
              참가 완료
            </button>
          ) : (
            <button
              onClick={handleParticipate}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: "#ff6600" }}
            >
              참가하기
            </button>
          )}
        </div>
      </footer>

      {/* 인증 불가 토스트 */}
      {verifyBlockToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
            {verifyBlockToast}
          </div>
        </div>
      )}

      {/* 신청 완료 팝업 */}
      {showSuccessToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl mx-6 p-6 max-w-[320px] w-full text-center shadow-xl">
            {/* 체크 아이콘 */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#e8f5e9" }}
            >
              <Check className="w-8 h-8" style={{ color: "#22c55e" }} />
            </div>

            {/* 메시지 */}
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              신청이 완료되었어요
            </h3>
            <p className="text-gray-600 mb-4">
              기한 내에 구매를 마치고 인증해주세요.
            </p>

            {/* 카카오 선물하기 안내 */}
            {challenge.platform === "카카오 선물하기" && (
              <div className="px-3 py-2.5 rounded-lg mb-4 bg-gray-100">
                <p className="text-sm font-bold text-gray-700 text-center">
                  &apos;나에게 선물&apos;로만 참여 가능!
                </p>
              </div>
            )}

            {/* 쿠팡 안내 */}
            {challenge.platform === "쿠팡" && (
              <div className="px-3 py-2.5 rounded-lg mb-4 bg-gray-100">
                <p className="text-sm font-medium text-gray-700 text-center">
                  와우회원/일반회원 모두 구매 가능하지만,<br />
                  일반회원일 경우 로켓배송 상품 19,800원 이상<br />
                  구매해야 배송이 가능해요
                </p>
              </div>
            )}

            {/* 확인 버튼 */}
            <button
              onClick={() => setShowSuccessToast(false)}
              className="w-full py-3.5 rounded-xl text-white font-semibold"
              style={{ backgroundColor: "#ff6600" }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      <VerifyUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setCurrentVerifyStep(null);
        }}
        onSuccess={handleUploadSuccess}
        stepType={currentVerifyStep === 0 ? "purchase" : "review"}
        stepOrder={currentVerifyStep !== null ? currentVerifyStep + 1 : 1}
        stepTitle={currentVerifyStep !== null ? missionSteps[currentVerifyStep]?.title : ""}
        stepDescription={currentVerifyStep !== null ? missionSteps[currentVerifyStep]?.description : ""}
        exampleImages={currentVerifyStep !== null ? missionSteps[currentVerifyStep]?.exampleImages || [] : []}
        existingImages={currentVerifyStep !== null ? steps[currentVerifyStep]?.imageUrls || [] : []}
        participationId={participationId || ""}
        challengeId={challenge.id}
        challengeTitle={challenge.title}
      />

      <PhoneVerificationModal
        isOpen={isPhoneVerificationOpen}
        onClose={() => setIsPhoneVerificationOpen(false)}
        onVerified={handlePhoneVerified}
        challengeId={challenge.id}
        challengeTitle={challenge.title}
      />

      <PhoneCheckModal
        isOpen={showPhoneCheck}
        onClose={() => {
          setShowPhoneCheck(false);
          setIsBlurred(false);
        }}
        onPhoneConfirmed={handlePhoneConfirmed}
        challengeId={challenge.id}
      />
    </>
  );
}
