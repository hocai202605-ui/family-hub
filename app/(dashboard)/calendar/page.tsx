import { ComingSoonModule } from "../components/coming-soon-module";
import { requirePageAccess } from "@/lib/auth";

export default async function CalendarPage() {
  await requirePageAccess("calendar");
  return (
    <ComingSoonModule
      description="Lập lịch việc nhà, lịch học, lịch khám, sinh nhật và những việc cần nhớ mỗi ngày."
      eyebrow="Daily Calendar"
      icon="calendar"
      ideas={["Lịch ngày/tuần/tháng", "Nhắc việc gia đình", "Phân công người phụ trách", "Liên kết chi phí với sự kiện"]}
      title="Quản lý lịch hằng ngày"
    />
  );
}
