"use client";

import { ChevronLeft } from "lucide-react";
import { getBridge } from "@/lib/bridge";

export default function BackButton() {
  const handleClick = () => {
    getBridge().closeWebview();
  };

  return (
    <button
      onClick={handleClick}
      className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
      aria-label="뒤로 가기"
    >
      <ChevronLeft className="w-6 h-6 text-gray-700" />
    </button>
  );
}
