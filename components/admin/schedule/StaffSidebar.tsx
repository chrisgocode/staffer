import { GripVertical } from "lucide-react";
import type { StaffMember, Shift } from "@/lib/types";

interface StaffSidebarProps {
  staffMembers: StaffMember[];
  shifts: Shift[];
  onDragStart: (staff: StaffMember) => void;
  onDragEnd: () => void;
}

function calculateStaffHours(userId: string, shifts: Shift[]): number {
  const staffShifts = shifts.filter((shift) => shift.userId === userId);

  let totalHours = 0;
  for (const shift of staffShifts) {
    // Validate and parse startTime
    const startParts = shift.startTime.split(":");
    if (startParts.length !== 2) {
      console.warn(`Invalid startTime format for shift: ${shift.startTime}`);
      continue;
    }
    const startHour = Number(startParts[0]);
    const startMin = Number(startParts[1]);
    if (!Number.isFinite(startHour) || !Number.isFinite(startMin)) {
      console.warn(`Invalid startTime numbers for shift: ${shift.startTime}`);
      continue;
    }

    // Validate and parse endTime
    const endParts = shift.endTime.split(":");
    if (endParts.length !== 2) {
      console.warn(`Invalid endTime format for shift: ${shift.endTime}`);
      continue;
    }
    const endHour = Number(endParts[0]);
    const endMin = Number(endParts[1]);
    if (!Number.isFinite(endHour) || !Number.isFinite(endMin)) {
      console.warn(`Invalid endTime numbers for shift: ${shift.endTime}`);
      continue;
    }

    // Convert to total minutes
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle midnight-spanning shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    // Compute difference in hours
    const hours = (endMinutes - startMinutes) / 60;
    totalHours += hours;
  }

  return totalHours;
}

export function StaffSidebar({
  staffMembers,
  shifts,
  onDragStart,
  onDragEnd,
}: StaffSidebarProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Student Staff ({staffMembers.length})
      </h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {staffMembers.map((staff) => {
          const hours = calculateStaffHours(staff._id, shifts);
          return (
            <div
              key={staff._id}
              draggable
              onDragStart={(e) => {
                onDragStart(staff);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-2 p-3 rounded-lg border ${staff.color} cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium">{staff.name}</div>
                <div className="text-xs text-muted-foreground">
                  {hours === 0
                    ? "No shifts"
                    : `${hours} hour${hours !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
