import { describe, expect, test } from "bun:test";
import { createAccessGrantSearch } from "../components/admin/settings/access-grant-search";

const grants = [
	{ name: "Christopher Smith", email: "csmith@bu.edu" },
	{ name: "Jordan Lee", email: "jlee@bu.edu" },
	{ name: "Taylor Morgan", email: "tmorgan@bu.edu" },
];

describe("access grant search", () => {
	test("ranks exact email matches and tolerates misspelled names", () => {
		const search = createAccessGrantSearch(grants);

		expect(search.search("jlee@bu.edu")[0]?.item).toBe(grants[1]);
		expect(search.search("Cristopher")[0]?.item).toBe(grants[0]);
	});
});
