import { ComingSoonModule } from "../components/coming-soon-module";
import { requirePageAccess } from "@/lib/auth";

export default async function HealthPage() {
  await requirePageAccess("health");
  return (
    <ComingSoonModule
      description="Ghi nhận thói quen sức khỏe, lịch khám, thuốc men, chỉ số cơ bản và nhắc chăm sóc định kỳ."
      eyebrow="Family Health"
      icon="heart"
      ideas={["Lịch khám và tiêm chủng", "Theo dõi giấc ngủ, vận động", "Nhắc uống thuốc", "Chi phí sức khỏe theo tháng"]}
      title="Quản lý sức khỏe"
    />
  );
}
