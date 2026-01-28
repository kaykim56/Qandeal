-- =====================================================
-- Supabase Migration: Google Sheets → PostgreSQL
-- =====================================================

-- =====================================================
-- 1. Admin Users Table (관리자 권한 관리)
-- =====================================================
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관리자 체크 헬퍼 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Challenges Table (챌린지)
-- =====================================================
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  option TEXT,
  original_price INTEGER DEFAULT 0,
  payback_rate INTEGER DEFAULT 0,
  payback_amount INTEGER DEFAULT 0,
  final_price INTEGER DEFAULT 0,
  product_image TEXT,
  product_link TEXT,
  detail_images JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deleted')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  purchase_deadline TIMESTAMPTZ,
  review_deadline TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_short_id ON challenges(short_id);
CREATE INDEX idx_challenges_created_at ON challenges(created_at DESC);

-- =====================================================
-- 3. Mission Steps Table (미션 스텝 - 정규화)
-- =====================================================
CREATE TABLE mission_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  example_images JSONB DEFAULT '[]',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, step_order)
);

-- Indexes
CREATE INDEX idx_mission_steps_challenge ON mission_steps(challenge_id);

-- =====================================================
-- 4. Participations Table (참여 기록)
-- =====================================================
CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  qanda_user_id TEXT NOT NULL,
  phone_number TEXT,
  tester_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, qanda_user_id)
);

-- Indexes
CREATE INDEX idx_participations_challenge ON participations(challenge_id);
CREATE INDEX idx_participations_user ON participations(qanda_user_id);
CREATE INDEX idx_participations_status ON participations(status);
CREATE INDEX idx_participations_created_at ON participations(created_at DESC);

-- =====================================================
-- 5. Participation Images Table (참여 이미지 - 정규화)
-- =====================================================
CREATE TABLE participation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id UUID REFERENCES participations(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participation_id, step_order)
);

-- Indexes
CREATE INDEX idx_participation_images_participation ON participation_images(participation_id);

-- =====================================================
-- 6. Updated_at Trigger Function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_challenges_updated
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_participations_updated
  BEFORE UPDATE ON participations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 7. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_images ENABLE ROW LEVEL SECURITY;

-- admin_users: 관리자만 조회 가능
CREATE POLICY "Admin users visible to admins only" ON admin_users
  FOR SELECT USING (is_admin());

-- challenges: 누구나 published 조회 가능
CREATE POLICY "Public read published challenges" ON challenges
  FOR SELECT USING (status = 'published');

-- challenges: service_role만 수정 가능
CREATE POLICY "Service role full access on challenges" ON challenges
  FOR ALL USING (auth.role() = 'service_role');

-- mission_steps: published 챌린지의 스텝만 조회
CREATE POLICY "Public read mission steps of published challenges" ON mission_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE id = mission_steps.challenge_id
      AND status = 'published'
    )
  );

-- mission_steps: service_role 전체 접근
CREATE POLICY "Service role full access on mission_steps" ON mission_steps
  FOR ALL USING (auth.role() = 'service_role');

-- participations: 모든 사용자가 조회 가능 (필터링은 API에서)
CREATE POLICY "Public read participations" ON participations
  FOR SELECT USING (true);

-- participations: 모든 사용자가 생성 가능
CREATE POLICY "Public create participations" ON participations
  FOR INSERT WITH CHECK (true);

-- participations: service_role 전체 접근
CREATE POLICY "Service role full access on participations" ON participations
  FOR ALL USING (auth.role() = 'service_role');

-- participation_images: 모든 사용자가 조회 가능
CREATE POLICY "Public read participation_images" ON participation_images
  FOR SELECT USING (true);

-- participation_images: 모든 사용자가 생성 가능
CREATE POLICY "Public create participation_images" ON participation_images
  FOR INSERT WITH CHECK (true);

-- participation_images: service_role 전체 접근
CREATE POLICY "Service role full access on participation_images" ON participation_images
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 8. 초기 관리자 등록 (Mathpresso 관리자)
-- =====================================================
INSERT INTO admin_users (email) VALUES
  ('alycia.park@mathpresso.com'),
  ('van.kim@mathpresso.com'),
  ('kevin.kang@mathpresso.com');
