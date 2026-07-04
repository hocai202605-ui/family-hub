import { ComingSoonModule } from "../components/coming-soon-module";

export default function ParentingPage() {
  return (
    <ComingSoonModule
      description="Theo dõi học tập, nề nếp, hoạt động ngoại khóa và những ghi chú quan trọng khi nuôi dạy con."
      eyebrow="Parenting"
      icon="leaf"
      ideas={["Lịch học và hoạt động", "Thói quen hằng ngày", "Ghi chú phát triển", "Mục tiêu kỹ năng theo độ tuổi"]}
      title="Quản lý nuôi dạy con"
    />
  );
}
