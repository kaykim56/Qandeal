"use client";

import { useState, useEffect } from "react";
import { Camera, RefreshCw, X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import Image from "next/image";

export interface Step {
  title: string;
  status: "pending" | "completed";
  imageUrl?: string; // 업로드된 이미지 URL (하위 호환)
  imageUrls?: string[]; // 업로드된 이미지들 (여러 장)
  deadline?: string; // 스텝 기한
  description?: string; // 스텝 설명
  exampleImages?: string[]; // 예시 이미지들 (여러 개 가능)
  canVerify?: boolean; // 인증 가능 여부
  verifyBlockReason?: string; // 인증 불가 사유
}

interface MissionStepsProps {
  steps: Step[];
  paybackAmount: number;
  paybackStatus: "pending" | "reviewing" | "paying" | "completed";
  onVerify: (stepIndex: number) => void;
  onVerifyBlocked?: (reason: string) => void; // 인증 불가 시 호출
  canReplace?: boolean; // 교체 가능 여부 (승인 전 + 기한 내)
  noticeText?: string;
}

export default function MissionSteps({
  steps,
  paybackAmount,
  paybackStatus = "pending",
  onVerify,
  onVerifyBlocked,
  canReplace = true,
  noticeText = "제품 구매 시간을 지켜야 성공으로 처리돼요!",
}: MissionStepsProps) {
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const completedCount = steps.filter((s) => s.status === "completed").length;

  // 클라이언트에서만 카운트다운 시작 (hydration 에러 방지)
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 종료일 포맷: ~M/DD
  const formatStepDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return `~${date.getMonth() + 1}/${date.getDate()}`;
  };

  // D-1(24시간 이내)일 때만 시간 표시, 그 외에는 null 반환
  const formatCountdown = (deadline: string): string | null => {
    if (!now) return null;
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return "마감";
    if (diff > 24 * 60 * 60 * 1000) return null; // 24시간 넘으면 표시 안 함
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  // 환급 예정일: 마지막 스텝 종료일 + 14일 → ~M/DD
  const getPaybackDate = () => {
    const lastDeadline = steps[steps.length - 1]?.deadline;
    if (!lastDeadline) return "";
    const date = new Date(lastDeadline);
    date.setDate(date.getDate() + 14);
    return `~${date.getMonth() + 1}/${date.getDate()}`;
  };
  const currentStepIndex = steps.findIndex((s) => s.status === "pending");

  // 현재 미리보기 중인 스텝의 이미지 배열
  const getStepImages = (step: Step): string[] => {
    if (step.imageUrls && step.imageUrls.length > 0) {
      return step.imageUrls;
    }
    if (step.imageUrl) {
      return [step.imageUrl];
    }
    return [];
  };

  // 스텝이 4개 이상이면 그리드 레이아웃 사용
  const useGridLayout = steps.length >= 4;
  // 그리드 열 개수: 스텝+환급 합쳐서 3열 또는 4열
  const totalItems = steps.length + 1; // 환급 포함
  const gridCols = totalItems <= 4 ? 4 : totalItems <= 6 ? 3 : 4;

  return (
    <div className="bg-white rounded-xl p-4">
      <style jsx>{`
        .hologram-text {
          background: linear-gradient(
            90deg,
            #ff6600 0%,
            #e040fb 20%,
            #536dfe 40%,
            #00bcd4 60%,
            #76ff03 80%,
            #ff6600 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: hologram-shift 3s linear infinite;
        }
        @keyframes hologram-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* 타이틀 행 */}
      <div className="flex">
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrentStep = index === currentStepIndex;
          return (
            <div key={index} className="flex-1 text-center">
              <p
                className={`text-xs font-medium ${
                  isCompleted ? "text-gray-900" : isCurrentStep ? "text-gray-900" : "text-gray-400"
                }`}
                style={{ fontFamily: "'Jua', sans-serif" }}
              >
                {step.title}
              </p>
            </div>
          );
        })}
        <div className="flex-1 text-center">
          <p
            className="text-xs font-bold hologram-text"
            style={{ fontFamily: "'Jua', sans-serif" }}
          >
            쿠폰 페이백
          </p>
        </div>
      </div>

      {/* 진행바 */}
      <div className="my-3 mx-2">
        <div className="relative h-2 bg-gray-200 rounded-full">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: "#ff6600",
              width: `${(completedCount / (steps.length + 1)) * 100}%`,
            }}
          />
          {/* 앱 아이콘 - 진행바 끝에 위치 */}
          {completedCount > 0 && (
            <div
              className="absolute transition-all duration-500"
              style={{
                left: `${(completedCount / (steps.length + 1)) * 100}%`,
                top: "50%",
                transform: "translate(-6px, -50%)",
              }}
            >
              <img
                src="/qandeal-icon.png"
                alt=""
                className="w-9 h-9 rounded-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* 뱃지 행 */}
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCurrentStep = index === currentStepIndex;
          const isCompleted = step.status === "completed";
          return (
            <div key={index} className="flex-1 flex justify-center">
              {isCompleted ? (
                <button
                  onClick={() => {
                    const images = getStepImages(step);
                    if (images.length > 0) {
                      setPreviewImageIndex(0);
                      setPreviewStep(index);
                    }
                  }}
                  className="px-2 rounded-full text-[10px] font-medium text-white cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-0.5 whitespace-nowrap"
                  style={{ backgroundColor: "#ff6600", fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}
                >
                  완료
                  {getStepImages(step).length > 1 && (
                    <span className="flex items-center">
                      <Images className="w-2.5 h-2.5" />
                      <span className="ml-0.5">{getStepImages(step).length}</span>
                    </span>
                  )}
                </button>
              ) : isCurrentStep ? (
                step.canVerify === false ? (
                  <button
                    onClick={() => {
                      if (step.verifyBlockReason && onVerifyBlocked) {
                        onVerifyBlocked(step.verifyBlockReason);
                      }
                    }}
                    className="px-2 rounded-full text-[10px] font-medium text-gray-400 flex items-center gap-0.5 cursor-not-allowed whitespace-nowrap"
                    style={{ backgroundColor: "#e5e7eb", fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}
                  >
                    <Camera className="w-3 h-3" />
                    인증
                  </button>
                ) : (
                  <button
                    onClick={() => onVerify(index)}
                    className="px-2 rounded-full text-[10px] font-medium text-white flex items-center gap-0.5 hover:opacity-90 transition-opacity whitespace-nowrap"
                    style={{ backgroundColor: "#ff6600", fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}
                  >
                    <Camera className="w-3 h-3" />
                    인증
                  </button>
                )
              ) : (
                <span className="px-2 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400 whitespace-nowrap" style={{ fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}>
                  대기
                </span>
              )}
            </div>
          );
        })}

        {/* 환급 뱃지 */}
        <div className="flex-1 flex justify-center">
          {paybackStatus === "completed" ? (
            <span
              className="px-2 rounded-full text-[10px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: "#ff6600", fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}
            >
              환급완료
            </span>
          ) : paybackStatus === "paying" ? (
            <span
              className="px-2 rounded-full text-[10px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: "#ff6600", fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}
            >
              환급중
            </span>
          ) : paybackStatus === "reviewing" ? (
            <span
              className="px-2 rounded-full text-[10px] font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: "#ff6600", fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}
            >
              검토중
            </span>
          ) : (
            <span className="px-2 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400 whitespace-nowrap" style={{ fontFamily: "'Jua', sans-serif", paddingTop: "5px", paddingBottom: "3px" }}>
              대기
            </span>
          )}
        </div>
      </div>

      {/* 종료일 행 - 별도 행으로 분리하여 줄 맞춤 */}
      <div className="flex mt-1.5">
        {steps.map((step, index) => {
          const isCurrentStep = index === currentStepIndex;
          const isCompleted = step.status === "completed";
          const countdown = step.deadline ? formatCountdown(step.deadline) : null;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isCompleted ? "#ff6600" : isCurrentStep ? "#ff6600" : "#9ca3af",
                  fontFamily: "'Jua', sans-serif",
                }}
              >
                {step.deadline ? formatStepDeadline(step.deadline) : ""}
              </span>
              {!isCompleted && countdown && (
                <span
                  className="text-[9px] font-medium"
                  style={{
                    color: isCurrentStep ? "#ff6600" : "#9ca3af",
                    fontFamily: "'Jua', sans-serif",
                  }}
                >
                  {countdown}
                </span>
              )}
            </div>
          );
        })}

        {/* 환급 예정일 */}
        <div className="flex-1 flex flex-col items-center">
          <span
            className="text-[10px] font-medium"
            style={{
              color: paybackStatus === "pending" ? "#9ca3af" : "#ff6600",
              fontFamily: "'Jua', sans-serif",
            }}
          >
            {getPaybackDate()}
          </span>
        </div>
      </div>

      {/* 하단 안내 문구 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5">
        <span style={{ color: "#ff6600" }}>✓</span>
        <p className="text-sm" style={{ color: "#ff6600" }}>
          {noticeText}
        </p>
      </div>

      {/* 이미지 미리보기 모달 */}
      {previewStep !== null && getStepImages(steps[previewStep]).length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewStep(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full overflow-hidden max-h-[90vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 - 모달 우상단 고정 */}
            <button
              onClick={() => setPreviewStep(null)}
              className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 rounded-full hover:bg-black/70"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* 스크롤 가능한 컨텐츠 영역 */}
            <div className="overflow-y-auto flex-1">
              {/* 헤더 - 스텝 제목과 설명 */}
              <div className="px-3 pt-3 pb-2 pr-12 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {steps[previewStep].title.replace(/\n/g, " ")}
                </h3>
                {steps[previewStep].description && (
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                    {steps[previewStep].description}
                  </p>
                )}
              </div>

              {/* 예시 이미지 */}
              {steps[previewStep].exampleImages && steps[previewStep].exampleImages!.length > 0 && (
                <div className="px-3 py-2 bg-orange-50 border-b border-orange-100">
                  <p className="text-xs font-medium text-orange-600 mb-1.5 text-center">예시 이미지</p>
                  <div className="flex flex-col items-center gap-2">
                    {steps[previewStep].exampleImages!.map((img, idx) => (
                      <Image
                        key={idx}
                        src={img}
                        alt={`예시 ${idx + 1}`}
                        width={280}
                        height={400}
                        className="rounded-lg border border-orange-200"
                        style={{ width: "auto", height: "auto", maxWidth: "280px" }}
                        loading="lazy"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 내가 올린 인증 이미지 */}
              <div className="px-3 pt-2">
                <p className="text-xs font-medium text-gray-500 mb-1.5 text-center">내가 올린 인증 사진</p>
              </div>
              {/* 이미지 */}
              <div className="relative">
              {(() => {
                const images = getStepImages(steps[previewStep]);
                const currentImage = images[previewImageIndex] || images[0];
                return (
                  <>
                    <div className="relative w-full max-h-[35vh] bg-gray-100 flex items-center justify-center">
                      <Image
                        src={currentImage}
                        alt={`인증 이미지 ${previewImageIndex + 1}`}
                        width={400}
                        height={600}
                        className="object-contain max-h-[35vh]"
                        style={{ width: "auto", height: "auto", maxHeight: "35vh" }}
                      />
                    </div>

                    {/* 이미지 개수 표시 */}
                    {images.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full">
                        <span className="text-white text-sm">
                          {previewImageIndex + 1} / {images.length}
                        </span>
                      </div>
                    )}

                    {/* 이전 버튼 */}
                    {images.length > 1 && previewImageIndex > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageIndex((prev) => prev - 1);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                    )}

                    {/* 다음 버튼 */}
                    {images.length > 1 && previewImageIndex < images.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageIndex((prev) => prev + 1);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* 썸네일 (2장 이상일 때) */}
            {getStepImages(steps[previewStep]).length > 1 && (
              <div className="px-3 py-2">
                <div className="flex gap-2 justify-center">
                  {getStepImages(steps[previewStep]).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPreviewImageIndex(idx)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-colors ${
                        idx === previewImageIndex ? "border-orange-500" : "border-gray-200"
                      }`}
                    >
                      <Image src={img} alt={`썸네일 ${idx + 1}`} width={40} height={40} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            </div>
            {/* 스크롤 영역 끝 */}

            {/* 하단 버튼 - 고정 */}
            <div className="px-3 py-3 border-t border-gray-100 flex-shrink-0">
              {canReplace ? (
                <button
                  onClick={() => {
                    setPreviewStep(null);
                    onVerify(previewStep);
                  }}
                  className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#ff6600" }}
                >
                  <RefreshCw className="w-4 h-4" />
                  사진 추가/교체하기
                </button>
              ) : (
                <p className="text-center text-sm text-gray-500">
                  인증 기한이 지나 교체할 수 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
