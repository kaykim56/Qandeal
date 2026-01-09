"use client";

import { useState, useRef } from "react";
import { X, Image, Upload, Loader2 } from "lucide-react";

// 이미지 압축 함수
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // 최대 너비 기준으로 리사이즈
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // 압축 실패시 원본 반환
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface VerifyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (imageUrl: string) => void;
  stepType: "purchase" | "review";
  participationId: string;
}

export default function VerifyUploadModal({
  isOpen,
  onClose,
  onSuccess,
  stepType,
  participationId,
}: VerifyUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const stepTitle = stepType === "purchase" ? "구매 인증" : "리뷰 인증";
  const stepDescription =
    stepType === "purchase"
      ? "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처해주세요."
      : "구매처에 작성한 포토리뷰 화면을 캡처해주세요.";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다");
      return;
    }

    // 이미지 타입 체크
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다");
      return;
    }

    setError(null);
    setSelectedFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // 이미지 압축 (최대 1200px, 품질 80%)
      const compressedFile = await compressImage(selectedFile, 1200, 0.8);

      console.log(`원본: ${(selectedFile.size / 1024).toFixed(1)}KB → 압축: ${(compressedFile.size / 1024).toFixed(1)}KB`);

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("participationId", participationId);
      formData.append("stepType", stepType);

      const response = await fetch("/api/verify/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "업로드 실패");
      }

      onSuccess(data.url);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    onClose();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* 모달 - 모바일에서는 하단 시트 스타일 */}
      <div className="relative bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{stepTitle}</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4">
          {/* 안내 문구 */}
          <p className="text-sm text-gray-600 mb-4">{stepDescription}</p>

          {/* 파일 선택 영역 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview ? (
            /* 미리보기 */
            <div className="relative mb-4">
              <img
                src={preview}
                alt="미리보기"
                className="w-full rounded-xl object-cover max-h-[300px]"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            /* 구매/리뷰 인증 - 갤러리만 (둘 다 스크린샷) */
            <button
              onClick={triggerFileInput}
              className="w-full flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors mb-4"
            >
              <Image className="w-10 h-10 text-gray-400" />
              <span className="text-sm text-gray-600">갤러리에서 스크린샷 선택</span>
            </button>
          )}

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
          )}

          {/* 업로드 버튼 */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: selectedFile ? "#ff6600" : "#d1d5db" }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                업로드 중...
              </>
            ) : selectedFile ? (
              <>
                <Upload className="w-5 h-5" />
                인증하기
              </>
            ) : (
              "사진을 선택해주세요"
            )}
          </button>

          {/* 안내사항 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 leading-relaxed">
              • 스크린샷이 선명하게 보여야 합니다
              <br />
              • 개인정보가 포함된 경우 모자이크 처리해주세요
              <br />• 부적절한 이미지는 인증이 거부될 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
