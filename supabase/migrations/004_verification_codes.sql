-- SMS 인증 코드 저장 테이블
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 전화번호당 하나의 코드만 유지
  CONSTRAINT unique_phone_code UNIQUE (phone_number)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- RLS 활성화
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 가능 (클라이언트 직접 접근 차단)
CREATE POLICY "Service role only" ON verification_codes
  FOR ALL
  USING (false)
  WITH CHECK (false);
