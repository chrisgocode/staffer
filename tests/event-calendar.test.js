import { describe, expect, test } from "bun:test";
import {
	eventsForDate,
	eventWeekDates,
	formatCalendarDate,
	moveEventDay,
} from "../lib/event-calendar";

const events = [
	{ _id: "friday", date: "2026-03-06" },
	{ _id: "saturday", date: "2026-03-07" },
];

describe("event calendar dates", () => {
	test("shows only events on the selected mobile day", () => {
		expect(eventsForDate(events, new Date(2026, 2, 7))).toEqual([
			{ _id: "saturday", date: "2026-03-07" },
		]);
	});

	test("builds event weeks from Sunday through Saturday", () => {
		expect(
			eventWeekDates(new Date(2026, 2, 4)).map(formatCalendarDate),
		).toEqual([
			"2026-03-01",
			"2026-03-02",
			"2026-03-03",
			"2026-03-04",
			"2026-03-05",
			"2026-03-06",
			"2026-03-07",
		]);
	});

	test("moves through weekend days without skipping them", () => {
		expect(formatCalendarDate(moveEventDay(new Date(2026, 2, 6), 1))).toBe(
			"2026-03-07",
		);
	});
});
