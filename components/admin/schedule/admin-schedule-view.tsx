"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { getWeekDates } from "@/lib/schedule-utils";
import {
  getBlockedRangesForUser,
  type BlockedTimeRange,
} from "@/lib/schedule-conflict-utils";
import { useScheduleData } from "@/hooks/use-schedule-data";
import { useShiftDragDrop } from "@/hooks/use-shift-drag-drop";
import { useShiftResize } from "@/hooks/use-shift-resize";
import { ScheduleHeader } from "./ScheduleHeader";
import { StaffSidebar } from "./StaffSidebar";
import { ScheduleGrid } from "./ScheduleGrid";
import type { Shift } from "@/lib/types";
import { toast } from "sonner";

export function StaffScheduleCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState("Fall 2025"); // hardcoding for now
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const weekDates = getWeekDates(weekOffset);

  const { publishedShifts, staffMembers, publishSchedule, isLoading } =
    useScheduleData(selectedSemester);

  // Initialize local shifts from published schedule
  useEffect(() => {
    setShifts(publishedShifts);
  }, [publishedShifts]);

  const dragDropHandlers = useShiftDragDrop({
    shifts,
    onShiftsChange: setShifts,
    staffMembers,
  });
  const resizeHandlers = useShiftResize({
    shifts,
    onShiftsChange: setShifts,
    staffMembers,
  });

  // Calculate blocked ranges for dragged student, moving shift, or resizing shift
  const blockedRanges = useMemo(() => {
    let classSchedule = null;

    // Check if dragging a staff member from sidebar
    if (dragDropHandlers.draggedStaff?.classSchedule) {
      classSchedule = dragDropHandlers.draggedStaff.classSchedule;
    }
    // Check if moving an existing shift card
    else if (dragDropHandlers.movingShift) {
      const staffMember = staffMembers.find(
        (s) => s._id === dragDropHandlers.movingShift?.userId,
      );
      if (staffMember?.classSchedule) {
        classSchedule = staffMember.classSchedule;
      }
    }
    // Check if resizing an existing shift
    else if (resizeHandlers.resizingShift) {
      const staffMember = staffMembers.find(
        (s) => s._id === resizeHandlers.resizingShift?.userId,
      );
      if (staffMember?.classSchedule) {
        classSchedule = staffMember.classSchedule;
      }
    }

    if (!classSchedule) return null;

    // Return map of dayIndex -> BlockedTimeRange[]
    const rangesMap: Record<number, BlockedTimeRange[]> = {};
    for (let day = 0; day < 5; day++) {
      rangesMap[day] = getBlockedRangesForUser(classSchedule, day);
    }
    return rangesMap;
  }, [
    dragDropHandlers.draggedStaff,
    dragDropHandlers.movingShift,
    resizeHandlers.resizingShift,
    staffMembers,
  ]);

  const bringToFront = (shiftId: string) => {
    setShifts((prev) => {
      const maxZ = Math.max(...prev.map((s) => s.zIndex));
      return prev.map((s) =>
        s._id === shiftId ? { ...s, zIndex: maxZ + 1 } : s,
      );
    });
  };

  const handleShiftClick = (shiftId: string) => {
    bringToFront(shiftId);
  };

  const handleDayDragOver = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragDropHandlers.movingShift ? "move" : "copy";

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    dragDropHandlers.handleDayDragOver(e, dayIndex, rect);
  };

  const handleDayDrop = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    dragDropHandlers.handleDayDrop(dayIndex);
  };

  const handleDeleteShift = (shiftId: string) => {
    setShifts((prev) => prev.filter((s) => s._id !== shiftId));
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await publishSchedule({
        semester: selectedSemester,
        shifts: shifts.map((s) => ({
          userId: s.userId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
      toast.success("Schedule published successfully!");
    } catch (error) {
      console.error("Failed to publish schedule:", error);
      toast.error("Failed to publish schedule");
    } finally {
      setIsPublishing(false);
    }
  };

  // Check if there are unpublished changes
  const hasUnpublishedChanges =
    JSON.stringify(shifts) !== JSON.stringify(publishedShifts);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-background p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background p-6">
      <Card className="w-full h-full bg-card border-border">
        <div className="p-6 space-y-6">
          <ScheduleHeader
            weekDates={weekDates}
            selectedSemester={selectedSemester}
            onSemesterChange={setSelectedSemester}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            hasUnpublishedChanges={hasUnpublishedChanges}
            onPublish={handlePublish}
            isPublishing={isPublishing}
          />

          <div className="grid grid-cols-[280px_1fr] gap-6">
            <StaffSidebar
              staffMembers={staffMembers}
              onDragStart={dragDropHandlers.handleStaffDragStart}
              onDragEnd={dragDropHandlers.handleStaffDragEnd}
            />

            <ScheduleGrid
              weekDates={weekDates}
              shifts={shifts}
              dropPreview={dragDropHandlers.dropPreview}
              movingShift={dragDropHandlers.movingShift}
              draggingShift={resizeHandlers.draggingShift}
              tempShift={resizeHandlers.tempShift}
              blockedRanges={blockedRanges}
              containerRef={resizeHandlers.containerRef}
              onDeleteShift={({ shiftId }) => handleDeleteShift(shiftId)}
              onShiftClick={handleShiftClick}
              onShiftDragStart={(e, shift) =>
                dragDropHandlers.handleShiftDragStart(shift)
              }
              onShiftDragEnd={dragDropHandlers.handleShiftDragEnd}
              onDayDragOver={handleDayDragOver}
              onDayDragLeave={dragDropHandlers.handleDayDragLeave}
              onDayDrop={handleDayDrop}
              onMouseDownTop={(e, shift, edge) =>
                resizeHandlers.handleMouseDown(e, shift, edge)
              }
              onMouseDownBottom={(e, shift, edge) =>
                resizeHandlers.handleMouseDown(e, shift, edge)
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
