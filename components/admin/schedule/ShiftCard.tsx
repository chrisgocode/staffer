import { X } from "lucide-react";
import { getShiftPosition } from "@/lib/schedule-utils";
import type { Shift } from "@/lib/types";
import type { Id } from "@/convex/_generated/dataModel";
import type { ShiftLayout } from "@/lib/shift-layout-utils";

interface ShiftCardProps {
  shift: Shift;
  displayShift: Shift;
  isDragging: boolean;
  isMoving: boolean;
  layout?: ShiftLayout;
  onDragStart: (e: React.DragEvent, shift: Shift) => void;
  onDragEnd: () => void;
  onClick: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent, shiftId: Id<"staffShifts">) => void;
  onMouseDownTop: (e: React.MouseEvent, shift: Shift) => void;
  onMouseDownBottom: (e: React.MouseEvent, shift: Shift) => void;
}

export function ShiftCard({
  shift,
  displayShift,
  isDragging,
  isMoving,
  layout,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  onMouseDownTop,
  onMouseDownBottom,
}: ShiftCardProps) {
  const position = getShiftPosition(
    displayShift.startTime,
    displayShift.endTime,
  );

  // Use layout positioning if provided, otherwise use default
  const positioningClass = layout ? "absolute" : "absolute left-1 right-1";
  // Cap z-index at 40 to ensure dialogs (z-50) appear above shift cards
  const safeZIndex = Math.min(shift.zIndex, 40);
  const positioningStyle = layout
    ? {
        top: position.top,
        height: position.height,
        zIndex: safeZIndex,
        left: layout.left,
        width: layout.width,
      }
    : {
        top: position.top,
        height: position.height,
        zIndex: safeZIndex,
      };

  return (
    <div
      draggable={!isDragging}
      onDragStart={(e) => onDragStart(e, shift)}
      onDragEnd={onDragEnd}
      className={`${positioningClass} rounded-md border-l-2 p-2 pointer-events-auto transition-all ${
        shift.color
      } ${
        isDragging
          ? "ring-2 ring-primary shadow-lg"
          : "hover:scale-[1.02] cursor-move hover:shadow-md"
      } ${isMoving ? "opacity-30" : ""}`}
      style={positioningStyle}
      onClick={onClick}
    >
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 transition-colors"
        onMouseDown={(e) => onMouseDownTop(e, shift)}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />

      {/* Delete button */}
      <button
        onClick={(e) => onDelete(e, shift._id)}
        className="absolute top-1 right-1 p-0.5 rounded hover:bg-red-500/20 transition-colors"
        style={{ opacity: 1 }}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      >
        <X className="h-3 w-3 text-red-600" />
      </button>

      {/* Shift content */}
      <div className="text-xs font-semibold truncate pr-5">
        {displayShift.userName}
      </div>
      <div className="text-xs opacity-80 truncate">Student Staff</div>
      {!layout && (
        <div className="text-xs opacity-70 mt-1">
          {displayShift.startTime} - {displayShift.endTime}
        </div>
      )}

      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/20 transition-colors"
        onMouseDown={(e) => onMouseDownBottom(e, shift)}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
}
