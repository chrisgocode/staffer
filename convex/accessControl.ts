export type AccessRole = "ADMIN" | "STUDENT";

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function grantsFromEnvironment(
	adminEmails: string | undefined,
	studentEmails: string | undefined,
): Map<string, AccessRole> {
	const grants = new Map<string, AccessRole>();

	for (const [value, role] of [
		[adminEmails, "ADMIN"],
		[studentEmails, "STUDENT"],
	] as const) {
		for (const rawEmail of value?.split(",") ?? []) {
			const email = normalizeEmail(rawEmail);
			if (!email) continue;

			const existingRole = grants.get(email);
			if (existingRole && existingRole !== role) {
				throw new Error(`${email} is listed as both ADMIN and STUDENT`);
			}
			grants.set(email, role);
		}
	}

	return grants;
}
