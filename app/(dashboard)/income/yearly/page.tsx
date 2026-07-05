import { ComingSoonModule } from "../../components/coming-soon-module";

export default function YearlyIncomeReportPage() {
  return (
    <ComingSoonModule
      description="Khu vực báo cáo biểu đồ thu nhập theo năm sẽ được phát triển sau, tách riêng khỏi màn hình quản lý thu nhập từng tháng."
      eyebrow="Annual Income Report"
      icon="barChart"
      ideas={["Tổng hợp thu nhập theo 12 tháng", "So sánh tăng trưởng thu nhập", "Biểu đồ xu hướng dòng tiền vào", "Lọc báo cáo theo nguồn thu"]}
      title="Báo cáo thu nhập theo năm"
    />
  );
}
