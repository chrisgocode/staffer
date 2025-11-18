import type { Shift } from "./types";

export interface ShiftLayout {
  column: number;
  totalColumns: number;
  width: string;
  left: string;
}

export function shiftsOverlap(shift1: Shift, shift2: Shift): boolean {
  // Shifts must be on the same day
  if (shift1.dayOfWeek !== shift2.dayOfWeek) {
    return false;
  }

  // Parse times to compare
  const start1 = parseTimeToMinutes(shift1.startTime);
  const end1 = parseTimeToMinutes(shift1.endTime);
  const start2 = parseTimeToMinutes(shift2.startTime);
  const end2 = parseTimeToMinutes(shift2.endTime);

  // Check for overlap: start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function findOverlappingShifts(shift: Shift, allShifts: Shift[]): Shift[] {
  return allShifts.filter(
    (other) => other._id !== shift._id && shiftsOverlap(shift, other),
  );
}

/**
 * Calculate layout information for all shifts in a day
 * Returns a Map of shift ID to layout info
 */
export function calculateShiftLayout(
  shifts: Shift[],
  dayIndex: number,
): Map<string, ShiftLayout> {
  const layoutMap = new Map<string, ShiftLayout>();

  // Filter shifts for this specific day
  const dayShifts = shifts.filter((s) => s.dayOfWeek === dayIndex);

  if (dayShifts.length === 0) {
    return layoutMap;
  }

  // Sort shifts by start time, then by end time (longer shifts first if same start)
  const sortedShifts = [...dayShifts].sort((a, b) => {
    const startCompare = a.startTime.localeCompare(b.startTime);
    if (startCompare !== 0) return startCompare;
    // If same start time, longer shift comes first
    return b.endTime.localeCompare(a.endTime);
  });

  // Build overlap groups - shifts that need to share space
  const processed = new Set<string>();
  const overlapGroups: Shift[][] = [];

  for (const shift of sortedShifts) {
    if (processed.has(shift._id)) continue;

    // Find all shifts that overlap with this one
    const group = [shift];
    const queue = [shift];
    processed.add(shift._id);

    // BFS to find all connected overlapping shifts
    while (queue.length > 0) {
      const current = queue.shift()!;
      const overlapping = findOverlappingShifts(current, sortedShifts);

      for (const overlappingShift of overlapping) {
        if (!processed.has(overlappingShift._id)) {
          processed.add(overlappingShift._id);
          group.push(overlappingShift);
          queue.push(overlappingShift);
        }
      }
    }

    overlapGroups.push(group);
  }

  // Assign columns to each group
  for (const group of overlapGroups) {
    if (group.length === 1) {
      // Single shift, takes full width
      layoutMap.set(group[0]._id, {
        column: 0,
        totalColumns: 1,
        width: "calc(100% - 8px)",
        left: "4px",
      });
    } else {
      // Multiple overlapping shifts - need to assign columns
      const columnAssignments = assignColumnsToShifts(group);
      const maxColumn = Math.max(...Array.from(columnAssignments.values()));
      const totalColumns = maxColumn + 1;

      for (const shift of group) {
        const column = columnAssignments.get(shift._id)!;
        const widthPercent = 100 / totalColumns;
        const leftPercent = (column * 100) / totalColumns;

        layoutMap.set(shift._id, {
          column,
          totalColumns,
          width: `calc(${widthPercent}% - 8px)`,
          left: `calc(${leftPercent}% + 4px)`,
        });
      }
    }
  }

  return layoutMap;
}

/**
 * Assign column positions to overlapping shifts
 * Uses a greedy algorithm similar to interval scheduling
 */
function assignColumnsToShifts(shifts: Shift[]): Map<string, number> {
  const columnAssignments = new Map<string, number>();

  // Sort by start time, then by duration (longer first)
  const sorted = [...shifts].sort((a, b) => {
    const startCompare = a.startTime.localeCompare(b.startTime);
    if (startCompare !== 0) return startCompare;
    return b.endTime.localeCompare(a.endTime);
  });

  // Track which column ends at what time
  const columnEndTimes: string[] = [];

  for (const shift of sorted) {
    // Find the first column that's available (ended before this shift starts)
    let assignedColumn = -1;

    for (let col = 0; col < columnEndTimes.length; col++) {
      if (columnEndTimes[col] <= shift.startTime) {
        assignedColumn = col;
        columnEndTimes[col] = shift.endTime;
        break;
      }
    }

    // If no column available, create a new one
    if (assignedColumn === -1) {
      assignedColumn = columnEndTimes.length;
      columnEndTimes.push(shift.endTime);
    }

    columnAssignments.set(shift._id, assignedColumn);
  }

  return columnAssignments;
}
