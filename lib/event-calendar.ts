export function formatCalendarDate(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function eventWeekDates(date: Date) {
	const sunday = new Date(date);
	sunday.setDate(date.getDate() - date.getDay());
	return Array.from({ length: 7 }, (_, index) => {
		const day = new Date(sunday);
		day.setDate(sunday.getDate() + index);
		return day;
	});
}

export function moveEventDay(date: Date, amount: number) {
	const next = new Date(date);
	next.setDate(date.getDate() + amount);
	return next;
}

export function eventsForDate<T extends { date: string }>(
	events: T[],
	date: Date,
) {
	const selectedDate = formatCalendarDate(date);
	return events.filter((event) => event.date === selectedDate);
}
