import { useState, useRef } from "react";
import { calculateSnappedTime } from "@/lib/schedule-utils";
import {
  getBlockedRangesForUser,
  doesShiftConflict,
} from "@/lib/schedule-conflict-utils";
import type { Shift, StaffMember, DropPreview } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface UseShiftDragDropProps {
  shifts: Shift[];
  onShiftsChange: (shifts: Shift[]) => void;
  staffMembers: StaffMember[];
}

export function useShiftDragDrop({
  shifts,
  onShiftsChange,
  staffMembers,
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

  const handleDayDrop = (dayIndex: number) => {
    if (movingShift && dropPreview) {
      // Get the staff member for the moving shift to check their schedule
      const staffMember = staffMembers.find(
        (s) => s._id === movingShift.userId,
      );

      if (staffMember?.classSchedule) {
        const blockedRanges = getBlockedRangesForUser(
          staffMember.classSchedule,
          dayIndex,
        );

        if (
          doesShiftConflict(
            dropPreview.startTime,
            dropPreview.endTime,
            blockedRanges,
          )
        ) {
          toast.error("Cannot schedule shift during class time");
          setMovingShift(null);
          setDropPreview(null);
          return;
        }
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
      // Check for conflicts with student's class schedule
      if (draggedStaff.classSchedule) {
        const blockedRanges = getBlockedRangesForUser(
          draggedStaff.classSchedule,
          dayIndex,
        );

        if (
          doesShiftConflict(
            dropPreview.startTime,
            dropPreview.endTime,
            blockedRanges,
          )
        ) {
          toast.error("Cannot schedule shift during class time");
          setDraggedStaff(null);
          setDropPreview(null);
          return;
        }
      }

      // Add new shift to local state with temporary ID
      tempIdCounter.current += 1;
      const maxZ = Math.max(0, ...shifts.map((s) => s.zIndex));
      const newShift: Shift = {
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
