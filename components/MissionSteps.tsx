"use client";

import { useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";

export interface Step {
  title: string;
  status: "pending" | "completed";
  imageUrl?: string; // 업로드된 이미지 URL
  deadline?: string; // 스텝 기한
  description?: string; // 스텝 설명
  exampleImages?: string[]; // 예시 이미지들 (여러 개 가능)
}

interface MissionStepsProps {
  steps: Step[];
  paybackAmount: number;
  paybackStatus: "pending" | "reviewing" | "paying" | "completed";
  onVerify: (stepIndex: number) => void;
  canReplace?: boolean; // 교체 가능 여부 (승인 전 + 기한 내)
  noticeText?: string;
}

export default function MissionSteps({
  steps,
  paybackAmount,
  paybackStatus = "pending",
  onVerify,
  canReplace = true,
  noticeText = "제품 구매 시간을 지켜야 성공으로 처리돼요!",
}: MissionStepsProps) {
  const [previewStep, setPreviewStep] = useState<number | null>(null);
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const currentStepIndex = steps.findIndex((s) => s.status === "pending");

  // 스텝이 4개 이상이면 그리드 레이아웃 사용
  const useGridLayout = steps.length >= 4;
  // 그리드 열 개수: 스텝+환급 합쳐서 3열 또는 4열
  const totalItems = steps.length + 1; // 환급 포함
  const gridCols = totalItems <= 4 ? 4 : totalItems <= 6 ? 3 : 4;

  return (
    <div className="bg-white rounded-xl p-4">
      {/* 스텝 컨테이너 */}
      <div className="relative">
        {/* 가로선 영역 - 그리드 레이아웃에서는 숨김 */}
        {!useGridLayout && (
          <div
            className="absolute flex items-center"
            style={{
              top: "16px",
              left: "0",
              right: "0",
              height: "2px",
              paddingLeft: "calc(100% / 6)",
              paddingRight: "calc(100% / 6)",
            }}
          >
            {/* 회색 배경선 */}
            <div className="w-full h-full bg-gray-300 rounded-full" />
          </div>
        )}

        {/* 오렌지 진행선 - 그리드 레이아웃에서는 숨김 */}
        {!useGridLayout && (
          <div
            className="absolute flex items-center"
            style={{
              top: "16px",
              left: "0",
              right: "0",
              height: "2px",
              paddingLeft: "calc(100% / 6)",
              paddingRight: "calc(100% / 6)",
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: "#ff6600",
                width:
                  completedCount > 0
                    ? `${(completedCount / steps.length) * 100}%`
                    : "0%",
              }}
            />
          </div>
        )}

        {/* 그리드 레이아웃: 진행 상황 바 */}
        {useGridLayout && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">진행 상황</span>
              <span className="text-xs font-medium text-orange-500">{completedCount}/{steps.length} 완료</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  backgroundColor: "#ff6600",
                  width: `${(completedCount / steps.length) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* 스텝 아이템들 */}
        <div className={`relative ${useGridLayout ? `grid grid-cols-${gridCols} gap-3` : 'flex'}`}
          style={useGridLayout ? { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` } : {}}
        >
          {steps.map((step, index) => {
            const isCurrentStep = index === currentStepIndex;
            const isCompleted = step.status === "completed";

            return (
              <div
                key={index}
                className={`${useGridLayout ? '' : 'flex-1'} flex flex-col items-center text-center h-full`}
              >
                {/* 숫자 원 */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 border-2 bg-white"
                  style={
                    isCompleted
                      ? {
                          backgroundColor: "#fff4e5",
                          borderColor: "#ffcc99",
                          color: "#ff6600",
                        }
                      : {
                          backgroundColor: "#fff",
                          borderColor: "#e5e7eb",
                          color: "#9ca3af",
                        }
                  }
                >
                  {index + 1}
                </div>

                {/* 타이틀 - 높이 고정으로 버튼 정렬 */}
                <p
                  className={`text-xs font-medium mb-1.5 whitespace-pre-line min-h-[32px] flex items-center ${
                    isCompleted ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </p>

                {/* 뱃지/버튼 */}
                {isCompleted ? (
                  <button
                    onClick={() => step.imageUrl && setPreviewStep(index)}
                    className="px-3 py-1 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#0066ff" }}
                  >
                    완료
                  </button>
                ) : isCurrentStep ? (
                  <button
                    onClick={() => onVerify(index)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-white flex items-center gap-1 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: "#ff6600" }}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    인증하기
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                    대기
                  </span>
                )}
              </div>
            );
          })}

          {/* 환급 영역 */}
          <div className={`${useGridLayout ? '' : 'flex-1'} flex flex-col items-center text-center h-full`}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 border-2"
              style={
                paybackStatus === "completed"
                  ? {
                      backgroundColor: "#e5f0ff",
                      borderColor: "#99c2ff",
                      color: "#0066ff",
                    }
                  : paybackStatus === "paying"
                  ? {
                      backgroundColor: "#dcfce7",
                      borderColor: "#86efac",
                      color: "#22c55e",
                    }
                  : paybackStatus === "reviewing"
                  ? {
                      backgroundColor: "#fff4e5",
                      borderColor: "#ffcc99",
                      color: "#ff6600",
                    }
                  : {
                      backgroundColor: "#fff",
                      borderColor: "#e5e7eb",
                      color: "#9ca3af",
                    }
              }
            >
              ₩
            </div>

            <p
              className={`text-xs font-medium mb-1.5 min-h-[32px] flex items-center ${
                paybackStatus === "completed"
                  ? "text-gray-900"
                  : paybackStatus === "paying"
                  ? "text-gray-900"
                  : paybackStatus === "reviewing"
                  ? "text-gray-900"
                  : "text-gray-400"
              }`}
            >
              {paybackAmount.toLocaleString()}원
              <br />
              환급
            </p>

            {paybackStatus === "completed" ? (
              <span
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: "#0066ff" }}
              >
                환급 완료
              </span>
            ) : paybackStatus === "paying" ? (
              <span
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: "#22c55e" }}
              >
                환급 중
              </span>
            ) : paybackStatus === "reviewing" ? (
              <span
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: "#ff6600" }}
              >
                검토중
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                대기
              </span>
            )}
          </div>
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
      {previewStep !== null && steps[previewStep]?.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewStep(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 이미지 */}
            <div className="relative">
              <img
                src={steps[previewStep].imageUrl}
                alt="인증 이미지"
                className="w-full max-h-[60vh] object-contain bg-gray-100"
              />
              <button
                onClick={() => setPreviewStep(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/50 rounded-full hover:bg-black/70"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* 하단 버튼 */}
            <div className="p-4">
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
                  사진 교체하기
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
