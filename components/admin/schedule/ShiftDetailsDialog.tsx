import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shift Details</DialogTitle>
        </DialogHeader>
        {!shift ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : (
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
              <p className="text-base">
                {shift &&
                shift.dayOfWeek !== undefined &&
                Number.isInteger(shift.dayOfWeek) &&
                shift.dayOfWeek >= 0 &&
                shift.dayOfWeek < dayNames.length
                  ? dayNames[shift.dayOfWeek]
                  : "Unknown day"}
              </p>
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
        )}
      </DialogContent>
    </Dialog>
  );
}

function calculateDuration(startTime: string, endTime: string): string {
  // Validate input format with HH:MM regex
  const timeRegex = /^\d{1,2}:\d{2}$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return "Invalid time";
  }

  // Parse hours and minutes as integers
  const startParts = startTime.split(":");
  const endParts = endTime.split(":");
  const startH = parseInt(startParts[0], 10);
  const startM = parseInt(startParts[1], 10);
  const endH = parseInt(endParts[0], 10);
  const endM = parseInt(endParts[1], 10);

  // Guard against NaN
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return "Invalid time";
  }

  // Compute duration in minutes
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  let durationMinutes = endTotal - startTotal;

  // Handle overnight shifts (negative or zero duration)
  if (durationMinutes <= 0) {
    durationMinutes += 24 * 60;
  }

  // Derive hours and minutes
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  // Format output with proper pluralization
  if (hours === 0 && minutes === 0) {
    return "0 minutes";
  }
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
