"use client";

import { X, Check } from "lucide-react";

interface ParticipateModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLink: string;
}

export default function ParticipateModal({
  isOpen,
  onClose,
  productLink,
}: ParticipateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl w-[320px] p-6 mx-4">
        {/* X 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* 체크 아이콘 */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#22c55e" }}
          >
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* 텍스트 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            챌린지 참가 완료!
          </h2>
          <p className="text-gray-600">
            이제 제품을 구매하고 인증해주세요
          </p>
        </div>

        {/* 버튼 */}
        <a
          href={productLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3.5 rounded-xl text-center text-white font-semibold"
          style={{ backgroundColor: "#ff6600" }}
          onClick={onClose}
        >
          제품 구매하러 가기
        </a>
      </div>
    </div>
  );
}
