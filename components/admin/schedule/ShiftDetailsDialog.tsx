import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Shift } from "@/lib/types";

interface ShiftDetailsDialogProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function ShiftDetailsDialog({
  shift,
  isOpen,
  onClose,
}: ShiftDetailsDialogProps) {
  if (!shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shift Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Staff Member
            </label>
            <p className="text-lg font-semibold">{shift.userName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Day
            </label>
            <p className="text-base">{dayNames[shift.dayOfWeek]}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Start Time
              </label>
              <p className="text-base">{shift.startTime}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                End Time
              </label>
              <p className="text-base">{shift.endTime}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Duration
            </label>
            <p className="text-base">
              {calculateDuration(shift.startTime, shift.endTime)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function calculateDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const durationMinutes = endH * 60 + endM - (startH * 60 + startM);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
