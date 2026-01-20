import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./permissions";
import { internal } from "./_generated/api";

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
      role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
      canManageEvents: v.optional(v.boolean()),
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
    let imageUrl: string | undefined = undefined;
    if (user.imageId) {
      imageUrl = (await ctx.storage.getUrl(user.imageId)) ?? undefined;
    } else if (user.image) {
      imageUrl = user.image;
    }

    return {
      ...user,
      imageUrl,
    };
  },
});

// Get all users (Admin only)
export const getAllUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();

    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      role: user.role,
    }));
  },
});

// Update user role (Admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("ADMIN"), v.literal("STUDENT")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if the profile to update exists
    const userToUpdate = await ctx.db.get(args.userId);
    if (!userToUpdate) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
    });

    return null;
  },
});

// Get users by role
export const getUsersByRole = query({
  args: {
    role: v.union(v.literal("ADMIN"), v.literal("STUDENT")),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();

    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      role: user.role,
    }));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateUserAvatar = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.scheduleFileId) {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

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

// List all students with their event manager status (Admin only)
export const listStudentsWithEventManagerFlag = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      canManageEvents: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "STUDENT"))
      .collect();

    return students.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      canManageEvents: user.canManageEvents,
    }));
  },
});

// Set the canManageEvents flag for a user (Admin only)
export const setUserCanManageEvents = mutation({
  args: {
    userId: v.id("users"),
    canManageEvents: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const userToUpdate = await ctx.db.get(args.userId);
    if (!userToUpdate) {
      throw new Error("User not found");
    }

    // Only allow setting this flag for students
    if (userToUpdate.role !== "STUDENT") {
      throw new Error("Can only grant event management access to students");
    }

    await ctx.db.patch(args.userId, {
      canManageEvents: args.canManageEvents,
    });

    return null;
  },
});
