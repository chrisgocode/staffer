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

// Internal query to fetch scheduled events for a given token
export const getScheduledEventsForToken = internalQuery({
  args: {
    token: v.string(),
  },
  returns: v.array(
    v.object({
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
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_calendar_token", (q) => q.eq("calendarToken", args.token))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

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

    // Filter out null entries
    return scheduledEvents.filter((event) => event !== null) as Array<{
      signupId: Id<"signups">;
      eventTitle: string;
      eventDescription: string | undefined;
      eventLocation: string;
      eventDate: string;
      eventStartTime: string;
      eventEndTime: string;
      timeslots: Array<{ startTime: string; endTime: string }>;
      eventUpdatedAt: number;
    }>;
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
      const existing = await ctx.db
        .query("holidays")
        .withIndex("by_date", (q) => q.eq("date", holiday.date))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: holiday.name,
          semester: holiday.semester,
          isMonday: holiday.isMonday,
          isSubstitution: holiday.isSubstitution,
          scrapedAt: now,
        });
      } else {
        await ctx.db.insert("holidays", {
          date: holiday.date,
          name: holiday.name,
          semester: holiday.semester,
          isMonday: holiday.isMonday,
          isSubstitution: holiday.isSubstitution ?? false,
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

    return holidays
      .filter((holiday) => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= start && holidayDate <= end;
      })
      .map((h) => ({
        date: h.date,
        name: h.name,
      }));
  },
});
