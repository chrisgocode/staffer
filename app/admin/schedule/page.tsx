import { AdminHeader } from "@/components/admin/admin-header";
import { StaffScheduleCalendar } from "@/components/admin/schedule/admin-schedule-view";

export default function SchedulePage() {
  return (
    <div>
      <AdminHeader />
      <StaffScheduleCalendar />
    </div>
  );
}
