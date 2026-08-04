import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { getConvexErrorMessage } from "../lib/convex-error";

describe("Convex error messages", () => {
	test("shows messages from intentional application errors", () => {
		expect(
			getConvexErrorMessage(
				new ConvexError("Enter a valid email"),
				"Could not grant access",
			),
		).toBe("Enter a valid email");
	});

	test("falls back instead of exposing unknown errors", () => {
		expect(
			getConvexErrorMessage(new Error("Database connection details"), "Failed"),
		).toBe("Failed");
		expect(getConvexErrorMessage(null, "Failed")).toBe("Failed");
	});
});
