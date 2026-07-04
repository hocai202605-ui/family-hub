import { ComingSoonModule } from "../components/coming-soon-module";

export default function InvestmentsPage() {
  return (
    <ComingSoonModule
      description="Theo dõi tài sản, danh mục đầu tư, lợi nhuận kỳ vọng và phân bổ rủi ro."
      eyebrow="Investment Management"
      icon="barChart"
      ideas={["Danh mục cổ phiếu, quỹ, vàng, tiết kiệm", "Lãi/lỗ theo thời gian", "Phân bổ tài sản theo mục tiêu", "Nhắc tái cân bằng danh mục"]}
      title="Quản lý đầu tư"
    />
  );
}
