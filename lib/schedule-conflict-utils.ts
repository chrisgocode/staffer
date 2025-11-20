export interface ClassSchedule {
  days: string; // "MoWeFr", "TuTh", etc.
  startTime: string; // "12:30 pm"
  endTime: string; // "1:45 pm"
  dates: string;
}

export interface BlockedTimeRange {
  dayOfWeek: number; // 0-4 (Mon-Fri)
  startTime: string; // "12:30" (24-hour format)
  endTime: string; // "13:45" (24-hour format)
  source: "class" | "preference"; // Source of the blocked range
}

/**
 * Parse abbreviated day format to day indices
 * Mo=0, Tu=1, We=2, Th=3, Fr=4
 */
export function parseDaysToIndices(days: string): number[] {
  const dayMap: Record<string, number> = {
    Mo: 0,
    Tu: 1,
    We: 2,
    Th: 3,
    Fr: 4,
  };

  const indices: number[] = [];
  const dayPattern = /(Mo|Tu|We|Th|Fr)/g;
  let match;

  while ((match = dayPattern.exec(days)) !== null) {
    const dayIndex = dayMap[match[0]];
    if (dayIndex !== undefined && !indices.includes(dayIndex)) {
      indices.push(dayIndex);
    }
  }

  return indices.sort((a, b) => a - b);
}

/**
 * Convert 12-hour time format to 24-hour format
 * "12:30 pm" → "12:30"
 * "1:45 pm" → "13:45"
 * "9:00 am" → "09:00"
 */
export function parse12HourTo24Hour(time: string): string {
  const trimmed = time.trim().toLowerCase();
  const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);

  if (!match) {
    // If already in 24-hour format or invalid, return as-is
    return time;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3];

  if (period === "pm" && hours !== 12) {
    hours += 12;
  } else if (period === "am" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

/**
 * Get all blocked time ranges for a user on a specific day
 */
export function getBlockedRangesForUser(
  classSchedule: ClassSchedule[],
  dayOfWeek: number,
): BlockedTimeRange[] {
  const blockedRanges: BlockedTimeRange[] = [];

  for (const classItem of classSchedule) {
    const classDays = parseDaysToIndices(classItem.days);

    // Check if this class occurs on the requested day
    if (classDays.includes(dayOfWeek)) {
      blockedRanges.push({
        dayOfWeek,
        startTime: parse12HourTo24Hour(classItem.startTime),
        endTime: parse12HourTo24Hour(classItem.endTime),
        source: "class",
      });
    }
  }

  return blockedRanges;
}

/**
 * Convert a time string (24-hour format) to minutes since midnight
 * Handles both zero-padded ("09:00") and non-zero-padded ("9:00") formats
 * "9:00" → 540, "13:30" → 810, "09:00" → 540
 */
function parseTimeToMinutes(time: string): number {
  const match = time.trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Check if a shift time conflicts with any blocked time ranges
 * Returns true if there is a conflict
 */
export function doesShiftConflict(
  shiftStart: string,
  shiftEnd: string,
  blockedRanges: BlockedTimeRange[],
): boolean {
  // Normalize shift times to minutes since midnight for reliable comparison
  const shiftStartMinutes = parseTimeToMinutes(shiftStart);
  const shiftEndMinutes = parseTimeToMinutes(shiftEnd);

  for (const blocked of blockedRanges) {
    // Normalize blocked times to minutes since midnight
    const blockedStartMinutes = parseTimeToMinutes(blocked.startTime);
    const blockedEndMinutes = parseTimeToMinutes(blocked.endTime);

    // Check for any overlap between shift and blocked time
    // Overlap occurs if: shiftStart < blockedEnd AND shiftEnd > blockedStart
    if (
      shiftStartMinutes < blockedEndMinutes &&
      shiftEndMinutes > blockedStartMinutes
    ) {
      return true;
    }
  }

  return false;
}

interface SchedulePreferences {
  monday: {
    isFullDayOff: boolean;
    timeBlocks: Array<{ start: string; end: string }>;
  };
  tuesday: {
    isFullDayOff: boolean;
    timeBlocks: Array<{ start: string; end: string }>;
  };
  wednesday: {
    isFullDayOff: boolean;
    timeBlocks: Array<{ start: string; end: string }>;
  };
  thursday: {
    isFullDayOff: boolean;
    timeBlocks: Array<{ start: string; end: string }>;
  };
  friday: {
    isFullDayOff: boolean;
    timeBlocks: Array<{ start: string; end: string }>;
  };
}

/**
 * Get blocked time ranges from schedule preferences for a specific day and semester
 */
export function getBlockedRangesFromPreferences(
  preferences: Record<string, SchedulePreferences> | undefined,
  semester: string,
  dayOfWeek: number, // 0-4 (Mon-Fri)
): BlockedTimeRange[] {
  if (!preferences) return [];

  // Look up preferences for the specific semester
  const semesterPreferences = preferences[semester];
  if (!semesterPreferences) return [];

  const dayMap: Record<number, keyof SchedulePreferences> = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
  };

  const dayKey = dayMap[dayOfWeek];
  if (!dayKey) return [];

  const dayPref = semesterPreferences[dayKey];
  if (!dayPref) return [];

  // If full day is off, return a range covering entire day
  if (dayPref.isFullDayOff) {
    return [
      {
        dayOfWeek,
        startTime: "00:00",
        endTime: "23:59",
        source: "preference" as const,
      },
    ];
  }

  // Convert time blocks to blocked ranges
  return dayPref.timeBlocks.map((block) => ({
    dayOfWeek,
    startTime: block.start, // Already in "HH:MM" format
    endTime: block.end,
    source: "preference" as const,
  }));
}

/**
 * Get all blocked ranges combining class schedule and preferences for a specific semester
 */
export function getAllBlockedRanges(
  classSchedule: ClassSchedule[] | undefined,
  preferences: Record<string, SchedulePreferences> | undefined,
  semester: string,
  dayOfWeek: number,
): BlockedTimeRange[] {
  const classRanges = getBlockedRangesForUser(classSchedule ?? [], dayOfWeek);
  const preferenceRanges = getBlockedRangesFromPreferences(
    preferences,
    semester,
    dayOfWeek,
  );

  // Combine both sources of blocked ranges
  return [...classRanges, ...preferenceRanges];
}
