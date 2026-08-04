import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { grantsFromEnvironment, normalizeEmail } from "./accessControl";
import { requireAdmin } from "./permissions";

const roleValidator = v.union(v.literal("ADMIN"), v.literal("STUDENT"));

async function assertNotLastAdmin(
	ctx: MutationCtx,
	grant: Doc<"accessGrants">,
) {
	if (grant.status !== "ACTIVE" || grant.role !== "ADMIN" || !grant.userId) {
		return;
	}

	const admins = await ctx.db
		.query("accessGrants")
		.withIndex("by_status_and_role", (q) =>
			q.eq("status", "ACTIVE").eq("role", "ADMIN"),
		)
		.collect();
	if (!admins.some((admin) => admin.userId && admin._id !== grant._id)) {
		throw new ConvexError("The final active administrator cannot be removed");
	}
}

export const listAccessGrants = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id("accessGrants"),
			email: v.string(),
			name: v.optional(v.string()),
			role: roleValidator,
			status: v.union(v.literal("ACTIVE"), v.literal("REVOKED")),
			canManageEvents: v.boolean(),
			userId: v.optional(v.id("users")),
			hasSignedIn: v.boolean(),
		}),
	),
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const grants = await ctx.db.query("accessGrants").collect();
		return await Promise.all(
			grants.map(async (grant) => {
				const user = grant.userId ? await ctx.db.get(grant.userId) : null;
				return {
					_id: grant._id,
					email: grant.email,
					name: user?.name,
					role: grant.role,
					status: grant.status,
					canManageEvents: grant.canManageEvents,
					userId: grant.userId,
					hasSignedIn: user !== null,
				};
			}),
		);
	},
});

export const grantAccess = mutation({
	args: { email: v.string(), role: roleValidator },
	returns: v.id("accessGrants"),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const email = normalizeEmail(args.email);
		if (!/^\S+@\S+\.\S+$/.test(email)) throw new ConvexError("Enter a valid email");

		const grant = await ctx.db
			.query("accessGrants")
			.withIndex("by_email", (q) => q.eq("email", email))
			.unique();
		if (grant && grant.role === "ADMIN" && args.role !== "ADMIN") {
			await assertNotLastAdmin(ctx, grant);
		}

		const user = await ctx.db
			.query("users")
			.withIndex("email", (q) => q.eq("email", email))
			.unique();
		const userGrant = user
			? await ctx.db
					.query("accessGrants")
					.withIndex("by_user", (q) => q.eq("userId", user._id))
					.unique()
			: null;
		if (userGrant && userGrant._id !== grant?._id) {
			throw new ConvexError("This user is already linked to another access grant");
		}
		const canManageEvents =
			args.role === "STUDENT" && grant?.status === "ACTIVE"
				? grant.canManageEvents
				: false;

		if (grant) {
			await ctx.db.patch(grant._id, {
				role: args.role,
				status: "ACTIVE",
				canManageEvents,
				userId: grant.userId ?? user?._id,
			});
			if (args.role !== "STUDENT" && grant.userId) {
				await ctx.db.patch(grant.userId, { calendarToken: undefined });
			}
			return grant._id;
		}

		return await ctx.db.insert("accessGrants", {
			email,
			role: args.role,
			status: "ACTIVE",
			canManageEvents: false,
			userId: user?._id,
		});
	},
});

export const revokeAccess = mutation({
	args: { email: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const grant = await ctx.db
			.query("accessGrants")
			.withIndex("by_email", (q) => q.eq("email", normalizeEmail(args.email)))
			.unique();
		if (!grant) throw new ConvexError("Access grant not found");

		await assertNotLastAdmin(ctx, grant);
		await ctx.db.patch(grant._id, {
			status: "REVOKED",
			canManageEvents: false,
		});
		if (grant.userId) {
			await ctx.db.patch(grant.userId, { calendarToken: undefined });
		}
		return null;
	},
});

export const setCanManageEvents = mutation({
	args: { userId: v.id("users"), canManageEvents: v.boolean() },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const grant = await ctx.db
			.query("accessGrants")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.unique();
		if (!grant || grant.status !== "ACTIVE" || grant.role !== "STUDENT") {
			throw new ConvexError(
				"Event management can only be changed for active students",
			);
		}
		await ctx.db.patch(grant._id, { canManageEvents: args.canManageEvents });
		return null;
	},
});

// Temporary rollout migration. Remove after access grants become authoritative.
export const migrateFromEnvironment = mutation({
	args: {},
	returns: v.object({
		admins: v.number(),
		students: v.number(),
		linkedUsers: v.number(),
		awaitingFirstSignIn: v.number(),
		revoked: v.number(),
	}),
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const desiredGrants = grantsFromEnvironment(
			process.env.ADMIN_EMAILS,
			process.env.STUDENT_EMAILS,
		);
		if (![...desiredGrants.values()].includes("ADMIN")) {
			throw new ConvexError("ADMIN_EMAILS must contain at least one email");
		}

		const users = await ctx.db.query("users").collect();
		const usersByEmail = new Map<string, (typeof users)[number]>();
		for (const user of users) {
			const email = normalizeEmail(user.email);
			if (usersByEmail.has(email)) {
				throw new ConvexError(`Multiple users have the email ${email}`);
			}
			usersByEmail.set(email, user);
		}

		const existingGrants = await ctx.db.query("accessGrants").collect();
		const grantsByEmail = new Map<string, (typeof existingGrants)[number]>();
		for (const grant of existingGrants) {
			const email = normalizeEmail(grant.email);
			if (grantsByEmail.has(email)) {
				throw new ConvexError(`Multiple access grants have the email ${email}`);
			}
			grantsByEmail.set(email, grant);
		}

		let linkedUsers = 0;
		let admins = 0;
		let students = 0;

		for (const [email, role] of desiredGrants) {
			const user = usersByEmail.get(email);
			const grant = grantsByEmail.get(email);
			const canManageEvents =
				role === "STUDENT" && (user?.canManageEvents ?? false);

			if (grant) {
				if (grant.userId && user && grant.userId !== user._id) {
					throw new ConvexError(`${email} is linked to a different user`);
				}
				await ctx.db.patch(grant._id, {
					email,
					role,
					status: "ACTIVE",
					canManageEvents,
					userId: user?._id,
				});
			} else {
				await ctx.db.insert("accessGrants", {
					email,
					role,
					status: "ACTIVE",
					canManageEvents,
					userId: user?._id,
				});
			}

			if (user) linkedUsers++;
			if (role === "ADMIN") admins++;
			else students++;
		}

		let revoked = 0;
		for (const grant of existingGrants) {
			if (!desiredGrants.has(normalizeEmail(grant.email))) {
				await ctx.db.patch(grant._id, {
					status: "REVOKED",
					canManageEvents: false,
				});
				revoked++;
			}
		}

		const linkedAdminExists = [...desiredGrants].some(
			([email, role]) => role === "ADMIN" && usersByEmail.has(email),
		);
		if (!linkedAdminExists) {
			throw new ConvexError("At least one ADMIN_EMAILS user must have signed in");
		}

		return {
			admins,
			students,
			linkedUsers,
			awaitingFirstSignIn: desiredGrants.size - linkedUsers,
			revoked,
		};
	},
});
