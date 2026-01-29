"use client";

import { X } from "lucide-react";
import { TERMS_OF_SERVICE, PRIVACY_COLLECTION, PRIVACY_THIRD_PARTY, MARKETING_CONSENT } from "@/lib/terms";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
  type: "terms_of_service" | "privacy_collection" | "privacy_third_party" | "marketing";
}

export default function TermsModal({ isOpen, onClose, onAgree, type }: TermsModalProps) {
  if (!isOpen) return null;

  const titleMap = {
    terms_of_service: "득템딜 이용약관",
    privacy_collection: "개인정보 수집∙이용 동의",
    privacy_third_party: "개인정보 제3자 제공 동의",
    marketing: "마케팅 정보 수신 동의",
  };

  const contentMap = {
    terms_of_service: TERMS_OF_SERVICE,
    privacy_collection: PRIVACY_COLLECTION,
    privacy_third_party: PRIVACY_THIRD_PARTY,
    marketing: MARKETING_CONSENT,
  };

  const title = titleMap[type];
  const content = contentMap[type];

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col max-w-[430px] mx-auto">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="bg-gray-100 rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-[11px] text-gray-600 font-sans leading-relaxed">
            {content}
          </pre>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t">
        <button
          onClick={() => {
            onAgree();
            onClose();
          }}
          className="w-full py-3 rounded-xl text-lg font-semibold text-white"
          style={{ backgroundColor: "#ff6600" }}
        >
          동의하기
        </button>
      </div>
    </div>
  );
}
