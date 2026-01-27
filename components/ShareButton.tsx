"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // 일반 웹 URL 사용 (OG 태그 미리보기를 위해 딥링크 대신)
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    // Web Share API 지원 시 네이티브 공유
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url: shareUrl,
        });
      } catch (err) {
        // 사용자가 공유 취소한 경우 무시
        if ((err as Error).name !== "AbortError") {
          // 공유 실패 시 클립보드 복사로 폴백
          copyToClipboard(shareUrl);
        }
      }
    } else {
      // Web Share API 미지원 시 URL 복사
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 폴백: prompt로 URL 표시
      prompt("URL을 복사하세요:", text);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 hover:bg-gray-100 rounded-full relative"
      title="공유하기"
    >
      <Share2 className="w-5 h-5 text-gray-700" />
      {copied && (
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-gray-800 text-white px-2 py-1 rounded">
          복사됨!
        </span>
      )}
    </button>
  );
}
