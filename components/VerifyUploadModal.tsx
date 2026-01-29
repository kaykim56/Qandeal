"use client";

import { useState, useRef } from "react";
import { X, Image, Upload, Loader2, Plus, Trash2 } from "lucide-react";

const MAX_IMAGES = 3;

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

interface SelectedImage {
  file: File;
  preview: string;
}

interface VerifyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (imageUrls: string[]) => void;  // 여러 이미지 URL 반환
  stepType: "purchase" | "review";
  participationId: string;
  // 동적 스텝 지원을 위한 새 props
  stepOrder?: number;
  stepTitle?: string;
  stepDescription?: string;
  exampleImages?: string[]; // 예시 이미지들
  existingImages?: string[]; // 기존 업로드된 이미지들
}

export default function VerifyUploadModal({
  isOpen,
  onClose,
  onSuccess,
  stepType,
  participationId,
  stepOrder,
  stepTitle: propStepTitle,
  stepDescription: propStepDescription,
  exampleImages = [],
  existingImages = [],
}: VerifyUploadModalProps) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 동적 스텝인 경우 props 사용, 아니면 기본값
  const defaultTitle = stepType === "purchase" ? "구매 인증" : "리뷰 인증";
  const defaultDescription =
    stepType === "purchase"
      ? "주문일, 주문번호, 주문상품이 보이도록 주문 상세정보를 캡처해주세요."
      : "구매처에 작성한 포토리뷰 화면을 캡처해주세요.";

  const displayTitle = propStepTitle || defaultTitle;
  const displayDescription = propStepDescription || defaultDescription;

  // 현재 남은 슬롯 수 (기존 이미지 + 새 이미지 합쳐서 최대 3개)
  const remainingSlots = MAX_IMAGES - existingImages.length - selectedImages.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: SelectedImage[] = [];
    const errors: string[] = [];

    // 선택 가능한 최대 개수 체크
    const maxToSelect = remainingSlots;
    const filesToProcess = Array.from(files).slice(0, maxToSelect);

    if (files.length > maxToSelect) {
      errors.push(`최대 ${MAX_IMAGES}장까지 업로드 가능합니다`);
    }

    filesToProcess.forEach((file) => {
      // 파일 크기 체크
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: 10MB 이하 파일만 가능합니다`);
        return;
      }

      // 이미지 타입 체크
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: 이미지 파일만 가능합니다`);
        return;
      }

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setSelectedImages((prev) => [...prev, { file, preview }]);
      };
      reader.readAsDataURL(file);
    });

    if (errors.length > 0) {
      setError(errors.join("\n"));
    } else {
      setError(null);
    }

    // 입력값 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const uploadedUrls: string[] = [];
    const startImageOrder = existingImages.length + 1;
    const UPLOAD_TIMEOUT_MS = 30000; // 30초 타임아웃

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const { file } = selectedImages[i];

        // 이미지 압축 (최대 1200px, 품질 80%)
        const compressedFile = await compressImage(file, 1200, 0.8);
        console.log(`[${i + 1}/${selectedImages.length}] 원본: ${(file.size / 1024).toFixed(1)}KB → 압축: ${(compressedFile.size / 1024).toFixed(1)}KB`);

        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("participationId", participationId);
        formData.append("stepType", stepType);
        if (stepOrder !== undefined) {
          formData.append("stepOrder", String(stepOrder));
        }
        // 이미지 순서 (1, 2, 3)
        formData.append("imageOrder", String(startImageOrder + i));

        // AbortController로 타임아웃 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch("/api/verify/upload", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
            throw new Error("업로드 시간이 초과되었습니다. 다시 시도해주세요.");
          }
          // 네트워크 오류
          throw new Error("네트워크 연결을 확인해주세요.");
        }
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `업로드 실패: ${file.name}`);
        }

        uploadedUrls.push(data.url);
        setUploadProgress(Math.round(((i + 1) / selectedImages.length) * 100));
      }

      onSuccess(uploadedUrls);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setSelectedImages([]);
    setError(null);
    setUploadProgress(0);
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
      <div className="relative bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{displayTitle}</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 컨텐츠 - 스크롤 가능 */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* 안내 문구 */}
          <p className="text-sm text-gray-600 mb-4">{displayDescription}</p>

          {/* 예시 이미지들 */}
          {exampleImages.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 rounded-xl">
              <p className="text-xs font-medium text-orange-600 mb-2 text-center">예시 이미지</p>
              <div className="flex flex-col items-center gap-3">
                {exampleImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`예시 ${idx + 1}`}
                    className="max-w-[180px] rounded-lg border border-orange-200"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 파일 선택 영역 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 기존 업로드된 이미지 + 새로 선택한 이미지 그리드 */}
          {(existingImages.length > 0 || selectedImages.length > 0) && (
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-2">
                {/* 기존 이미지 */}
                {existingImages.map((url, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`기존 이미지 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}

                {/* 새로 선택한 이미지 */}
                {selectedImages.map((img, index) => (
                  <div key={`new-${index}`} className="relative aspect-square">
                    <img
                      src={img.preview}
                      alt={`새 이미지 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-orange-400"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded">
                      {existingImages.length + index + 1}
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}

                {/* 추가 버튼 (남은 슬롯이 있을 때만) */}
                {remainingSlots > 0 && (
                  <button
                    onClick={triggerFileInput}
                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors"
                  >
                    <Plus className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">추가</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {existingImages.length + selectedImages.length}/{MAX_IMAGES}장 선택됨
              </p>
            </div>
          )}

          {/* 아직 선택된 이미지가 없을 때 */}
          {existingImages.length === 0 && selectedImages.length === 0 && (
            <button
              onClick={triggerFileInput}
              className="w-full flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-colors mb-4"
            >
              <Image className="w-10 h-10 text-gray-400" />
              <span className="text-sm text-gray-600">갤러리에서 스크린샷 선택</span>
              <span className="text-xs text-gray-400">최대 {MAX_IMAGES}장까지 선택 가능</span>
            </button>
          )}

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-500 mb-4 text-center whitespace-pre-line">{error}</p>
          )}

          {/* 업로드 진행 상황 */}
          {isUploading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">{uploadProgress}% 완료</p>
            </div>
          )}

          {/* 업로드 버튼 */}
          <button
            onClick={handleUpload}
            disabled={selectedImages.length === 0 || isUploading}
            className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: selectedImages.length > 0 ? "#ff6600" : "#d1d5db" }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                업로드 중... ({uploadProgress}%)
              </>
            ) : selectedImages.length > 0 ? (
              <>
                <Upload className="w-5 h-5" />
                {selectedImages.length}장 인증하기
              </>
            ) : existingImages.length > 0 ? (
              "추가할 사진을 선택해주세요"
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
