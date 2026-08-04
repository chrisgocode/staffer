import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import { grantsFromEnvironment, normalizeEmail } from "./accessControl";

function generateSecureToken(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
	callbacks: {
		async afterUserCreatedOrUpdated(ctx, args) {
			// Convex Auth exposes an untyped callback context even though this runs
			// inside our app's mutation transaction.
			const db = ctx.db as unknown as MutationCtx["db"];
			const email = normalizeEmail(args.profile.email ?? "");
			if (!email) throw new Error("Google did not provide an email address");

			const existingUserGrant = await db
				.query("accessGrants")
				.withIndex("by_user", (q) => q.eq("userId", args.userId))
				.unique();
			let grant = await db
				.query("accessGrants")
				.withIndex("by_email", (q) => q.eq("email", email))
				.unique();
			if (existingUserGrant && existingUserGrant._id !== grant?._id) {
				throw new Error("This account is linked to another access grant");
			}

			if (!grant) {
				// remove after grants are migrated.
				const role = grantsFromEnvironment(
					process.env.ADMIN_EMAILS,
					process.env.STUDENT_EMAILS,
				).get(email);
				if (!role) {
					throw new Error("Access has not been granted for this email");
				}
				const user = await db.get(args.userId);
				const grantId = await db.insert("accessGrants", {
					email,
					role,
					status: "ACTIVE",
					canManageEvents:
						role === "STUDENT" && (user?.canManageEvents ?? false),
					userId: args.userId,
				});
				grant = await db.get(grantId);
			}

			if (!grant || grant.status !== "ACTIVE") {
				throw new Error("Access has been revoked for this email");
			}
			if (grant.userId && grant.userId !== args.userId) {
				throw new Error("This access grant is linked to another account");
			}
			const user = await db.get(args.userId);
			if (!user) throw new Error("User profile was not created");

			await db.patch(grant._id, { userId: args.userId });
			await db.patch(args.userId, {
				calendarToken:
					grant.role === "STUDENT"
						? (user.calendarToken ?? generateSecureToken())
						: undefined,
			});
		},
	},
});
