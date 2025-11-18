import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a cryptographically secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// Generate or regenerate calendar token for the current user
export const generateCalendarToken = mutation({
  args: {},
  returns: v.union(
    v.object({
      token: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user exists and is a student
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User profile not found");
    }

    if (user.role !== "STUDENT") {
      throw new Error("Only students can have calendar tokens");
    }

    // Generate new token
    const token = generateSecureToken();

    // Update user with new token
    await ctx.db.patch(userId, {
      calendarToken: token,
    });

    return { token };
  },
});

// Get the calendar URL for the current user
export const getMyCalendarUrl = query({
  args: {},
  returns: v.union(
    v.object({
      url: v.string(),
      token: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    const user = await ctx.db.get(userId);

    if (!user || !user.calendarToken) {
      return null;
    }

    // Get the Convex site URL from environment
    const siteUrl = process.env.CONVEX_SITE_URL || "";

    return {
      url: `${siteUrl}/calendar/${user.calendarToken}.ics`,
      token: user.calendarToken,
    };
  },
});

// Internal query to fetch scheduled events and shifts for a given token
export const getScheduledEventsForToken = internalQuery({
  args: {
    token: v.string(),
  },
  returns: v.array(
    v.union(
      v.object({
        type: v.literal("event"),
        signupId: v.id("signups"),
        eventTitle: v.string(),
        eventDescription: v.optional(v.string()),
        eventLocation: v.string(),
        eventDate: v.string(),
        eventStartTime: v.string(),
        eventEndTime: v.string(),
        timeslots: v.array(
          v.object({
            startTime: v.string(),
            endTime: v.string(),
          }),
        ),
        eventUpdatedAt: v.number(),
      }),
      v.object({
        type: v.literal("shift"),
        shiftId: v.id("staffShifts"),
        scheduleId: v.id("staffSchedules"),
        semester: v.string(),
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
        scheduleCreatedAt: v.number(),
      }),
    ),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_calendar_token", (q) => q.eq("calendarToken", args.token))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const results: Array<
      | {
          type: "event";
          signupId: Id<"signups">;
          eventTitle: string;
          eventDescription: string | undefined;
          eventLocation: string;
          eventDate: string;
          eventStartTime: string;
          eventEndTime: string;
          timeslots: Array<{ startTime: string; endTime: string }>;
          eventUpdatedAt: number;
        }
      | {
          type: "shift";
          shiftId: Id<"staffShifts">;
          scheduleId: Id<"staffSchedules">;
          semester: string;
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          scheduleCreatedAt: number;
        }
    > = [];

    // Get all signups for this user
    const signups = await ctx.db
      .query("signups")
      .withIndex("by_student_id", (q) => q.eq("studentId", user._id))
      .collect();

    // Filter for scheduled signups and join with events
    const scheduledEvents = await Promise.all(
      signups
        .filter((signup) => signup.status === "SCHEDULED")
        .map(async (signup) => {
          const event = await ctx.db.get(signup.eventId);
          if (!event) return null;

          return {
            type: "event" as const,
            signupId: signup._id,
            eventTitle: event.title,
            eventDescription: event.description,
            eventLocation: event.location,
            eventDate: event.date,
            eventStartTime: event.startTime,
            eventEndTime: event.endTime,
            timeslots: signup.timeslots,
            eventUpdatedAt: event.updatedAt,
          };
        }),
    );

    results.push(
      ...(scheduledEvents.filter((e) => e !== null) as Array<{
        type: "event";
        signupId: Id<"signups">;
        eventTitle: string;
        eventDescription: string | undefined;
        eventLocation: string;
        eventDate: string;
        eventStartTime: string;
        eventEndTime: string;
        timeslots: Array<{ startTime: string; endTime: string }>;
        eventUpdatedAt: number;
      }>),
    );

    // Get all active schedules and find shifts for this user
    const allSchedules = await ctx.db.query("staffSchedules").collect();

    const activeSchedules = allSchedules.filter((s) => s.isActive);

    for (const schedule of activeSchedules) {
      const userShifts = await ctx.db
        .query("staffShifts")
        .withIndex("by_schedule_and_user", (q) =>
          q.eq("scheduleId", schedule._id).eq("userId", user._id),
        )
        .collect();

      for (const shift of userShifts) {
        results.push({
          type: "shift" as const,
          shiftId: shift._id,
          scheduleId: schedule._id,
          semester: schedule.semester,
          dayOfWeek: shift.dayOfWeek,
          startTime: shift.startTime,
          endTime: shift.endTime,
          scheduleCreatedAt: schedule.createdAt,
        });
      }
    }

    return results;
  },
});

// Store scraped holidays
export const storeHolidays = internalMutation({
  args: {
    holidays: v.array(
      v.object({
        date: v.string(),
        name: v.string(),
        semester: v.optional(v.string()),
        isMonday: v.boolean(),
        isSubstitution: v.optional(v.boolean()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const holiday of args.holidays) {
      // Validate date format (YYYY-MM-DD) or ensure Date.parse yields a valid date
      const dateStr = holiday.date;
      const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      const parsedDate = Date.parse(dateStr);
      const isValidDate = !isNaN(parsedDate);

      if (!dateMatch || !isValidDate) {
        console.warn(
          `Skipping holiday with invalid date: "${dateStr}" (name: "${holiday.name}")`,
        );
        continue;
      }

      // Normalize isSubstitution to a boolean before any DB operation
      const isSubstitution = holiday.isSubstitution ?? false;

      const existing = await ctx.db
        .query("holidays")
        .withIndex("by_date", (q) => q.eq("date", dateStr))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: holiday.name,
          semester: holiday.semester,
          isMonday: holiday.isMonday,
          isSubstitution: isSubstitution,
          scrapedAt: now,
        });
      } else {
        await ctx.db.insert("holidays", {
          date: dateStr,
          name: holiday.name,
          semester: holiday.semester,
          isMonday: holiday.isMonday,
          isSubstitution: isSubstitution,
          scrapedAt: now,
        });
      }
    }

    return null;
  },
});

// Get Monday holidays for date range
export const getMondayHolidays = internalQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      name: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const holidays = await ctx.db
      .query("holidays")
      .withIndex("by_monday", (q) => q.eq("isMonday", true))
      .collect();

    const start = new Date(args.startDate);
    const end = new Date(args.endDate);

    // Validate start and end dates
    if (isNaN(start.getTime())) {
      throw new Error(
        `Invalid startDate: "${args.startDate}" is not a valid date`,
      );
    }
    if (isNaN(end.getTime())) {
      throw new Error(`Invalid endDate: "${args.endDate}" is not a valid date`);
    }

    return holidays
      .filter((holiday) => {
        const holidayDate = new Date(holiday.date);
        // Skip holidays with invalid dates
        if (isNaN(holidayDate.getTime())) {
          console.warn(
            `Skipping holiday with invalid date: "${holiday.date}" (name: "${holiday.name}")`,
          );
          return false;
        }
        return holidayDate >= start && holidayDate <= end;
      })
      .map((h) => ({
        date: h.date,
        name: h.name,
      }));
  },
});
