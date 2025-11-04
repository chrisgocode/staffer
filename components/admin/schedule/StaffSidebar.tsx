import { GripVertical } from "lucide-react";
import type { StaffMember } from "@/lib/types";

interface StaffSidebarProps {
  staffMembers: StaffMember[];
  onDragStart: (staff: StaffMember) => void;
  onDragEnd: () => void;
}

export function StaffSidebar({
  staffMembers,
  onDragStart,
  onDragEnd,
}: StaffSidebarProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Student Staff ({staffMembers.length})
      </h3>
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {staffMembers.map((staff) => (
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
              <div className="text-xs text-muted-foreground">Student Staff</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
