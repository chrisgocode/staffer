import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";
import { getStaffColor } from "@/lib/schedule-colors";
import type { Shift, StaffMember } from "@/lib/types";

export function useScheduleData(semester: string) {
  const scheduleData = useQuery(api.schedule.schedule.getScheduleForSemester, {
    semester,
  });
  const staffData = useQuery(api.schedule.schedule.getStaffMembers);

  const publishSchedule = useMutation(api.schedule.schedule.publishSchedule);

  // Add colors and zIndex to shifts (from published schedule)
  const publishedShifts: Shift[] = useMemo(() => {
    if (!scheduleData?.shifts || !staffData) return [];

    return scheduleData.shifts.map((shift, index) => {
      const staffIndex = staffData.findIndex((s) => s._id === shift.userId);
      return {
        ...shift,
        color: getStaffColor(staffIndex),
        zIndex: index + 1,
      };
    });
  }, [scheduleData, staffData]);

  // Add colors to staff members
  const staffMembers: StaffMember[] = useMemo(() => {
    if (!staffData) return [];

    return staffData.map((staff, index) => ({
      ...staff,
      color: getStaffColor(index),
    }));
  }, [staffData]);

  return {
    scheduleId: scheduleData?._id,
    publishedShifts,
    staffMembers,
    publishSchedule,
    isLoading: scheduleData === undefined || staffData === undefined,
  };
}
