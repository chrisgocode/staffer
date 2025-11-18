import { timeSlots } from "@/lib/schedule-utils";
import { getShiftPosition } from "@/lib/schedule-utils";
import { ShiftCard } from "./ShiftCard";
import { BlockedTimeOverlay } from "./BlockedTimeOverlay";
import { calculateShiftLayout } from "@/lib/shift-layout-utils";
import type { Shift, DropPreview } from "@/lib/types";
import type { Id } from "@/convex/_generated/dataModel";
import type { BlockedTimeRange } from "@/lib/schedule-conflict-utils";

interface DayColumnProps {
  dayIndex: number;
  shifts: Shift[];
  dropPreview: DropPreview | null;
  movingShift: Shift | null;
  draggingShift: Id<"staffShifts"> | null;
  tempShift: Shift | null;
  blockedRanges: BlockedTimeRange[] | null;
  containerRef?: React.RefObject<HTMLDivElement>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onShiftDragStart: (e: React.DragEvent, shift: Shift) => void;
  onShiftDragEnd: () => void;
  onShiftClick: (e: React.MouseEvent, shiftId: Id<"staffShifts">) => void;
  onShiftDelete: (e: React.MouseEvent, shiftId: Id<"staffShifts">) => void;
  onMouseDownTop: (e: React.MouseEvent, shift: Shift) => void;
  onMouseDownBottom: (e: React.MouseEvent, shift: Shift) => void;
}

export function DayColumn({
  dayIndex,
  shifts,
  dropPreview,
  movingShift,
  draggingShift,
  tempShift,
  blockedRanges,
  containerRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onShiftDragStart,
  onShiftDragEnd,
  onShiftClick,
  onShiftDelete,
  onMouseDownTop,
  onMouseDownBottom,
}: DayColumnProps) {
  const dayShifts = shifts.filter((shift) => shift.dayOfWeek === dayIndex);

  // Calculate layout information for overlapping shifts
  const shiftLayouts = calculateShiftLayout(shifts, dayIndex);

  return (
    <div
      className="relative border-l border-border"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Time slot backgrounds */}
      {timeSlots.map((time, index) => (
        <div
          key={time}
          className={`h-16 border-b border-border last:border-b-0 transition-colors ${
            index % 2 === 0 ? "bg-muted/10" : ""
          } ${
            dropPreview?.day === dayIndex && dropPreview?.startTime === time
              ? "bg-primary/20"
              : "hover:bg-muted/30"
          }`}
        />
      ))}

      {/* Blocked time overlay */}
      {blockedRanges && (
        <BlockedTimeOverlay blockedRanges={blockedRanges} dayIndex={dayIndex} />
      )}

      {/* Drop preview */}
      {dropPreview && dropPreview.day === dayIndex && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={`absolute left-1 right-1 rounded-md border-2 border-dashed border-primary ${dropPreview.color} opacity-50`}
            style={getShiftPosition(dropPreview.startTime, dropPreview.endTime)}
          >
            <div className="p-2">
              <div className="text-xs font-semibold">
                {dropPreview.startTime} - {dropPreview.endTime}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shifts */}
      <div
        className="absolute inset-0 pointer-events-none"
        ref={dayIndex === 0 ? containerRef : null}
      >
        {dayShifts
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((shift) => {
            const displayShift =
              draggingShift === shift._id && tempShift ? tempShift : shift;
            const isDragging = draggingShift === shift._id;
            const isMoving = movingShift?._id === shift._id;

            return (
              <ShiftCard
                key={shift._id}
                shift={shift}
                displayShift={displayShift}
                isDragging={isDragging}
                isMoving={isMoving}
                layout={shiftLayouts.get(shift._id)}
                onDragStart={onShiftDragStart}
                onDragEnd={onShiftDragEnd}
                onClick={(e) => onShiftClick(e, shift._id)}
                onDelete={onShiftDelete}
                onMouseDownTop={onMouseDownTop}
                onMouseDownBottom={onMouseDownBottom}
              />
            );
          })}
      </div>
    </div>
  );
}
