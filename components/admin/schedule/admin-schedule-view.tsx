"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import {
  getAllBlockedRanges,
  type BlockedTimeRange,
} from "@/lib/schedule-conflict-utils";
import { useScheduleData } from "@/hooks/use-schedule-data";
import { useShiftDragDrop } from "@/hooks/use-shift-drag-drop";
import { useShiftResize } from "@/hooks/use-shift-resize";
import { ScheduleHeader } from "./ScheduleHeader";
import { StaffSidebar } from "./StaffSidebar";
import { ScheduleGrid } from "./ScheduleGrid";
import { ShiftDetailsDialog } from "./ShiftDetailsDialog";
import type { Shift } from "@/lib/types";
import { toast } from "sonner";

export function StaffScheduleCalendar() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState("Spring 2026"); // hardcoding for now
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasInitializedRef = useRef(false);

  const { publishedShifts, staffMembers, publishSchedule, isLoading } =
    useScheduleData(selectedSemester);

  // Reset initialization when semester changes
  useEffect(() => {
    hasInitializedRef.current = false;
    setShifts([]);
  }, [selectedSemester]);

  // Initialize local shifts from published schedule only once on initial load
  useEffect(() => {
    if (!hasInitializedRef.current && publishedShifts.length > 0) {
      setShifts(publishedShifts);
      hasInitializedRef.current = true;
    }
  }, [publishedShifts]);

  const dragDropHandlers = useShiftDragDrop({
    shifts,
    onShiftsChange: setShifts,
    staffMembers,
    selectedSemester,
  });
  const resizeHandlers = useShiftResize({
    shifts,
    onShiftsChange: setShifts,
    staffMembers,
    selectedSemester,
  });

  // Calculate blocked ranges for dragged student, moving shift, or resizing shift
  const blockedRanges = useMemo(() => {
    let classSchedule = null;
    let preferences = null;
    let staffMember = null;

    // Check if dragging a staff member from sidebar
    if (dragDropHandlers.draggedStaff) {
      staffMember = dragDropHandlers.draggedStaff;
      classSchedule = staffMember.classSchedule ?? null;
      preferences = staffMember.preferences?.schedule ?? null;
    }
    // Check if moving an existing shift card
    else if (dragDropHandlers.movingShift) {
      staffMember = staffMembers.find(
        (s) => s._id === dragDropHandlers.movingShift?.userId,
      );
      if (staffMember) {
        classSchedule = staffMember.classSchedule ?? null;
        preferences = staffMember.preferences?.schedule ?? null;
      }
    }
    // Check if resizing an existing shift
    else if (resizeHandlers.resizingShift) {
      staffMember = staffMembers.find(
        (s) => s._id === resizeHandlers.resizingShift?.userId,
      );
      if (staffMember) {
        classSchedule = staffMember.classSchedule ?? null;
        preferences = staffMember.preferences?.schedule ?? null;
      }
    }

    // Return null if no staff member is being interacted with
    if (!staffMember) return null;

    // Return map of dayIndex -> BlockedTimeRange[]
    const rangesMap: Record<number, BlockedTimeRange[]> = {};
    for (let day = 0; day < 5; day++) {
      rangesMap[day] = getAllBlockedRanges(
        classSchedule ?? undefined,
        preferences ?? undefined,
        selectedSemester,
        day,
      );
    }
    return rangesMap;
  }, [
    dragDropHandlers.draggedStaff,
    dragDropHandlers.movingShift,
    resizeHandlers.resizingShift,
    staffMembers,
    selectedSemester,
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
    const shift = shifts.find((s) => s._id === shiftId);
    if (shift) {
      setSelectedShift(shift);
      setIsDialogOpen(true);
    }
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
  // Only compare the fields that are sent to the API: userId, dayOfWeek, startTime, endTime
  const hasUnpublishedChanges = useMemo(() => {
    // Quick length check
    if (shifts.length !== publishedShifts.length) {
      return true;
    }

    // Normalize both arrays to only include API-relevant fields
    const normalizeShift = (shift: Shift) => ({
      userId: shift.userId,
      dayOfWeek: shift.dayOfWeek,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });

    const normalizedShifts = shifts.map(normalizeShift);
    const normalizedPublished = publishedShifts.map(normalizeShift);

    // Sort both arrays by a stable key for comparison
    const sortKey = (s: ReturnType<typeof normalizeShift>) =>
      `${s.userId}-${s.dayOfWeek}-${s.startTime}-${s.endTime}`;

    const sortedShifts = [...normalizedShifts].sort((a, b) =>
      sortKey(a).localeCompare(sortKey(b)),
    );
    const sortedPublished = [...normalizedPublished].sort((a, b) =>
      sortKey(a).localeCompare(sortKey(b)),
    );

    // Element-wise comparison
    for (let i = 0; i < sortedShifts.length; i++) {
      const a = sortedShifts[i];
      const b = sortedPublished[i];
      if (
        a.userId !== b.userId ||
        a.dayOfWeek !== b.dayOfWeek ||
        a.startTime !== b.startTime ||
        a.endTime !== b.endTime
      ) {
        return true;
      }
    }

    return false;
  }, [shifts, publishedShifts]);

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
              shifts={shifts}
              onDragStart={dragDropHandlers.handleStaffDragStart}
              onDragEnd={dragDropHandlers.handleStaffDragEnd}
            />

            <ScheduleGrid
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

      <ShiftDetailsDialog
        shift={selectedShift}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}
