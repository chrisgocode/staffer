type SemesterRange = { startDate: string; endDate: string };
type Holiday = { date: string; isSubstitution: boolean };

export function dateInNewYork(date = new Date()) {
	if (!Number.isFinite(date.getTime())) throw new RangeError("Invalid date");
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/New_York",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const value = (type: "year" | "month" | "day") =>
		parts.find((part) => part.type === type)?.value;
	const year = value("year");
	const month = value("month");
	const day = value("day");
	if (!year || !month || !day) {
		throw new Error("Date formatter did not return year, month, and day");
	}
	return `${year}-${month}-${day}`;
}

function addDays(date: string, amount: number) {
	const next = new Date(`${date}T00:00:00Z`);
	next.setUTCDate(next.getUTCDate() + amount);
	return next.toISOString().slice(0, 10);
}

export function initialScheduleDate(today: string, semester?: SemesterRange) {
	let date = today;
	let direction = 1;
	if (semester && today < semester.startDate) date = semester.startDate;
	if (semester && today > semester.endDate) {
		date = semester.endDate;
		direction = -1;
	}
	const day = new Date(`${date}T00:00:00Z`).getUTCDay();
	if (day === 6) date = addDays(date, direction === 1 ? 2 : -1);
	if (day === 0) date = addDays(date, direction === 1 ? 1 : -2);
	if (semester && date > semester.endDate) {
		const endDay = new Date(`${semester.endDate}T00:00:00Z`).getUTCDay();
		if (endDay === 6) return addDays(semester.endDate, -1);
		if (endDay === 0) return addDays(semester.endDate, -2);
		return semester.endDate;
	}
	return date;
}

export function shiftsForDate<T extends { dayOfWeek: number }>({
	date,
	semester,
	shifts,
	holidays,
}: {
	date: string;
	semester?: SemesterRange;
	shifts: T[];
	holidays: Holiday[];
}) {
	if (semester && (date < semester.startDate || date > semester.endDate)) {
		return [];
	}
	const holiday = holidays.find((holiday) => holiday.date === date);
	if (holiday && !holiday.isSubstitution) return [];
	const dayOfWeek = holiday?.isSubstitution
		? 0
		: new Date(`${date}T00:00:00Z`).getUTCDay() - 1;
	return shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);
}
