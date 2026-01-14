import { NextResponse } from "next/server";
import { SolapiMessageService } from "solapi";
import { generateCode, saveCode, validatePhoneNumber, formatPhoneNumber } from "@/lib/verification-codes";

// Solapi 클라이언트 초기화
const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || "",
  process.env.SOLAPI_API_SECRET || ""
);

// 테스트용 전화번호 (SMS 발송 없이 고정 코드 000000 사용)
const TEST_PHONE_NUMBERS = [
  "01000000000",
  "01012345678",
  "01011111111",
];

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

    // SMS 발송
    try {
      await messageService.send({
        to: normalizedPhone,
        from: process.env.SOLAPI_SENDER_NUMBER || "",
        text: `[콴다 득템 딜] 인증번호: ${code}\n5분 내에 입력해주세요.`,
      });
    } catch (solapiError: unknown) {
      console.error("Solapi 발송 오류:", solapiError);

      // 개발 환경에서는 콘솔에 코드 출력 (Solapi 설정 전 테스트용)
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] SMS 인증코드: ${code} (${formatPhoneNumber(phoneNumber)})`);
        return NextResponse.json({
          success: true,
          message: "인증번호가 발송되었습니다.",
          // 개발 환경에서만 코드 반환 (테스트용)
          devCode: code,
        });
      }

      return NextResponse.json(
        { error: "SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요." },
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
