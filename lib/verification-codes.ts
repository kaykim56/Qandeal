// SMS 인증 코드 저장 및 검증 유틸리티 (Supabase 사용)

import { createClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트 (service role key 사용)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// 6자리 숫자 코드 생성
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Rate limiting 체크 (1분 내 재발송 방지)
export async function checkRateLimit(phone: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const supabase = getSupabaseAdmin();
  const normalizedPhone = phone.replace(/-/g, "");

  const { data: existing } = await supabase
    .from("verification_codes")
    .select("expires_at")
    .eq("phone", normalizedPhone)
    .single();

  if (existing) {
    // expires_at이 5분 후이므로, (expires_at - 4분) 이후면 1분 내 발송된 것
    const expiresAt = new Date(existing.expires_at);
    const sentAt = new Date(expiresAt.getTime() - 5 * 60 * 1000); // 발송 시점 추정
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - sentAt.getTime()) / 1000);
    const waitTime = 60; // 1분

    if (diffSeconds < waitTime) {
      return { allowed: false, waitSeconds: waitTime - diffSeconds };
    }
  }

  return { allowed: true };
}

// 코드 저장 (5분 만료) - Supabase
export async function saveCode(phone: string, code: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalizedPhone = phone.replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // upsert로 기존 코드 덮어쓰기
  const { error } = await supabase
    .from("verification_codes")
    .upsert(
      {
        phone: normalizedPhone,
        code,
        attempts: 0,
        expires_at: expiresAt,
      },
      { onConflict: "phone" }
    );

  if (error) {
    console.error("인증 코드 저장 실패:", error);
    throw new Error("인증 코드 저장에 실패했습니다.");
  }
}

// 코드 검증 - Supabase
export async function verifyCode(
  phone: string,
  inputCode: string
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseAdmin();
  const normalizedPhone = phone.replace(/-/g, "");

  // 저장된 코드 조회
  const { data: saved, error: fetchError } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("phone", normalizedPhone)
    .single();

  if (fetchError || !saved) {
    return { success: false, message: "인증번호를 먼저 요청해주세요." };
  }

  // 만료 확인
  if (new Date(saved.expires_at) < new Date()) {
    await supabase
      .from("verification_codes")
      .delete()
      .eq("phone", normalizedPhone);
    return { success: false, message: "인증번호가 만료되었습니다. 다시 요청해주세요." };
  }

  // 시도 횟수 확인
  if (saved.attempts >= 5) {
    await supabase
      .from("verification_codes")
      .delete()
      .eq("phone", normalizedPhone);
    return { success: false, message: "시도 횟수를 초과했습니다. 다시 요청해주세요." };
  }

  // 코드 불일치
  if (saved.code !== inputCode) {
    await supabase
      .from("verification_codes")
      .update({ attempts: saved.attempts + 1 })
      .eq("phone", normalizedPhone);
    return { success: false, message: "인증번호가 일치하지 않습니다." };
  }

  // 성공 시 코드 삭제
  await supabase
    .from("verification_codes")
    .delete()
    .eq("phone", normalizedPhone);

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
