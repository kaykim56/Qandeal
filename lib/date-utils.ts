/**
 * 날짜/시간 유틸리티 함수
 * 모든 시간 저장은 KST (UTC+9) 기준으로 합니다.
 */

/**
 * 현재 KST 시간을 ISO 문자열로 반환합니다.
 * 예: "2026-02-02T20:30:00+09:00"
 */
export function getKSTISOString(date?: Date): string {
  const targetDate = date || new Date();

  // KST offset (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
  const kstTime = new Date(targetDate.getTime() + kstOffset);

  // ISO 문자열에서 'Z'를 '+09:00'으로 대체
  return kstTime.toISOString().replace('Z', '+09:00');
}

/**
 * 현재 KST 시간을 "YYYY-MM-DD HH:mm:ss" 형식으로 반환합니다.
 * DB 저장 및 어드민 표시용
 */
export function getKSTDateTimeString(date?: Date): string {
  const targetDate = date || new Date();

  // KST offset (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(targetDate.getTime() + kstOffset);

  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getUTCDate()).padStart(2, '0');
  const hours = String(kstTime.getUTCHours()).padStart(2, '0');
  const minutes = String(kstTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstTime.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 현재 KST 날짜를 "YYYY-MM-DD" 형식으로 반환합니다.
 */
export function getKSTDateString(date?: Date): string {
  const targetDate = date || new Date();

  // KST offset (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(targetDate.getTime() + kstOffset);

  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * UTC ISO 문자열을 KST ISO 문자열로 변환합니다.
 * 기존 데이터 마이그레이션용
 */
export function utcToKSTISOString(utcISOString: string): string {
  const utcDate = new Date(utcISOString);
  return getKSTISOString(utcDate);
}
