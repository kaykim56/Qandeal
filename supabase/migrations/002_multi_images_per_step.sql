-- =====================================================
-- 스텝당 여러 이미지 허용
-- =====================================================

-- 기존 UNIQUE 제약 삭제
ALTER TABLE participation_images
DROP CONSTRAINT IF EXISTS participation_images_participation_id_step_order_key;

-- 이미지 순서 컬럼 추가 (한 스텝 내에서 여러 이미지 구분용)
ALTER TABLE participation_images
ADD COLUMN IF NOT EXISTS image_order INTEGER DEFAULT 1;

-- 새 UNIQUE 제약: participation_id + step_order + image_order
ALTER TABLE participation_images
ADD CONSTRAINT participation_images_unique_key
UNIQUE (participation_id, step_order, image_order);
