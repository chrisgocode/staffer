import { getShiftPosition } from "@/lib/schedule-utils";
import type { BlockedTimeRange } from "@/lib/schedule-conflict-utils";

interface BlockedTimeOverlayProps {
  blockedRanges: BlockedTimeRange[];
  dayIndex: number;
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
          const position = getShiftPosition(range.startTime, range.endTime);
          return (
            <div
              key={`${range.dayOfWeek}-${range.startTime}-${index}`}
              className="absolute left-0 right-0 bg-red-500/20 bg-stripe-pattern border-2 border-red-400/50 rounded-md"
              style={{
                top: position.top,
                height: position.height,
              }}
            >
              <div className="flex items-center justify-center h-full">
                <span className="text-xs font-semibold text-red-600 bg-white/80 px-2 py-1 rounded">
                  Class Time
                </span>
              </div>
            </div>
          );
        })}
    </div>
  );
}
