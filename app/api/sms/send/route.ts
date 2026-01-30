import { NextResponse } from "next/server";
import twilio from "twilio";
import { generateCode, saveCode, validatePhoneNumber, formatPhoneNumber, checkRateLimit } from "@/lib/verification-codes";

export const runtime = "nodejs";

// Twilio 클라이언트 설정
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  // 🚨 긴급: SMS 발송 임시 중단 - 원인 파악 중
  console.log("[SMS] BLOCKED - SMS sending temporarily disabled");
  return NextResponse.json({
    success: false,
    error: "SMS 발송이 일시적으로 중단되었습니다. 잠시 후 다시 시도해주세요.",
    blocked: true,
  }, { status: 503 });

  /* 원본 코드 - 원인 파악 후 복구
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

    // Rate limiting: 1분 내 재발송 방지
    const rateLimitResult = await checkRateLimit(normalizedPhone);
    if (!rateLimitResult.allowed) {
      console.log(`[SMS] Rate limited: ${normalizedPhone}, wait ${rateLimitResult.waitSeconds}s`);
      return NextResponse.json({
        success: true,
        message: "인증번호가 이미 발송되었습니다. 잠시 후 다시 시도해주세요.",
        rateLimited: true,
        waitSeconds: rateLimitResult.waitSeconds,
      });
    }

    // 인증 코드 생성 및 Supabase에 저장
    const code = generateCode();
    await saveCode(phoneNumber, code);

    // Twilio로 SMS 발송
    console.log("[SMS] Sending to:", normalizedPhone);

    try {
      const message = await client.messages.create({
        body: `[콴다 득템 딜] 인증번호: ${code} 5분 내에 입력해주세요.`,
        from: twilioPhoneNumber,
        to: `+82${normalizedPhone.slice(1)}`, // 한국 국가 코드 추가, 앞의 0 제거
      });

      console.log("[SMS] Message SID:", message.sid);
    } catch (twilioError: unknown) {
      const errorMessage = twilioError instanceof Error ? twilioError.message : JSON.stringify(twilioError);
      console.error("Twilio 발송 오류:", errorMessage);

      // 개발 환경에서는 콘솔에 코드 출력
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
  원본 코드 끝 */
}
