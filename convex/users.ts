import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import {
	getActiveIdentity,
	getUserAccess,
	requireActiveUser,
} from "./permissions";

export const getCurrentUser = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id("users"),
			_creationTime: v.number(),
			name: v.optional(v.string()),
			email: v.optional(v.string()),
			phone: v.optional(v.string()),
			image: v.optional(v.string()),
			imageId: v.optional(v.id("_storage")),
			imageUrl: v.optional(v.string()),
			emailVerificationTime: v.optional(v.number()),
			phoneVerificationTime: v.optional(v.number()),
			accessStatus: v.union(v.literal("ACTIVE"), v.literal("REVOKED")),
			role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
			canManageEvents: v.boolean(),
			calendarToken: v.optional(v.string()),
			scheduleFileId: v.optional(v.id("_storage")),
			scheduleFilename: v.optional(v.string()),
			classSchedule: v.optional(
				v.array(
					v.object({
						days: v.string(),
						startTime: v.string(),
						endTime: v.string(),
						dates: v.string(),
					}),
				),
			),
			preferences: v.optional(
				v.object({
					schedule: v.optional(
						v.record(
							v.string(),
							v.object({
								monday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								tuesday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								wednesday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								thursday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								friday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
							}),
						),
					),
					ui: v.optional(
						v.object({
							calendar: v.optional(
								v.object({
									enlarged: v.boolean(),
									view: v.union(v.literal("month"), v.literal("week")),
								}),
							),
						}),
					),
				}),
			),
		}),
	),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			return null;
		}

		const user = await ctx.db.get(userId);
		if (!user) {
			return null;
		}

		// Resolve avatar URL
		let imageUrl: string | undefined;
		if (user.imageId) {
			imageUrl = (await ctx.storage.getUrl(user.imageId)) ?? undefined;
		} else if (user.image) {
			imageUrl = user.image;
		}

		const access = await getUserAccess(ctx, user);
		return {
			...user,
			imageUrl,
			accessStatus: access?.status ?? "REVOKED",
			role: access?.role,
			canManageEvents: access?.canManageEvents ?? false,
		};
	},
});

export const generateUploadUrl = mutation({
	args: {},
	returns: v.string(),
	handler: async (ctx) => {
		await requireActiveUser(ctx);
		return await ctx.storage.generateUploadUrl();
	},
});

export const updateUserAvatar = mutation({
	args: { storageId: v.id("_storage") },
	returns: v.null(),
	handler: async (ctx, args) => {
		const { user: activeUser } = await requireActiveUser(ctx);
		const userId = activeUser._id;

		await ctx.db.patch(userId, {
			imageId: args.storageId,
		});

		return null;
	},
});

export const deleteUserAvatar = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const { user: activeUser } = await requireActiveUser(ctx);
		const userId = activeUser._id;

		await ctx.db.patch(userId, {
			imageId: undefined,
		});

		return null;
	},
});

export const updateUserName = mutation({
	args: {
		name: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { user: activeUser } = await requireActiveUser(ctx);
		const userId = activeUser._id;

		await ctx.db.patch(userId, {
			name: args.name,
		});

		return null;
	},
});

export const uploadSchedule = mutation({
	args: {
		storageId: v.id("_storage"),
		filename: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { user } = await requireActiveUser(ctx);
		const userId = user._id;

		// Clear old parsed schedule data since it's stale
		await ctx.db.patch(userId, {
			scheduleFileId: args.storageId,
			scheduleFilename: args.filename,
			classSchedule: undefined,
		});

		await ctx.scheduler.runAfter(0, internal.schedule.parse.parseSchedulePDF, {
			userId,
			storageId: args.storageId,
			oldScheduleFileId: user.scheduleFileId,
		});

		return null;
	},
});

export const deleteSchedule = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const { user } = await requireActiveUser(ctx);
		const userId = user._id;

		// Delete the schedule file from storage
		if (user.scheduleFileId) {
			await ctx.storage.delete(user.scheduleFileId);
		}

		await ctx.db.patch(userId, {
			scheduleFileId: undefined,
			scheduleFilename: undefined,
			classSchedule: undefined,
		});

		return null;
	},
});

export const getScheduleUrl = query({
	args: {},
	returns: v.union(v.null(), v.string()),
	handler: async (ctx) => {
		const identity = await getActiveIdentity(ctx);
		if (!identity) return null;
		const { user } = identity;
		if (!user.scheduleFileId) {
			return null;
		}

		return await ctx.storage.getUrl(user.scheduleFileId);
	},
});

export const updateCalendarPreferences = mutation({
	args: {
		enlarged: v.optional(v.boolean()),
		view: v.optional(v.union(v.literal("month"), v.literal("week"))),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { user } = await requireActiveUser(ctx);
		const userId = user._id;

		// Get existing preferences or create new structure
		const currentPreferences = user.preferences ?? {};
		const currentUi = currentPreferences.ui ?? {};
		const currentCalendar = currentUi.calendar ?? {
			enlarged: false,
			view: "month" as const,
		};

		// Update only the provided fields
		const updatedCalendar = {
			...currentCalendar,
			...(args.enlarged !== undefined && { enlarged: args.enlarged }),
			...(args.view !== undefined && { view: args.view }),
		};

		await ctx.db.patch(userId, {
			preferences: {
				...currentPreferences,
				ui: {
					...currentUi,
					calendar: updatedCalendar,
				},
			},
		});

		return null;
	},
});

export const updateSchedulePreferences = mutation({
	args: {
		semester: v.string(),
		preferences: v.object({
			monday: v.object({
				isFullDayOff: v.boolean(),
				timeBlocks: v.array(
					v.object({
						start: v.string(),
						end: v.string(),
					}),
				),
			}),
			tuesday: v.object({
				isFullDayOff: v.boolean(),
				timeBlocks: v.array(
					v.object({
						start: v.string(),
						end: v.string(),
					}),
				),
			}),
			wednesday: v.object({
				isFullDayOff: v.boolean(),
				timeBlocks: v.array(
					v.object({
						start: v.string(),
						end: v.string(),
					}),
				),
			}),
			thursday: v.object({
				isFullDayOff: v.boolean(),
				timeBlocks: v.array(
					v.object({
						start: v.string(),
						end: v.string(),
					}),
				),
			}),
			friday: v.object({
				isFullDayOff: v.boolean(),
				timeBlocks: v.array(
					v.object({
						start: v.string(),
						end: v.string(),
					}),
				),
			}),
		}),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { user } = await requireActiveUser(ctx);
		const userId = user._id;

		// Get existing preferences or create new structure
		const currentPreferences = user.preferences ?? {};
		const currentSchedule = currentPreferences.schedule ?? {};

		// Update preferences for the specific semester
		await ctx.db.patch(userId, {
			preferences: {
				...currentPreferences,
				schedule: {
					...currentSchedule,
					[args.semester]: args.preferences,
				},
			},
		});

		return null;
	},
});
