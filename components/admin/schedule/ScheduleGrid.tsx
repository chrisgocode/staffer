import { timeSlots, daysOfWeek } from "@/lib/schedule-utils";
import { DayColumn } from "./DayColumn";
import type { Shift, DropPreview } from "@/lib/types";
import type { Id } from "@/convex/_generated/dataModel";
import type { BlockedTimeRange } from "@/lib/schedule-conflict-utils";

interface ScheduleGridProps {
  shifts: Shift[];
  dropPreview: DropPreview | null;
  movingShift: Shift | null;
  draggingShift: Id<"staffShifts"> | null;
  tempShift: Shift | null;
  blockedRanges: Record<number, BlockedTimeRange[]> | null;
  containerRef: React.RefObject<HTMLDivElement>;
  onDeleteShift: (args: { shiftId: Id<"staffShifts"> }) => void;
  onShiftClick: (shiftId: Id<"staffShifts">) => void;
  onShiftDragStart: (e: React.DragEvent, shift: Shift) => void;
  onShiftDragEnd: () => void;
  onDayDragOver: (e: React.DragEvent, dayIndex: number) => void;
  onDayDragLeave: () => void;
  onDayDrop: (e: React.DragEvent, dayIndex: number) => void;
  onMouseDownTop: (
    e: React.MouseEvent,
    shift: Shift,
    edge: "top" | "bottom",
  ) => void;
  onMouseDownBottom: (
    e: React.MouseEvent,
    shift: Shift,
    edge: "top" | "bottom",
  ) => void;
}

export function ScheduleGrid({
  shifts,
  dropPreview,
  movingShift,
  draggingShift,
  tempShift,
  blockedRanges,
  containerRef,
  onDeleteShift,
  onShiftClick,
  onShiftDragStart,
  onShiftDragEnd,
  onDayDragOver,
  onDayDragLeave,
  onDayDrop,
  onMouseDownTop,
  onMouseDownBottom,
}: ScheduleGridProps) {
  const handleShiftClick = (
    e: React.MouseEvent,
    shiftId: Id<"staffShifts">,
  ) => {
    if (!draggingShift) {
      e.stopPropagation();
      onShiftClick(shiftId);
    }
  };

  const handleShiftDelete = (
    e: React.MouseEvent,
    shiftId: Id<"staffShifts">,
  ) => {
    e.stopPropagation();
    onDeleteShift({ shiftId });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day Headers */}
      <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-muted/50 border-b border-border">
        <div className="p-3 text-xs font-medium text-muted-foreground">
          Time
        </div>
        {daysOfWeek.map((day) => (
          <div key={day} className="p-3 text-center border-l border-border">
            <div className="text-sm font-semibold text-foreground">{day}</div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-[80px_repeat(5,1fr)] relative">
        {/* Time Labels */}
        <div className="border-r border-border">
          {timeSlots.map((time) => (
            <div
              key={time}
              className="h-16 px-3 py-2 text-xs text-muted-foreground border-b border-border last:border-b-0"
            >
              {time}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {[0, 1, 2, 3, 4].map((dayIndex) => (
          <DayColumn
            key={dayIndex}
            dayIndex={dayIndex}
            shifts={shifts}
            dropPreview={dropPreview}
            movingShift={movingShift}
            draggingShift={draggingShift}
            tempShift={tempShift}
            blockedRanges={blockedRanges?.[dayIndex] || null}
            containerRef={dayIndex === 0 ? containerRef : undefined}
            onDragOver={(e) => onDayDragOver(e, dayIndex)}
            onDragLeave={onDayDragLeave}
            onDrop={(e) => onDayDrop(e, dayIndex)}
            onShiftDragStart={onShiftDragStart}
            onShiftDragEnd={onShiftDragEnd}
            onShiftClick={handleShiftClick}
            onShiftDelete={handleShiftDelete}
            onMouseDownTop={(e, shift) => onMouseDownTop(e, shift, "top")}
            onMouseDownBottom={(e, shift) =>
              onMouseDownBottom(e, shift, "bottom")
            }
          />
        ))}
      </div>
    </div>
  );
}
