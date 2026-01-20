import { useState, useRef } from "react";
import { calculateSnappedTime } from "@/lib/schedule-utils";
import {
  getAllBlockedRanges,
  doesShiftConflict,
} from "@/lib/schedule-conflict-utils";
import type { Shift, StaffMember, DropPreview } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface UseShiftDragDropProps {
  shifts: Shift[];
  onShiftsChange: (shifts: Shift[]) => void;
  staffMembers: StaffMember[];
  selectedSemester: string;
}

export function useShiftDragDrop({
  shifts,
  onShiftsChange,
  staffMembers,
  selectedSemester,
}: UseShiftDragDropProps) {
  const [draggedStaff, setDraggedStaff] = useState<StaffMember | null>(null);
  const [movingShift, setMovingShift] = useState<Shift | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const tempIdCounter = useRef(0);

  const handleStaffDragStart = (staff: StaffMember) => {
    setDraggedStaff(staff);
  };

  const handleStaffDragEnd = () => {
    setDraggedStaff(null);
    setDropPreview(null);
  };

  const handleShiftDragStart = (shift: Shift) => {
    setMovingShift(shift);
  };

  const handleShiftDragEnd = () => {
    setMovingShift(null);
    setDropPreview(null);
  };

  const handleDayDragOver = (
    e: React.DragEvent,
    dayIndex: number,
    rect: DOMRect,
  ) => {
    if (!draggedStaff && !movingShift) return;

    const relativeY = e.clientY - rect.top;
    const percentY = (relativeY / rect.height) * 100;

    if (movingShift) {
      const [startH, startM] = movingShift.startTime.split(":").map(Number);
      const [endH, endM] = movingShift.endTime.split(":").map(Number);
      const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

      const times = calculateSnappedTime(percentY, durationMinutes);
      setDropPreview({
        day: dayIndex,
        startTime: times.startTime,
        endTime: times.endTime,
        color: movingShift.color,
      });
    } else if (draggedStaff) {
      const times = calculateSnappedTime(percentY, 60);
      setDropPreview({
        day: dayIndex,
        startTime: times.startTime,
        endTime: times.endTime,
        color: draggedStaff.color,
      });
    }
  };

  const handleDayDragLeave = () => {
    setDropPreview(null);
  };

  const checkScheduleConflict = (
    staffMember: StaffMember | null | undefined,
    dayIndex: number,
    startTime: string,
    endTime: string,
  ): boolean => {
    if (!staffMember) {
      return false;
    }

    // Only check class schedule conflicts - preferences are informational only for admins
    const blockedRanges = getAllBlockedRanges(
      staffMember.classSchedule ?? undefined,
      undefined, // Ignore preferences - admins can schedule over them
      selectedSemester,
      dayIndex,
    );

    return doesShiftConflict(startTime, endTime, blockedRanges);
  };

  const checkShiftOverlap = (
    userId: Id<"users">,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeShiftId?: Id<"staffShifts">,
  ): boolean => {
    // Find all shifts for the same user on the same day, excluding the shift being moved
    const userShiftsOnDay = shifts.filter(
      (shift) =>
        shift.userId === userId &&
        shift.dayOfWeek === dayOfWeek &&
        (!excludeShiftId || shift._id !== excludeShiftId),
    );

    // Convert existing shifts to BlockedTimeRange format
    const blockedRanges = userShiftsOnDay.map((shift) => ({
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
      source: "class" as const, // Using "class" as placeholder for shift conflicts
    }));

    // Check for conflicts using doesShiftConflict
    return doesShiftConflict(startTime, endTime, blockedRanges);
  };

  const handleDayDrop = (dayIndex: number) => {
    if (movingShift && dropPreview) {
      // Get the staff member for the moving shift to check their schedule
      const staffMember = staffMembers.find(
        (s) => s._id === movingShift.userId,
      );

      if (
        checkScheduleConflict(
          staffMember,
          dayIndex,
          dropPreview.startTime,
          dropPreview.endTime,
        )
      ) {
        toast.error("Cannot schedule shift during class time");
        setMovingShift(null);
        setDropPreview(null);
        return;
      }

      // Check for conflicts with existing shifts for the same user
      if (
        checkShiftOverlap(
          movingShift.userId,
          dayIndex,
          dropPreview.startTime,
          dropPreview.endTime,
          movingShift._id,
        )
      ) {
        toast.error("This conflicts with an existing shift");
        setMovingShift(null);
        setDropPreview(null);
        return;
      }

      // Update existing shift position
      onShiftsChange(
        shifts.map((s) =>
          s._id === movingShift._id
            ? {
                ...s,
                dayOfWeek: dayIndex,
                startTime: dropPreview.startTime,
                endTime: dropPreview.endTime,
              }
            : s,
        ),
      );
    } else if (draggedStaff && dropPreview) {
      // Check for conflicts with student's class schedule (preferences are informational only)
      if (
        checkScheduleConflict(
          draggedStaff,
          dayIndex,
          dropPreview.startTime,
          dropPreview.endTime,
        )
      ) {
        toast.error("Cannot schedule shift during class time");
        setDraggedStaff(null);
        setDropPreview(null);
        return;
      }

      // Check for conflicts with existing shifts for the same user
      if (
        checkShiftOverlap(
          draggedStaff._id,
          dayIndex,
          dropPreview.startTime,
          dropPreview.endTime,
        )
      ) {
        toast.error("This shift conflicts with an existing shift");
        setDraggedStaff(null);
        setDropPreview(null);
        return;
      }

      // Add new shift to local state with temporary ID
      tempIdCounter.current += 1;
      const maxZ = Math.max(0, ...shifts.map((s) => s.zIndex ?? 0));
      const newShift: Shift = {
        // creating a temp id because the shift is not yet created in the database
        _id: `temp-${tempIdCounter.current}` as Id<"staffShifts">,
        userId: draggedStaff._id,
        userName: draggedStaff.name,
        dayOfWeek: dayIndex,
        startTime: dropPreview.startTime,
        endTime: dropPreview.endTime,
        color: draggedStaff.color,
        zIndex: maxZ + 1,
      };
      onShiftsChange([...shifts, newShift]);
    }

    setDraggedStaff(null);
    setMovingShift(null);
    setDropPreview(null);
  };

  return {
    draggedStaff,
    movingShift,
    dropPreview,
    handleStaffDragStart,
    handleStaffDragEnd,
    handleShiftDragStart,
    handleShiftDragEnd,
    handleDayDragOver,
    handleDayDragLeave,
    handleDayDrop,
  };
}
