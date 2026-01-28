"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQandaUser } from "@/components/QandaUserProvider";

export default function LandingPage() {
  const router = useRouter();
  const { user, isQandaUser } = useQandaUser();

  useEffect(() => {
    // 디버깅용 로그 (항상 출력)
    console.log("[Landing] Cookies:", document.cookie);
    console.log("[Landing] isQandaUser:", isQandaUser);
    console.log("[Landing] userId:", user?.userId);

    // 1초 후 메인 페이지로 리다이렉트
    const timer = setTimeout(() => {
      router.replace("/");
    }, 1000);

    return () => clearTimeout(timer);
  }, [router, user, isQandaUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      <p className="mt-4 text-gray-500 text-sm">잠시만 기다려 주세요...</p>
    </div>
  );
}
