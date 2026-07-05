import { ComingSoonModule } from "../components/coming-soon-module";
import { requirePageAccess } from "@/lib/auth";

export default async function GoalsPage() {
  await requirePageAccess("goals");
  return (
    <ComingSoonModule
      description="Theo dõi các mục tiêu như quỹ dự phòng, du lịch, học phí, mua nhà hoặc chăm sóc sức khỏe."
      eyebrow="Family Goals"
      icon="target"
      ideas={["Mục tiêu tài chính và phi tài chính", "Tiến độ theo tháng", "Ưu tiên và hạn chót", "Gợi ý số tiền cần dành mỗi kỳ"]}
      title="Quản lý mục tiêu"
    />
  );
}
