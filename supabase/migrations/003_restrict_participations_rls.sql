-- =====================================================
-- participations 테이블: public 접근 차단
-- 전화번호 등 개인정보 보호를 위해 service_role만 접근 가능하도록 변경
-- =====================================================

-- 기존 public 정책 제거
DROP POLICY IF EXISTS "Public read participations" ON participations;
DROP POLICY IF EXISTS "Public create participations" ON participations;

-- participation_images도 동일하게 제한
DROP POLICY IF EXISTS "Public read participation_images" ON participation_images;
DROP POLICY IF EXISTS "Public create participation_images" ON participation_images;

-- service_role 전체 접근 정책은 이미 존재하므로 유지
-- "Service role full access on participations" → FOR ALL USING (auth.role() = 'service_role')
-- "Service role full access on participation_images" → FOR ALL USING (auth.role() = 'service_role')
