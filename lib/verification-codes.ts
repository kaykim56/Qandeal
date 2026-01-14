// SMS 인증 코드 저장 및 검증 유틸리티

interface VerificationCode {
  code: string;
  expires: number;
  attempts: number; // 시도 횟수 제한
}

// globalThis를 사용하여 핫 리로드에도 코드 유지
const globalForCodes = globalThis as unknown as {
  verificationCodes: Map<string, VerificationCode> | undefined;
};

// 메모리 기반 코드 저장 (핫 리로드에도 유지, 서버 재시작 시 초기화)
const codes = globalForCodes.verificationCodes ?? new Map<string, VerificationCode>();
globalForCodes.verificationCodes = codes;

// 6자리 숫자 코드 생성
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 코드 저장 (5분 만료)
export function saveCode(phone: string, code: string): void {
  // 전화번호 정규화 (하이픈 제거)
  const normalizedPhone = phone.replace(/-/g, "");

  codes.set(normalizedPhone, {
    code,
    expires: Date.now() + 5 * 60 * 1000, // 5분
    attempts: 0,
  });
}

// 코드 검증
export function verifyCode(phone: string, inputCode: string): { success: boolean; message: string } {
  const normalizedPhone = phone.replace(/-/g, "");
  const saved = codes.get(normalizedPhone);

  if (!saved) {
    return { success: false, message: "인증번호를 먼저 요청해주세요." };
  }

  if (saved.expires < Date.now()) {
    codes.delete(normalizedPhone);
    return { success: false, message: "인증번호가 만료되었습니다. 다시 요청해주세요." };
  }

  if (saved.attempts >= 5) {
    codes.delete(normalizedPhone);
    return { success: false, message: "시도 횟수를 초과했습니다. 다시 요청해주세요." };
  }

  if (saved.code !== inputCode) {
    saved.attempts += 1;
    return { success: false, message: "인증번호가 일치하지 않습니다." };
  }

  // 성공 시 코드 삭제
  codes.delete(normalizedPhone);
  return { success: true, message: "인증 성공" };
}

// 전화번호 형식 검증 (010-0000-0000 또는 01000000000)
export function validatePhoneNumber(phone: string): boolean {
  const normalized = phone.replace(/-/g, "");
  return /^01[0-9]{8,9}$/.test(normalized);
}

// 전화번호 정규화 (표시용: 010-0000-0000 형태)
export function formatPhoneNumber(phone: string): string {
  const normalized = phone.replace(/-/g, "");
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return phone;
}

// 만료된 코드 정리 (주기적 호출용)
export function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [phone, data] of codes.entries()) {
    if (data.expires < now) {
      codes.delete(phone);
    }
  }
}
