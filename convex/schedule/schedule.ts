import { internalMutation } from "../_generated/server";
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../permissions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getAllBlockedRanges, doesShiftConflict } from "./conflictUtils";

export const storeClassSchedule = internalMutation({
  args: {
    userId: v.id("users"),
    classSchedule: v.array(
      v.object({
        days: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        dates: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      classSchedule: args.classSchedule,
    });
    return null;
  },
});

// Get the active schedule for a semester
export const getScheduleForSemester = query({
  args: { semester: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("staffSchedules"),
      _creationTime: v.number(),
      semester: v.string(),
      createdAt: v.number(),
      createdBy: v.id("users"),
      isActive: v.boolean(),
      shifts: v.array(
        v.object({
          _id: v.id("staffShifts"),
          userId: v.id("users"),
          userName: v.string(),
          dayOfWeek: v.number(),
          startTime: v.string(),
          endTime: v.string(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find active schedule for semester
    const schedule = await ctx.db
      .query("staffSchedules")
      .withIndex("by_semester_and_active", (q) =>
        q.eq("semester", args.semester).eq("isActive", true),
      )
      .first();

    if (!schedule) return null;

    // Get all shifts for this schedule
    const shifts = await ctx.db
      .query("staffShifts")
      .withIndex("by_schedule_id", (q) => q.eq("scheduleId", schedule._id))
      .collect();

    // Enrich with user data
    const enrichedShifts = await Promise.all(
      shifts.map(async (shift) => {
        const user = await ctx.db.get(shift.userId);
        return {
          _id: shift._id,
          userId: shift.userId,
          userName: user?.name ?? "Unknown",
          dayOfWeek: shift.dayOfWeek,
          startTime: shift.startTime,
          endTime: shift.endTime,
        };
      }),
    );

    return {
      ...schedule,
      shifts: enrichedShifts,
    };
  },
});

// Get all student staff members
export const getStaffMembers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
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
    if (!userId) {
      throw new Error("No user found");
    }

    await requireAdmin(ctx);

    const staff = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "STUDENT"))
      .collect();

    return staff.map((s) => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      classSchedule: s.classSchedule,
      preferences: s.preferences,
    }));
  },
});

// Add a shift to the schedule
export const addShift = mutation({
  args: {
    scheduleId: v.id("staffSchedules"),
    userId: v.id("users"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
  },
  returns: v.id("staffShifts"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Get the schedule to determine semester
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${args.scheduleId}`);
    }

    // Get the user associated with this shift
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    // Validate shift against user's class schedule and preferences for this semester
    const blockedRanges = getAllBlockedRanges(
      user.classSchedule,
      user.preferences?.schedule,
      schedule.semester,
      args.dayOfWeek,
    );

    if (doesShiftConflict(args.startTime, args.endTime, blockedRanges)) {
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      throw new Error(
        `Shift conflicts with class time or preferences for ${user.name} on ${dayNames[args.dayOfWeek]} ${args.startTime}-${args.endTime}`,
      );
    }

    // Proceed with insert if no schedule conflicts detected
    return await ctx.db.insert("staffShifts", {
      scheduleId: args.scheduleId,
      userId: args.userId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

// Update shift times/day
export const updateShift = mutation({
  args: {
    shiftId: v.id("staffShifts"),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Fetch the existing shift record first
    const existingShift = await ctx.db.get(args.shiftId);
    if (!existingShift) {
      throw new Error(`Shift not found: ${args.shiftId}`);
    }

    // Compute the updated dayOfWeek/startTime/endTime by merging existing values with any provided in args
    const updatedDayOfWeek = args.dayOfWeek ?? existingShift.dayOfWeek;
    const updatedStartTime = args.startTime ?? existingShift.startTime;
    const updatedEndTime = args.endTime ?? existingShift.endTime;

    // Get the schedule to determine semester
    const schedule = await ctx.db.get(existingShift.scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${existingShift.scheduleId}`);
    }

    // Get the user associated with this shift
    const user = await ctx.db.get(existingShift.userId);
    if (!user) {
      throw new Error(`User not found: ${existingShift.userId}`);
    }

    // Query the DB for the user's classes and preferences on that day and validate the new time range
    const blockedRanges = getAllBlockedRanges(
      user.classSchedule,
      user.preferences?.schedule,
      schedule.semester,
      updatedDayOfWeek,
    );

    if (doesShiftConflict(updatedStartTime, updatedEndTime, blockedRanges)) {
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      throw new Error(
        `Shift conflicts with class time or preferences for ${user.name} on ${dayNames[updatedDayOfWeek]} ${updatedStartTime}-${updatedEndTime}`,
      );
    }

    // Proceed with patch if no schedule conflicts detected
    const { shiftId, ...updates } = args;
    await ctx.db.patch(shiftId, updates);
    return null;
  },
});

// Delete a shift
export const deleteShift = mutation({
  args: { shiftId: v.id("staffShifts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.shiftId);
    return null;
  },
});

// Publish entire schedule (create schedule + bulk insert shifts)
export const publishSchedule = mutation({
  args: {
    semester: v.string(),
    shifts: v.array(
      v.object({
        userId: v.id("users"),
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
      }),
    ),
  },
  returns: v.id("staffSchedules"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await requireAdmin(ctx);

    // Weekday names for error messages
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    // Validate each shift against student's class schedule
    for (const shift of args.shifts) {
      // Validate dayOfWeek is an integer between 0 and 4 (inclusive)
      if (!Number.isInteger(shift.dayOfWeek)) {
        throw new Error(
          `Invalid dayOfWeek: ${shift.dayOfWeek}. Must be an integer between 0 (Monday) and 4 (Friday).`,
        );
      }
      const dayOfWeek = shift.dayOfWeek;
      if (dayOfWeek < 0 || dayOfWeek > 4) {
        throw new Error(
          `Invalid dayOfWeek: ${dayOfWeek}. Must be between 0 (Monday) and 4 (Friday).`,
        );
      }

      const user = await ctx.db.get(shift.userId);
      if (!user) {
        throw new Error(`User not found: ${shift.userId}`);
      }

      // Parse and check conflicts against both class schedule and preferences for this semester
      const blockedRanges = getAllBlockedRanges(
        user.classSchedule,
        user.preferences?.schedule,
        args.semester,
        dayOfWeek,
      );

      if (doesShiftConflict(shift.startTime, shift.endTime, blockedRanges)) {
        throw new Error(
          `Shift conflicts with class time or preferences for ${user.name} on ${dayNames[dayOfWeek]} ${shift.startTime}-${shift.endTime}`,
        );
      }
    }

    // Deactivate any existing schedule for this semester
    const existing = await ctx.db
      .query("staffSchedules")
      .withIndex("by_semester", (q) => q.eq("semester", args.semester))
      .collect();

    for (const schedule of existing) {
      await ctx.db.patch(schedule._id, { isActive: false });
    }

    // Create new schedule
    const scheduleId = await ctx.db.insert("staffSchedules", {
      semester: args.semester,
      createdAt: Date.now(),
      createdBy: userId,
      isActive: true,
    });

    // Insert all shifts
    for (const shift of args.shifts) {
      await ctx.db.insert("staffShifts", {
        scheduleId,
        userId: shift.userId,
        dayOfWeek: shift.dayOfWeek,
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
    }

    return scheduleId;
  },
});
