import { ComingSoonModule } from "../../components/coming-soon-module";
import { requirePageAccess } from "@/lib/auth";

export default async function TravelDetailsPage() {
  await requirePageAccess("travel.details");

  return (
    <ComingSoonModule
      eyebrow="Du lịch"
      title="Chi tiết chuyến đi"
      description="Sổ chuyến đi, ngân sách, checklist đồ đạc và vé/booking sẽ nằm ở đây. Phase này chỉ giữ chỗ — bản đồ check-in đang ở mục Bản đồ."
      icon="plane"
      ideas={[
        "Tạo chuyến đi mới với thời gian, địa điểm",
        "Lập dự toán ngân sách và theo dõi chi tiêu thực tế",
        "Lưu trữ vé máy bay, booking khách sạn",
        "Checklist đồ đạc cần mang theo",
      ]}
    />
  );
}
