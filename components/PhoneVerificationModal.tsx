"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Delete } from "lucide-react";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phoneNumber: string, verificationToken: string) => void;
}

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 타이머 관리
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setStep("phone");
      setPhone("");
      setCode("");
      setTimeLeft(0);
      setError("");
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

    if (step === "phone") {
      if (key === "delete") {
        setPhone((prev) => {
          const nums = prev.replace(/\D/g, "");
          return formatPhone(nums.slice(0, -1));
        });
      } else if (phone.replace(/\D/g, "").length < 8) {
        setPhone((prev) => formatPhone(prev.replace(/\D/g, "") + key));
      }
    } else {
      if (key === "delete") {
        setCode((prev) => prev.slice(0, -1));
      } else if (code.length < 6) {
        const newCode = code + key;
        setCode(newCode);

        // 6자리 완성 시 자동 인증
        if (newCode.length === 6) {
          handleVerifyCode(newCode);
        }
      }
    }
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    if (phone.replace(/\D/g, "").length !== 8) {
      setError("전화번호 8자리를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: getFullPhoneNumber() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "발송에 실패했습니다.");
        return;
      }

      setStep("code");
      setTimeLeft(300);
      setCode("");
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async (codeToVerify?: string) => {
    const codeString = codeToVerify || code;
    if (codeString.length !== 6) {
      setError("6자리 인증번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: getFullPhoneNumber(), code: codeString }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "인증에 실패했습니다.");
        setCode("");
        return;
      }

      onVerified(data.phoneNumber, data.verificationToken);
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 타이머 포맷
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // 뒤로가기 처리
  const handleBack = () => {
    if (step === "code") {
      setStep("phone");
      setCode("");
      setError("");
    } else {
      onClose();
    }
  };

  const isPhoneComplete = phone.replace(/\D/g, "").length === 8;
  const isCodeComplete = code.length === 6;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-[430px] mx-auto">
      {/* 상단 헤더 */}
      <header className="flex items-center px-4 py-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-gray-700 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">돌아가기</span>
        </button>
      </header>

      {/* 본문 */}
      <div className="flex-1 px-6 pt-8">
        {step === "phone" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              휴대폰 번호를 입력해주세요
            </h1>
            <p className="text-gray-500 mb-12">
              페이백 지급을 위해 본인 확인이 필요해요
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

            {/* 에러 메시지 */}
            {error && (
              <p className="text-red-500 text-sm text-center mb-2">{error}</p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              인증번호를 입력해주세요
            </h1>
            <p className="text-gray-500 mb-2">
              010-{phone}로 전송된 6자리 코드를 입력하세요
            </p>

            {/* 타이머 */}
            {timeLeft > 0 && (
              <p className="text-sm mb-10">
                남은 시간:{" "}
                <span className="font-medium" style={{ color: "#ff6600" }}>
                  {formatTime(timeLeft)}
                </span>
              </p>
            )}

            {/* 인증번호 표시 */}
            <div className="mb-4">
              <div
                className="flex justify-center gap-3 py-4 border-b-2 transition-colors"
                style={{ borderColor: code ? "#ff6600" : "#e5e7eb" }}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="text-3xl font-bold w-8 text-center"
                    style={{ color: code[i] ? "#111" : "#d1d5db" }}
                  >
                    {code[i] || "○"}
                  </span>
                ))}
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <p className="text-red-500 text-sm text-center mb-2">{error}</p>
            )}

            {/* 재발송 */}
            <button
              onClick={handleSendCode}
              disabled={isLoading}
              className="text-sm text-gray-500 underline w-full text-center"
            >
              인증번호가 오지 않나요? 재발송
            </button>
          </>
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

        {/* 버튼 */}
        {step === "phone" ? (
          <button
            disabled={!isPhoneComplete || isLoading}
            onClick={handleSendCode}
            className={`w-full py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              isPhoneComplete ? "shadow-lg" : ""
            }`}
            style={{
              backgroundColor: isPhoneComplete ? "#ff6600" : "#e5e7eb",
              color: isPhoneComplete ? "#fff" : "#9ca3af",
            }}
          >
            {isLoading ? "발송 중..." : "인증번호 받기"}
          </button>
        ) : (
          <button
            disabled={!isCodeComplete || isLoading}
            onClick={() => handleVerifyCode()}
            className={`w-full py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              isCodeComplete ? "shadow-lg" : ""
            }`}
            style={{
              backgroundColor: isCodeComplete ? "#ff6600" : "#e5e7eb",
              color: isCodeComplete ? "#fff" : "#9ca3af",
            }}
          >
            {isLoading ? "확인 중..." : "인증 완료"}
          </button>
        )}
      </div>
    </div>
  );
}
