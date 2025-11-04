export function getShiftPosition(startTime: string, endTime: string) {
  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours + minutes / 60;
  };

  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const duration = end - start;

  // Calculate position relative to 8 AM start
  const top = ((start - 8) / 13) * 100; // 13 hours total (8 AM to 9 PM)
  const height = (duration / 13) * 100;

  return { top: `${top}%`, height: `${height}%` };
}

export function snapToQuarterHour(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const roundedMinutes = Math.round(minutes / 15) * 15;

  if (roundedMinutes === 60) {
    return `${(hours + 1).toString().padStart(2, "0")}:00`;
  }

  return `${hours.toString().padStart(2, "0")}:${roundedMinutes.toString().padStart(2, "0")}`;
}

export function positionToTime(topPercent: number, heightPercent: number) {
  const startHour = 8 + (topPercent / 100) * 13;
  const endHour = startHour + (heightPercent / 100) * 13;

  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  return {
    startTime: snapToQuarterHour(
      formatTime(Math.max(8, Math.min(20, startHour))),
    ),
    endTime: snapToQuarterHour(formatTime(Math.max(8, Math.min(21, endHour)))),
  };
}

export function calculateSnappedTime(percentY: number, duration?: number) {
  const hourOffset = (percentY / 100) * 13;
  const totalMinutes = (8 + hourOffset) * 60;
  const snappedMinutes = Math.round(totalMinutes / 15) * 15;

  const startHour = Math.floor(snappedMinutes / 60);
  const startMin = snappedMinutes % 60;
  const startTime = `${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;

  if (duration) {
    const endMinutes = snappedMinutes + duration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, "0")}:${endMin.toString().padStart(2, "0")}`;
    return { startTime, endTime };
  }

  return { startTime, endTime: startTime };
}

export function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust to Monday

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);

  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export const semesterOptions = [
  "Fall 2025",
  "Spring 2026",
  "Summer 2026",
  "Fall 2026",
  "Spring 2027",
  "Summer 2027",
];
