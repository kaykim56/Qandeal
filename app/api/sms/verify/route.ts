import { NextResponse } from "next/server";
import { verifyCode, validatePhoneNumber, formatPhoneNumber } from "@/lib/verification-codes";
import * as crypto from "crypto";

// 테스트용 전화번호 (고정 코드 000000)
const TEST_PHONE_NUMBERS = [
  "01000000000",
  "01012345678",
  "01011111111",
];
const TEST_CODE = "000000";

// 간단한 토큰 생성 (JWT 대신 HMAC 사용)
function generateVerificationToken(phoneNumber: string): string {
  const normalizedPhone = phoneNumber.replace(/-/g, "");
  const timestamp = Date.now();
  const data = `${normalizedPhone}:${timestamp}`;

  const secret = process.env.VERIFICATION_SECRET || "default-secret-key";
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(data);
  const signature = hmac.digest("hex");

  // base64로 인코딩하여 토큰 생성
  const token = Buffer.from(`${data}:${signature}`).toString("base64");
  return token;
}

// 토큰 검증
export function verifyToken(token: string): { valid: boolean; phoneNumber?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return { valid: false };
    }

    const [phoneNumber, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr);

    // 토큰 만료 확인 (10분)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return { valid: false };
    }

    // 서명 검증
    const data = `${phoneNumber}:${timestampStr}`;
    const secret = process.env.VERIFICATION_SECRET || "default-secret-key";
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return { valid: false };
    }

    return { valid: true, phoneNumber };
  } catch {
    return { valid: false };
  }
}

export async function POST(request: Request) {
  try {
    const { phoneNumber, code } = await request.json();

    // 입력 검증
    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: "전화번호와 인증번호를 입력해주세요." },
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

    // 테스트 번호인 경우: 고정 코드로 바로 검증
    if (TEST_PHONE_NUMBERS.includes(normalizedPhone)) {
      if (code !== TEST_CODE) {
        return NextResponse.json(
          { error: "인증번호가 일치하지 않습니다." },
          { status: 400 }
        );
      }
      console.log(`[TEST MODE] 테스트 번호 ${formatPhoneNumber(phoneNumber)} 인증 성공`);
    } else {
      // 일반 번호: 저장된 코드로 검증
      const result = verifyCode(phoneNumber, code);

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
    }

    // 성공 시 토큰 발급
    const verificationToken = generateVerificationToken(phoneNumber);

    return NextResponse.json({
      success: true,
      message: "인증이 완료되었습니다.",
      verificationToken,
      phoneNumber: formatPhoneNumber(phoneNumber),
    });
  } catch (error) {
    console.error("인증 검증 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
