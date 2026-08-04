import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { grantsFromEnvironment, normalizeEmail } from "./accessControl";

type Ctx = QueryCtx | MutationCtx;

export type UserAccess = {
	role: "ADMIN" | "STUDENT";
	status: "ACTIVE" | "REVOKED";
	canManageEvents: boolean;
};

export type ActiveIdentity = {
	user: Doc<"users">;
	access: UserAccess & { status: "ACTIVE" };
};

export async function getUserAccess(
	ctx: Ctx,
	user: Doc<"users">,
): Promise<UserAccess | null> {
	const linkedGrant = await ctx.db
		.query("accessGrants")
		.withIndex("by_user", (q) => q.eq("userId", user._id))
		.unique();
	const grant =
		linkedGrant ??
		(await ctx.db
			.query("accessGrants")
			.withIndex("by_email", (q) => q.eq("email", normalizeEmail(user.email)))
			.unique());

	if (grant) {
		return {
			role: grant.role,
			status: grant.status,
			canManageEvents: grant.canManageEvents,
		};
	}

	// ponytail: rollout fallback; remove after grants are migrated and env lists deleted.
	const legacyRole = grantsFromEnvironment(
		process.env.ADMIN_EMAILS,
		process.env.STUDENT_EMAILS,
	).get(normalizeEmail(user.email));
	return legacyRole
		? {
				role: legacyRole,
				status: "ACTIVE",
				canManageEvents: user.canManageEvents ?? false,
			}
		: null;
}

export async function getActiveIdentity(
	ctx: Ctx,
): Promise<ActiveIdentity | null> {
	const userId = await getAuthUserId(ctx);
	if (!userId) return null;

	const user = await ctx.db.get(userId);
	if (!user) return null;

	const access = await getUserAccess(ctx, user);
	if (!access || access.status !== "ACTIVE") return null;

	return { user, access } as ActiveIdentity;
}

export async function requireActiveUser(ctx: Ctx): Promise<ActiveIdentity> {
	const identity = await getActiveIdentity(ctx);
	if (!identity) throw new Error("Active access required");
	return identity;
}

export async function requireStudent(ctx: Ctx): Promise<ActiveIdentity> {
	const identity = await requireActiveUser(ctx);
	if (identity.access.role !== "STUDENT") {
		throw new Error("Student access required");
	}
	return identity;
}

export async function requireAdmin(ctx: Ctx): Promise<ActiveIdentity> {
	const identity = await requireActiveUser(ctx);
	if (identity.access.role !== "ADMIN") {
		throw new Error("Admin access required");
	}
	return identity;
}

export async function requireEventManager(ctx: Ctx): Promise<ActiveIdentity> {
	const identity = await requireActiveUser(ctx);
	if (identity.access.role !== "ADMIN" && !identity.access.canManageEvents) {
		throw new Error("Event management access required");
	}
	return identity;
}

export async function isEventManager(ctx: Ctx): Promise<boolean> {
	const identity = await getActiveIdentity(ctx);
	return (
		identity?.access.role === "ADMIN" ||
		identity?.access.canManageEvents === true
	);
}
