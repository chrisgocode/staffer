import Fuse from "fuse.js";

export type SearchableAccessGrant = {
	email: string;
	name?: string;
};

export function createAccessGrantSearch<T extends SearchableAccessGrant>(
	grants: T[],
) {
	return new Fuse(grants, {
		keys: ["name", "email"],
		threshold: 0.35,
		ignoreLocation: true,
	});
}
