import { getShiftPosition } from "@/lib/schedule-utils";
import type { BlockedTimeRange } from "@/lib/schedule-conflict-utils";

interface BlockedTimeOverlayProps {
  blockedRanges: BlockedTimeRange[];
  dayIndex: number;
}

/**
 * Clamp a time string to the valid schedule range (08:00 - 21:00)
 */
function clampTimeToScheduleRange(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;

  // Clamp to 8 AM (480 minutes) - 9 PM (1260 minutes)
  const minMinutes = 8 * 60; // 480
  const maxMinutes = 21 * 60; // 1260
  const clampedMinutes = Math.max(
    minMinutes,
    Math.min(totalMinutes, maxMinutes),
  );

  const clampedHours = Math.floor(clampedMinutes / 60);
  const clampedMins = clampedMinutes % 60;

  return `${clampedHours.toString().padStart(2, "0")}:${clampedMins.toString().padStart(2, "0")}`;
}

export function BlockedTimeOverlay({
  blockedRanges,
  dayIndex,
}: BlockedTimeOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {blockedRanges
        .filter((range) => range.dayOfWeek === dayIndex)
        .map((range, index) => {
          // Clamp times to valid schedule range before calculating position
          const clampedStart = clampTimeToScheduleRange(range.startTime);
          const clampedEnd = clampTimeToScheduleRange(range.endTime);

          // Skip if clamped times are invalid (e.g., start >= end after clamping)
          if (clampedStart >= clampedEnd) {
            return null;
          }

          const position = getShiftPosition(clampedStart, clampedEnd);
          const isPreference = range.source === "preference";
          const label = isPreference ? "Preference" : "Class Time";
          const bgColor = isPreference
            ? "bg-amber-500/20 bg-stripe-pattern"
            : "bg-red-500/20 bg-stripe-pattern";
          const borderColor = isPreference
            ? "border-amber-400/50"
            : "border-red-400/50";
          const textColor = isPreference ? "text-amber-700" : "text-red-600";

          return (
            <div
              key={`${range.dayOfWeek}-${range.startTime}-${index}`}
              className={`absolute left-0 right-0 ${bgColor} border-2 ${borderColor} rounded-md`}
              style={{
                top: position.top,
                height: position.height,
              }}
            >
              <div className="flex items-center justify-center h-full">
                <span
                  className={`text-xs font-semibold ${textColor} bg-white/80 px-2 py-1 rounded`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
