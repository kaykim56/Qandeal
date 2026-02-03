"use client";

import { useState, useEffect } from "react";
import { Delete, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Participation } from "@/lib/db/participations";

interface PhoneCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhoneConfirmed: (phoneNumber: string, participation: Participation | null) => void;
  challengeId: string;
  paybackAmount?: number;
}

export default function PhoneCheckModal({
  isOpen,
  onClose,
  onPhoneConfirmed,
  challengeId,
  paybackAmount,
}: PhoneCheckModalProps) {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setPhone("");
      setError("");
      setNotFound(false);
    }
  }, [isOpen]);

  // 전화번호 포맷팅 (0000-0000)
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 4) return numbers;
    return `${numbers.slice(0, 4)}-${numbers.slice(4, 8)}`;
  };

  // 전체 전화번호
  const getFullPhoneNumber = () => {
    return `010${phone.replace(/\D/g, "")}`;
  };

  // 키패드 입력 처리
  const handleKeyPress = (key: string) => {
    setError("");
    setNotFound(false);

    if (key === "delete") {
      setPhone((prev) => {
        const nums = prev.replace(/\D/g, "");
        return formatPhone(nums.slice(0, -1));
      });
    } else if (phone.replace(/\D/g, "").length < 8) {
      setPhone((prev) => formatPhone(prev.replace(/\D/g, "") + key));
    }
  };

  // 전화번호로 참여 조회
  const handleConfirm = async () => {
    if (phone.replace(/\D/g, "").length !== 8) {
      setError("전화번호 8자리를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");
    setNotFound(false);

    try {
      const fullPhone = getFullPhoneNumber();
      const res = await fetch(
        `/api/participations?challengeId=${challengeId}&phoneNumber=${fullPhone}`
      );
      const data = await res.json();

      if (data.participation) {
        // 참여 기록 있음 - 상태 복원
        onPhoneConfirmed(fullPhone, data.participation);
      } else {
        // 참여 기록 없음 - 에러 표시
        setNotFound(true);
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const isPhoneComplete = phone.replace(/\D/g, "").length === 8;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-[430px] mx-auto">
      {/* 본문 */}
      <div className="flex-1 px-6 pt-8">
        {/* QANDA 로고 */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo-qanda-full.png"
            alt="QANDA"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
        </div>
        <p className="text-lg text-gray-700 text-center mb-2">
          <span className="font-semibold">득템딜</span> 전화번호 확인이 필요해요
        </p>
        <p className="text-sm text-gray-500 text-center mb-6">
          참여 시 등록한 번호로 참가 이력을 확인할게요
        </p>

        {/* 전화번호 표시 */}
        <div className="mb-4">
          <div
            className="text-4xl font-bold tracking-wide text-center py-4 border-b-2 transition-colors flex items-center justify-center gap-1"
            style={{ borderColor: phone ? "#ff6600" : "#e5e7eb" }}
          >
            <span className="text-gray-400">010-</span>
            <span style={{ color: phone ? "#111" : "#d1d5db" }}>
              {phone || "0000-0000"}
            </span>
          </div>
        </div>

        {/* 페이백 안내 */}
        {paybackAmount && (
          <p className="text-sm text-center mb-4" style={{ color: "#ff6600" }}>
            끝까지 참여하고 인증해서, <span className="font-bold">{paybackAmount.toLocaleString()}원</span> 페이백 받으세요!
          </p>
        )}

        {/* 에러 메시지 */}
        {error && (
          <p className="text-red-500 text-sm text-center mb-2">{error}</p>
        )}

        {/* 참여 기록 없음 안내 */}
        {notFound && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800 mb-1">
                  참여 기록이 없습니다
                </p>
                <p className="text-sm text-orange-700 mb-2">
                  번호를 다시 확인해주세요.
                </p>
                <p className="text-sm text-gray-600">
                  참가한 적이 없다면{" "}
                  <span className="font-semibold text-gray-800">
                    콴다 앱에서 직접 들어가서 참여
                  </span>
                  해주세요.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 커스텀 키패드 */}
      <div className="bg-gray-50 p-4">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              className="py-4 text-2xl font-medium text-gray-900 rounded-xl active:bg-gray-200 transition-colors"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleKeyPress("0")}
            className="py-4 text-2xl font-medium text-gray-900 rounded-xl active:bg-gray-200 transition-colors"
          >
            0
          </button>
          <button
            onClick={() => handleKeyPress("delete")}
            className="py-4 flex items-center justify-center text-gray-500 rounded-xl active:bg-gray-200 transition-colors"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* 확인 버튼 */}
        <button
          disabled={!isPhoneComplete || isLoading}
          onClick={handleConfirm}
          className={`w-full py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
            isPhoneComplete ? "shadow-lg" : ""
          }`}
          style={{
            backgroundColor: isPhoneComplete ? "#ff6600" : "#e5e7eb",
            color: isPhoneComplete ? "#fff" : "#9ca3af",
          }}
        >
          {isLoading ? "확인 중..." : "확인"}
        </button>
      </div>
    </div>
  );
}
