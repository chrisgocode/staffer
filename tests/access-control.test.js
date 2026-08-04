import { describe, expect, test } from "bun:test";
import {
	grantsFromEnvironment,
	normalizeEmail,
} from "../convex/accessControl";

describe("access control email parsing", () => {
	test("normalizes and deduplicates emails", () => {
		expect(normalizeEmail("  Person@BU.EDU ")).toBe("person@bu.edu");
		expect(
			[...grantsFromEnvironment("Admin@BU.edu, admin@bu.edu", "student@bu.edu")],
		).toEqual([
			["admin@bu.edu", "ADMIN"],
			["student@bu.edu", "STUDENT"],
		]);
	});

	test("rejects conflicting roles", () => {
		expect(() =>
			grantsFromEnvironment("person@bu.edu", "PERSON@BU.EDU"),
		).toThrow("person@bu.edu is listed as both ADMIN and STUDENT");
	});
});
