import { useState, useEffect, useRef } from "react";
import { getShiftPosition, positionToTime } from "@/lib/schedule-utils";
import type { Shift, StaffMember } from "@/lib/types";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getBlockedRangesForUser,
  doesShiftConflict,
} from "@/lib/schedule-conflict-utils";
import { toast } from "sonner";

interface UseShiftResizeProps {
  shifts: Shift[];
  onShiftsChange: (shifts: Shift[]) => void;
  staffMembers: StaffMember[];
}

export function useShiftResize({
  shifts,
  onShiftsChange,
  staffMembers,
}: UseShiftResizeProps) {
  const [draggingShift, setDraggingShift] = useState<Id<"staffShifts"> | null>(
    null,
  );
  const [dragEdge, setDragEdge] = useState<"top" | "bottom" | null>(null);
  const [tempShift, setTempShift] = useState<Shift | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (
    e: React.MouseEvent,
    shift: Shift,
    edge: "top" | "bottom",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingShift(shift._id);
    setDragEdge(edge);
    setTempShift({ ...shift });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingShift || !dragEdge || !tempShift || !containerRef.current)
        return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentY = (relativeY / rect.height) * 100;
      const clampedPercent = Math.max(0, Math.min(100, percentY));

      const currentPosition = getShiftPosition(
        tempShift.startTime,
        tempShift.endTime,
      );
      const currentTop = Number.parseFloat(currentPosition.top);
      const currentHeight = Number.parseFloat(currentPosition.height);

      let newTop = currentTop;
      let newHeight = currentHeight;

      if (dragEdge === "top") {
        const maxTop = currentTop + currentHeight - 3.85;
        newTop = Math.min(clampedPercent, maxTop);
        newHeight = currentTop + currentHeight - newTop;
      } else {
        const minHeight = 3.85;
        newHeight = Math.max(clampedPercent - currentTop, minHeight);
      }

      const newTimes = positionToTime(newTop, newHeight);
      setTempShift({
        ...tempShift,
        startTime: newTimes.startTime,
        endTime: newTimes.endTime,
      });
    };

    const handleMouseUp = () => {
      if (draggingShift && tempShift) {
        // Validate against class schedule
        const staffMember = staffMembers.find(
          (s) => s._id === tempShift.userId,
        );
        if (staffMember?.classSchedule) {
          const blockedRanges = getBlockedRangesForUser(
            staffMember.classSchedule,
            tempShift.dayOfWeek,
          );
          if (
            doesShiftConflict(
              tempShift.startTime,
              tempShift.endTime,
              blockedRanges,
            )
          ) {
            toast.error("Cannot resize shift into class time");
            setDraggingShift(null);
            setDragEdge(null);
            setTempShift(null);
            return;
          }
        }

        // Update shift in local state
        onShiftsChange(
          shifts.map((s) =>
            s._id === draggingShift
              ? {
                  ...s,
                  startTime: tempShift.startTime,
                  endTime: tempShift.endTime,
                }
              : s,
          ),
        );
      }
      setDraggingShift(null);
      setDragEdge(null);
      setTempShift(null);
    };

    if (draggingShift) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [
    draggingShift,
    dragEdge,
    tempShift,
    shifts,
    onShiftsChange,
    staffMembers,
  ]);

  return {
    draggingShift,
    tempShift,
    resizingShift: tempShift,
    containerRef,
    handleMouseDown,
  };
}
