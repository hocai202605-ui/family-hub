-- Drop old table if exists or upgrade to UUID, multiple images and categories
DROP TABLE IF EXISTS "goals";

CREATE TABLE "goals" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Khác',
    "timeline_type" TEXT NOT NULL DEFAULT 'Trung hạn',
    "target_year" INTEGER NOT NULL,
    "target_amount" BIGINT NOT NULL,
    "current_amount" BIGINT NOT NULL DEFAULT 0,
    "images" TEXT[] NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "goals_target_year_idx" ON "goals"("target_year");

-- Insert mock goals
INSERT INTO "goals" ("id", "title", "description", "category", "timeline_type", "target_year", "target_amount", "current_amount", "images", "sort_order", "created_by", "updated_by")
VALUES
  (
    'a1b2c3d4-0001-4000-8000-000000000001',
    'Thi chứng chỉ AWS SAA',
    'Hoàn thành chứng chỉ AWS Solutions Architect Associate để nâng chuẩn kiến thức Cloud và thăng tiến công việc.',
    'Phát triển bản thân',
    'Ngắn hạn',
    2028,
    8000000,
    4500000,
    ARRAY[
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80'
    ],
    1,
    'system',
    'system'
  ),
  (
    'a1b2c3d4-0002-4000-8000-000000000002',
    'Cho bé Bông đi học mầm non',
    'Chuẩn bị học phí và quỹ đầu vào trường mầm non song ngữ chất lượng cao Montessori cho bé vào tháng 8/2028.',
    'Giáo dục',
    'Ngắn hạn',
    2028,
    90000000,
    38000000,
    ARRAY[
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&auto=format&fit=crop&q=80'
    ],
    2,
    'system',
    'system'
  ),
  (
    'a1b2c3d4-0003-4000-8000-000000000003',
    'Mua nhà chung cư (Hà Nội)',
    'Sở hữu căn hộ 3 phòng ngủ tiện nghi tại khu đô thị xanh phía Tây Hà Nội làm tổ ấm an cư cho cả nhà.',
    'An cư',
    'Trung hạn',
    2030,
    3800000000,
    1450000000,
    ARRAY[
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
    ],
    3,
    'system',
    'system'
  ),
  (
    'a1b2c3d4-0004-4000-8000-000000000004',
    'Mua xe ô tô gia đình',
    'Tậu xe SUV 7 chỗ gầm cao phục vụ những chuyến về thăm quê và đưa đại gia đình đi cắm trại, du lịch cuối tuần.',
    'Phương tiện',
    'Dài hạn',
    2032,
    950000000,
    220000000,
    ARRAY[
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80'
    ],
    4,
    'system',
    'system'
  );

