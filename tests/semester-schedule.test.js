import { describe, expect, test } from "bun:test";
import { resolveStudentSemesters } from "../lib/semester-schedule";

const semesters = [
	{ semester: "Spring 2026", startDate: "2026-01-20", endDate: "2026-05-06" },
	{ semester: "Summer 2026", startDate: "2026-05-19", endDate: "2026-08-14" },
	{ semester: "Fall 2026", startDate: "2026-09-02", endDate: "2026-12-10" },
	{ semester: "Spring 2027", startDate: "2027-01-19", endDate: "2027-05-05" },
];

describe("student semester visibility", () => {
	test("opens the semester containing today", () => {
		expect(
			resolveStudentSemesters({
				semesters,
				publishedSchedules: [],
				today: "2026-03-01",
			}),
		).toEqual({
			defaultSemester: "Spring 2026",
			allowedSemesters: ["Spring 2026"],
		});
	});

	test("offers only the immediately upcoming published semester", () => {
		expect(
			resolveStudentSemesters({
				semesters,
				publishedSchedules: [
					{ semester: "Summer 2026", createdAt: 1 },
					{ semester: "Fall 2026", createdAt: 2 },
				],
				today: "2026-04-15",
			}),
		).toEqual({
			defaultSemester: "Spring 2026",
			allowedSemesters: ["Spring 2026", "Summer 2026"],
		});
	});

	test("opens the upcoming semester in a gap when its schedule is published", () => {
		expect(
			resolveStudentSemesters({
				semesters,
				publishedSchedules: [{ semester: "Summer 2026", createdAt: 1 }],
				today: "2026-05-12",
			}),
		).toEqual({
			defaultSemester: "Summer 2026",
			allowedSemesters: ["Summer 2026"],
		});
	});

	test("keeps the most recent semester visible in a gap until the next is published", () => {
		expect(
			resolveStudentSemesters({
				semesters,
				publishedSchedules: [{ semester: "Spring 2026", createdAt: 1 }],
				today: "2026-05-12",
			}),
		).toEqual({
			defaultSemester: "Spring 2026",
			allowedSemesters: ["Spring 2026"],
		});
	});

	test("falls back to the most recently published schedule without semester dates", () => {
		expect(
			resolveStudentSemesters({
				semesters: [],
				publishedSchedules: [
					{ semester: "Fall 2025", createdAt: 1 },
					{ semester: "Spring 2026", createdAt: 2 },
				],
				today: "2026-03-01",
			}),
		).toEqual({
			defaultSemester: "Spring 2026",
			allowedSemesters: ["Spring 2026"],
		});
	});

	test("offers a published Fall schedule during Summer", () => {
		expect(
			resolveStudentSemesters({
				semesters,
				publishedSchedules: [{ semester: "Fall 2026", createdAt: 1 }],
				today: "2026-07-01",
			}),
		).toEqual({
			defaultSemester: "Summer 2026",
			allowedSemesters: ["Summer 2026", "Fall 2026"],
		});
	});

	test("does not preview Spring before Fall has ended", () => {
		expect(
			resolveStudentSemesters({
				semesters,
				publishedSchedules: [{ semester: "Spring 2027", createdAt: 1 }],
				today: "2026-11-01",
			}),
		).toEqual({
			defaultSemester: "Fall 2026",
			allowedSemesters: ["Fall 2026"],
		});
	});

	test("returns no semester when no semester or published schedule exists", () => {
		expect(
			resolveStudentSemesters({
				semesters: [],
				publishedSchedules: [],
				today: "2026-03-01",
			}),
		).toEqual({ defaultSemester: undefined, allowedSemesters: [] });
	});
});
