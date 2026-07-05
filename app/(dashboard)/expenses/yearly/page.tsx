import { ComingSoonModule } from "../../components/coming-soon-module";

export default function YearlyExpenseReportPage() {
  return (
    <ComingSoonModule
      description="Khu vực báo cáo biểu đồ chi tiêu theo năm sẽ được phát triển sau, tách riêng khỏi màn hình chi tiêu từng tháng."
      eyebrow="Annual Expense Report"
      icon="barChart"
      ideas={["Tổng hợp thu và chi theo 12 tháng", "So sánh ngân sách từng tháng", "Biểu đồ xu hướng chi tiêu trong năm", "Lọc báo cáo theo thành viên gia đình"]}
      title="Báo cáo chi tiêu theo năm"
    />
  );
}
