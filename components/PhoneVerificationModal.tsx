"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Delete, Check } from "lucide-react";
import TermsModal from "./TermsModal";
import { trackEvent, identifyByPhone } from "./MixpanelProvider";
import { useQandaUser } from "./QandaUserProvider";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (phoneNumber: string, verificationToken: string) => void;
  challengeId?: string;
  challengeTitle?: string;
}

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
  challengeId,
  challengeTitle,
}: PhoneVerificationModalProps) {
  const { user: qandaUser } = useQandaUser();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 약관 동의 상태
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyCollectionAgreed, setPrivacyCollectionAgreed] = useState(false);
  const [privacyThirdPartyAgreed, setPrivacyThirdPartyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyCollectionModal, setShowPrivacyCollectionModal] = useState(false);
  const [showPrivacyThirdPartyModal, setShowPrivacyThirdPartyModal] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);

  // 붙여넣기를 위한 숨겨진 input ref
  const hiddenInputRef = useRef<HTMLInputElement>(null);

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
      setTermsAgreed(false);
      setPrivacyCollectionAgreed(false);
      setPrivacyThirdPartyAgreed(false);
      setMarketingAgreed(false);
    }
  }, [isOpen]);

  // 필수 약관 모두 동의 여부 (선택 항목은 제외)
  const allRequiredTermsAgreed = termsAgreed && privacyCollectionAgreed && privacyThirdPartyAgreed;

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

      // Mixpanel - phone_verify_request 이벤트
      trackEvent("phone_verify_request", {
        challenge_id: challengeId,
        challenge_title: challengeTitle,
        phone_number: getFullPhoneNumber().replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      });

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

      // Mixpanel - phone_verify_success 이벤트
      trackEvent("phone_verify_success", {
        challenge_id: challengeId,
        challenge_title: challengeTitle,
        phone_number: data.phoneNumber,
      });

      // Mixpanel - 전화번호로 identify 변경
      identifyByPhone(data.phoneNumber, qandaUser?.userId);

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

  // 붙여넣기 처리
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const numbers = pastedText.replace(/\D/g, "").slice(0, 6);
    if (numbers.length > 0) {
      setCode(numbers);
      if (numbers.length === 6) {
        handleVerifyCode(numbers);
      }
    }
  };

  // 인증번호 영역 클릭 시 숨겨진 input에 포커스
  const handleCodeAreaClick = () => {
    hiddenInputRef.current?.focus();
  };

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
      <div className="flex-1 px-6 pt-4">
        {step === "phone" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              휴대폰 번호를 입력해주세요
            </h1>
            <p className="text-gray-500 mb-6">
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
                className="flex justify-center gap-3 py-4 border-b-2 transition-colors cursor-pointer"
                style={{ borderColor: code ? "#ff6600" : "#e5e7eb" }}
                onClick={handleCodeAreaClick}
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
              {/* 붙여넣기를 위한 숨겨진 input */}
              <input
                ref={hiddenInputRef}
                type="text"
                inputMode="numeric"
                className="opacity-0 absolute -z-10 h-0 w-0"
                onPaste={handlePaste}
                value=""
                onChange={() => {}}
              />
              <p className="text-xs text-gray-400 text-center mt-2">
                인증번호를 붙여넣으려면 위 영역을 길게 누르세요
              </p>
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

        {/* 약관 동의 체크박스 - 전화번호 입력 단계에서만 표시 */}
        {step === "phone" && (
          <div className="mb-3 space-y-1.5">
            {/* 전체 동의 */}
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  const newValue = !(termsAgreed && privacyCollectionAgreed && privacyThirdPartyAgreed && marketingAgreed);
                  setTermsAgreed(newValue);
                  setPrivacyCollectionAgreed(newValue);
                  setPrivacyThirdPartyAgreed(newValue);
                  setMarketingAgreed(newValue);
                }}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    termsAgreed && privacyCollectionAgreed && privacyThirdPartyAgreed && marketingAgreed
                      ? "bg-[#ff6600] border-[#ff6600]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {termsAgreed && privacyCollectionAgreed && privacyThirdPartyAgreed && marketingAgreed && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">전체 동의</span>
              </div>
            </div>

            {/* 득템딜 이용약관 (필수) */}
            <div className="flex items-center justify-between pl-1">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setTermsAgreed(!termsAgreed)}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    termsAgreed
                      ? "bg-[#ff6600] border-[#ff6600]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {termsAgreed && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-500">(필수) 득템딜 이용약관 동의</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-xs text-gray-400 underline"
              >
                보기
              </button>
            </div>

            {/* 개인정보 수집∙이용 동의 (필수) */}
            <div className="flex items-center justify-between pl-1">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setPrivacyCollectionAgreed(!privacyCollectionAgreed)}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    privacyCollectionAgreed
                      ? "bg-[#ff6600] border-[#ff6600]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {privacyCollectionAgreed && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-500">(필수) 개인정보 수집∙이용 동의</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyCollectionModal(true)}
                className="text-xs text-gray-400 underline"
              >
                보기
              </button>
            </div>

            {/* 개인정보 제3자 제공 동의 (필수) */}
            <div className="flex items-center justify-between pl-1">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setPrivacyThirdPartyAgreed(!privacyThirdPartyAgreed)}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    privacyThirdPartyAgreed
                      ? "bg-[#ff6600] border-[#ff6600]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {privacyThirdPartyAgreed && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-500">(필수) 개인정보 제3자 제공 동의</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyThirdPartyModal(true)}
                className="text-xs text-gray-400 underline"
              >
                보기
              </button>
            </div>

            {/* 마케팅 정보 수신 동의 (선택) */}
            <div className="flex items-center justify-between pl-1">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setMarketingAgreed(!marketingAgreed)}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    marketingAgreed
                      ? "bg-[#ff6600] border-[#ff6600]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {marketingAgreed && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-500">(선택) 마케팅 정보 수신 동의</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMarketingModal(true)}
                className="text-xs text-gray-400 underline"
              >
                보기
              </button>
            </div>
          </div>
        )}

        {/* 버튼 */}
        {step === "phone" ? (
          <button
            disabled={!isPhoneComplete || !allRequiredTermsAgreed || isLoading}
            onClick={handleSendCode}
            className={`w-full py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              isPhoneComplete && allRequiredTermsAgreed ? "shadow-lg" : ""
            }`}
            style={{
              backgroundColor: isPhoneComplete && allRequiredTermsAgreed ? "#ff6600" : "#e5e7eb",
              color: isPhoneComplete && allRequiredTermsAgreed ? "#fff" : "#9ca3af",
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

      {/* 약관 모달 */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAgree={() => setTermsAgreed(true)}
        type="terms_of_service"
        challengeId={challengeId}
        challengeTitle={challengeTitle}
      />
      <TermsModal
        isOpen={showPrivacyCollectionModal}
        onClose={() => setShowPrivacyCollectionModal(false)}
        onAgree={() => setPrivacyCollectionAgreed(true)}
        type="privacy_collection"
        challengeId={challengeId}
        challengeTitle={challengeTitle}
      />
      <TermsModal
        isOpen={showPrivacyThirdPartyModal}
        onClose={() => setShowPrivacyThirdPartyModal(false)}
        onAgree={() => setPrivacyThirdPartyAgreed(true)}
        type="privacy_third_party"
        challengeId={challengeId}
        challengeTitle={challengeTitle}
      />
      <TermsModal
        isOpen={showMarketingModal}
        onClose={() => setShowMarketingModal(false)}
        onAgree={() => setMarketingAgreed(true)}
        type="marketing"
        challengeId={challengeId}
        challengeTitle={challengeTitle}
      />
    </div>
  );
}
