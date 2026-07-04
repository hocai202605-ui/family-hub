import { ComingSoonModule } from "../components/coming-soon-module";

export default function IncomePage() {
  return (
    <ComingSoonModule
      description="Theo dõi lương, freelance, thưởng, phụ cấp và các nguồn tiền vào của gia đình."
      eyebrow="Income Management"
      icon="banknote"
      ideas={["CRUD nguồn thu theo tháng", "Phân loại thu nhập cố định và biến động", "Biểu đồ dòng tiền vào", "Nhắc lịch nhận lương hoặc thanh toán"]}
      title="Quản lý thu nhập"
    />
  );
}
