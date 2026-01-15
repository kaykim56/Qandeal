import { NextResponse } from "next/server";
import * as crypto from "crypto";
import { generateCode, saveCode, validatePhoneNumber, formatPhoneNumber } from "@/lib/verification-codes";

// Node.js 런타임 사용 (Edge에서 crypto 모듈 문제 방지)
export const runtime = "nodejs";

// 테스트용 전화번호 (SMS 발송 없이 고정 코드 000000 사용)
const TEST_PHONE_NUMBERS = [
  "01000000000",
  "01012345678",
  "01011111111",
];

// Solapi API 직접 호출을 위한 인증 헤더 생성
function generateSolapiAuth() {
  const apiKey = (process.env.SOLAPI_API_KEY || "").trim();
  const apiSecret = (process.env.SOLAPI_API_SECRET || "").trim();
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    // 전화번호 검증
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "전화번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "올바른 전화번호 형식이 아닙니다." },
        { status: 400 }
      );
    }

    const normalizedPhone = phoneNumber.replace(/-/g, "");

    // 테스트 번호인 경우: SMS 발송 없이 고정 코드 사용
    if (TEST_PHONE_NUMBERS.includes(normalizedPhone)) {
      const testCode = "000000";
      saveCode(phoneNumber, testCode);
      console.log(`[TEST MODE] 테스트 번호 ${formatPhoneNumber(phoneNumber)} - 인증코드: ${testCode}`);
      return NextResponse.json({
        success: true,
        message: "인증번호가 발송되었습니다.",
      });
    }

    // 인증 코드 생성 및 저장
    const code = generateCode();
    saveCode(phoneNumber, code);

    // SMS 발송 (Solapi REST API 직접 호출)
    try {
      const response = await fetch("https://api.solapi.com/messages/v4/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": generateSolapiAuth(),
        },
        body: JSON.stringify({
          message: {
            to: normalizedPhone,
            from: process.env.SOLAPI_SENDER_NUMBER || "",
            text: `[콴다 득템 딜] 인증번호: ${code} 5분 내에 입력해주세요.`,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errorMessage || JSON.stringify(result));
      }
    } catch (solapiError: unknown) {
      const errorMessage = solapiError instanceof Error ? solapiError.message : JSON.stringify(solapiError);
      console.error("Solapi 발송 오류:", errorMessage, solapiError);

      // 개발 환경에서는 콘솔에 코드 출력 (Solapi 설정 전 테스트용)
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] SMS 인증코드: ${code} (${formatPhoneNumber(phoneNumber)})`);
        return NextResponse.json({
          success: true,
          message: "인증번호가 발송되었습니다.",
          devCode: code,
        });
      }

      return NextResponse.json(
        { error: `SMS 발송에 실패했습니다: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증번호가 발송되었습니다.",
    });
  } catch (error) {
    console.error("SMS 발송 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
