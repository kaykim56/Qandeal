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
  // 🔍 디버깅: 요청 출처 추적
  const headers = Object.fromEntries(request.headers.entries());
  const origin = headers["origin"];
  const referer = headers["referer"];

  console.log("[SMS DEBUG] Request headers:", JSON.stringify({
    "user-agent": headers["user-agent"],
    "referer": referer,
    "origin": origin,
    "x-forwarded-for": headers["x-forwarded-for"],
    "x-real-ip": headers["x-real-ip"],
  }, null, 2));

  // Origin/Referer 검증 - 허용된 도메인에서의 요청만 허용
  const allowedDomains = ["qanda.ai", "vercel.app", "localhost"];
  const isValidOrigin = allowedDomains.some(domain =>
    origin?.includes(domain) || referer?.includes(domain)
  );

  if (!isValidOrigin) {
    console.log("[SMS] Blocked: Invalid origin", { origin, referer });
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 403 }
    );
  }

  try {
    const { phoneNumber } = await request.json();

    console.log("[SMS DEBUG] Phone number requested:", phoneNumber);

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

    // 개발 환경에서는 Twilio 없이 고정 코드 사용
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] SMS 인증코드: 111111 (${formatPhoneNumber(phoneNumber)}) - dev 모드에서는 111111 입력`);
      await saveCode(phoneNumber, "111111"); // 고정 코드로 덮어쓰기
      return NextResponse.json({
        success: true,
        message: "인증번호가 발송되었습니다. (개발모드: 111111 입력)",
      });
    }

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
