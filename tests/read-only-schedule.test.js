import { describe, expect, test } from "bun:test";
import {
	dateInNewYork,
	initialScheduleDate,
	shiftsForDate,
} from "../lib/read-only-schedule";

const shifts = [
	{ _id: "monday", dayOfWeek: 0 },
	{ _id: "tuesday", dayOfWeek: 1 },
];
const semester = { startDate: "2026-01-20", endDate: "2026-05-06" };

describe("read-only schedule dates", () => {
	test("hides recurring shifts on closure dates", () => {
		expect(
			shiftsForDate({
				date: "2026-02-17",
				semester,
				shifts,
				holidays: [
					{
						date: "2026-02-17",
						name: "University closed",
						isSubstitution: false,
					},
				],
			}),
		).toEqual([]);
	});

	test("shows Monday shifts on a substitution day", () => {
		expect(
			shiftsForDate({
				date: "2026-02-17",
				semester,
				shifts,
				holidays: [
					{ date: "2026-02-17", name: "Monday schedule", isSubstitution: true },
				],
			}),
		).toEqual([{ _id: "monday", dayOfWeek: 0 }]);
	});

	test("opens the next Monday on weekends", () => {
		expect(initialScheduleDate("2026-03-07")).toBe("2026-03-09");
		expect(initialScheduleDate("2026-03-08")).toBe("2026-03-09");
	});

	test("opens the nearest in-semester weekday for fallback schedules", () => {
		expect(initialScheduleDate("2026-05-12", semester)).toBe("2026-05-06");
	});

	test("uses Friday when a semester ends on a weekend", () => {
		const weekendEnd = { startDate: "2026-01-20", endDate: "2026-05-09" };
		expect(initialScheduleDate("2026-05-09", weekendEnd)).toBe("2026-05-08");
		expect(initialScheduleDate("2026-05-10", weekendEnd)).toBe("2026-05-08");
	});

	test("uses the New York calendar date at UTC boundaries", () => {
		expect(dateInNewYork(new Date("2026-03-01T01:00:00Z"))).toBe("2026-02-28");
	});
});
