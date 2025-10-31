import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./permissions";

// Generate a cryptographically secure random token
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// Sign up for an event
export const signupForEvent = mutation({
  args: {
    eventId: v.id("events"),
    timeSlotStart: v.string(),
    timeSlotEnd: v.string(),
  },
  returns: v.id("signups"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Check if user profile exists and is a student
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User profile not found");
    }

    if (user.role !== "STUDENT") {
      throw new Error("Only students can sign up for events");
    }

    // Auto-generate calendar token if user doesn't have one
    if (!user.calendarToken) {
      const token = generateSecureToken();
      await ctx.db.patch(userId, { calendarToken: token });
    }

    // Check if event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Validate time slot is within event duration
    if (
      args.timeSlotStart < event.startTime ||
      args.timeSlotEnd > event.endTime
    ) {
      throw new Error("Time slot must be within event duration");
    }

    if (args.timeSlotStart >= args.timeSlotEnd) {
      throw new Error("Time slot start must be before end time");
    }

    // Check for existing signup for this event by this user
    const existingSignup = await ctx.db
      .query("signups")
      .withIndex("by_event_and_student", (q) =>
        q.eq("eventId", args.eventId).eq("studentId", userId),
      )
      .unique();

    if (existingSignup) {
      throw new Error("You have already signed up for this event");
    }

    // Create the signup
    return await ctx.db.insert("signups", {
      eventId: args.eventId,
      studentId: userId,
      studentName: user.name,
      studentEmail: user.email,
      status: "PENDING",
      timeslots: [{ startTime: args.timeSlotStart, endTime: args.timeSlotEnd }],
    });
  },
});

// Edit signup time slots
export const editSignupEvent = mutation({
  args: {
    signupId: v.id("signups"),
    timeSlotStart: v.string(),
    timeSlotEnd: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Check if user profile exists and is a student
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User profile not found");
    }

    if (user.role !== "STUDENT") {
      throw new Error("Only students can edit signups");
    }

    // Get the signup
    const signup = await ctx.db.get(args.signupId);
    if (!signup) {
      throw new Error("Signup not found");
    }

    // Check if user owns this signup
    if (signup.studentId !== userId) {
      throw new Error("You can only edit your own signups");
    }

    // Get the event to validate time slots
    const event = await ctx.db.get(signup.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Validate time slot is within event duration
    if (
      args.timeSlotStart < event.startTime ||
      args.timeSlotEnd > event.endTime
    ) {
      throw new Error("Time slot must be within event duration");
    }

    if (args.timeSlotStart >= args.timeSlotEnd) {
      throw new Error("Time slot start must be before end time");
    }

    // Update the signup with new time slots; reset status to PENDING
    await ctx.db.patch(args.signupId, {
      timeslots: [{ startTime: args.timeSlotStart, endTime: args.timeSlotEnd }],
      status: "PENDING",
    });

    return null;
  },
});

// Cancel signup for an event
export const cancelSignup = mutation({
  args: {
    signupId: v.id("signups"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Get the signup
    const signup = await ctx.db.get(args.signupId);
    if (!signup) {
      throw new Error("Signup not found");
    }

    // Check if user owns this signup
    if (signup.studentId !== userId) {
      throw new Error("You can only cancel your own signups");
    }

    // If signup was scheduled, free up a spot
    if (signup.status === "SCHEDULED") {
      const event = await ctx.db.get(signup.eventId);
      if (event) {
        const newSpotsAvailable = Math.min(
          event.spotsTotal,
          event.spotsAvailable + 1,
        );
        await ctx.db.patch(signup.eventId, {
          spotsAvailable: newSpotsAvailable,
        });
      }
    }
    // Delete the signup
    await ctx.db.delete(args.signupId);
    return null;
  },
});

// Get signups for a specific event
export const getEventSignups = query({
  args: {
    eventId: v.id("events"),
  },
  returns: v.array(
    v.object({
      _id: v.id("signups"),
      _creationTime: v.number(),
      eventId: v.id("events"),
      studentId: v.id("users"),
      studentName: v.string(),
      studentEmail: v.string(),
      studentImageUrl: v.optional(v.string()),
      status: v.union(v.literal("PENDING"), v.literal("SCHEDULED")),
      timeslots: v.array(
        v.object({ startTime: v.string(), endTime: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Check if user is admin or the event creator
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User profile not found");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Only admins and event creators can see all signups
    if (user.role !== "ADMIN" && event.createdBy !== userId) {
      throw new Error("You are not authorized to view signups for this event");
    }

    // Get all signups for the event
    const signups = await ctx.db
      .query("signups")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    // this will collect all imageUrls for each user
    const enrichedSignups = await Promise.all(
      signups.map(async (signup) => {
        const student = await ctx.db.get(signup.studentId);
        let studentImageUrl: string | undefined = undefined;

        if (student) {
          if (student.imageId) {
            studentImageUrl =
              (await ctx.storage.getUrl(student.imageId)) ?? undefined;
          } else if (student.image) {
            studentImageUrl = student.image;
          }
        }

        return {
          ...signup,
          studentImageUrl,
        };
      }),
    );

    return enrichedSignups;
  },
});

// Get public signups for a specific event (visible to any authenticated user)
export const getPublicEventSignups = query({
  args: {
    eventId: v.id("events"),
  },
  returns: v.array(
    v.object({
      _id: v.id("signups"),
      _creationTime: v.number(),
      eventId: v.id("events"),
      studentId: v.id("users"),
      studentName: v.string(),
      studentImageUrl: v.optional(v.string()),
      status: v.union(v.literal("PENDING"), v.literal("SCHEDULED")),
      timeslots: v.array(
        v.object({ startTime: v.string(), endTime: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Return minimal, non-sensitive signup details for roster display
    const signups = await ctx.db
      .query("signups")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    // this will collect all imageUrls for each user
    const enrichedSignups = await Promise.all(
      signups.map(async (signup) => {
        const student = await ctx.db.get(signup.studentId);
        let studentImageUrl: string | undefined = undefined;

        if (student) {
          if (student.imageId) {
            studentImageUrl =
              (await ctx.storage.getUrl(student.imageId)) ?? undefined;
          } else if (student.image) {
            studentImageUrl = student.image;
          }
        }

        return {
          _id: signup._id,
          _creationTime: signup._creationTime,
          eventId: signup.eventId,
          studentId: signup.studentId,
          studentName: signup.studentName,
          status: signup.status,
          timeslots: signup.timeslots,
          studentImageUrl,
        };
      }),
    );

    return enrichedSignups;
  },
});

// Get user's signups
export const getUserSignups = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("signups"),
      _creationTime: v.number(),
      eventId: v.id("events"),
      studentId: v.id("users"),
      studentName: v.string(),
      studentEmail: v.string(),
      status: v.union(v.literal("PENDING"), v.literal("SCHEDULED")),
      timeslots: v.array(
        v.object({ startTime: v.string(), endTime: v.string() }),
      ),
      eventTitle: v.string(),
      eventLocation: v.string(),
      eventStartTime: v.string(),
      eventEndTime: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Get all signups for the user
    const signups = await ctx.db
      .query("signups")
      .withIndex("by_student_id", (q) => q.eq("studentId", userId))
      .collect();

    // Get event details for each signup, filtering out signups for non-existent events
    const signupsWithEvents = await Promise.all(
      signups.map(async (signup) => {
        const event = await ctx.db.get(signup.eventId);
        if (!event) {
          // Return null for signups with non-existent events
          return null;
        }
        return {
          ...signup,
          eventTitle: event.title,
          eventLocation: event.location,
          eventStartTime: event.startTime,
          eventEndTime: event.endTime,
        };
      }),
    );

    // Filter out null values (signups for non-existent events)
    return signupsWithEvents.filter((signup) => signup !== null);
  },
});

// Get pending signup counts for a list of events (Admin or event creator only)
export const getPendingCountsForEvents = query({
  args: { eventIds: v.array(v.id("events")) },
  returns: v.record(v.id("events"), v.number()),
  handler: async (ctx, args) => {
    // Only admins can see events
    await requireAdmin(ctx);

    const counts: Record<Id<"events">, number> = {};
    for (const eventId of args.eventIds) {
      let count = 0;
      const signupsForEvent = await ctx.db
        .query("signups")
        .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
        .collect();
      for (const s of signupsForEvent) {
        if (s.status === "PENDING") count++;
      }
      counts[eventId] = count;
    }

    return counts;
  },
});

// Check if user is signed up for an event
export const isSignedUpForEvent = query({
  args: {
    eventId: v.id("events"),
  },
  returns: v.union(
    v.object({
      _id: v.id("signups"),
      _creationTime: v.number(),
      eventId: v.id("events"),
      studentId: v.id("users"),
      studentName: v.string(),
      studentEmail: v.string(),
      status: v.union(v.literal("PENDING"), v.literal("SCHEDULED")),
      timeslots: v.array(
        v.object({ startTime: v.string(), endTime: v.string() }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    // Check if user has signed up for this event
    const signup = await ctx.db
      .query("signups")
      .withIndex("by_event_and_student", (q) =>
        q.eq("eventId", args.eventId).eq("studentId", userId),
      )
      .unique();

    return signup;
  },
});

// Confirm signup (Admin only)
export const confirmSignup = mutation({
  args: {
    signupId: v.id("signups"),
    confirmed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("No user found");
    }

    await requireAdmin(ctx);

    // Check if signup exists
    const signup = await ctx.db.get(args.signupId);
    if (!signup) {
      throw new Error("Signup not found");
    }

    const previousStatus = signup.status;

    // Update the signup status based on confirmation
    await ctx.db.patch(args.signupId, {
      status: args.confirmed ? "SCHEDULED" : "PENDING",
    });

    // Adjust spotsAvailable if status changes across scheduled boundary
    const event = await ctx.db.get(signup.eventId);
    if (event) {
      if (previousStatus !== "SCHEDULED" && args.confirmed) {
        // PENDING -> SCHEDULED: consume a spot
        const newSpotsAvailable = Math.max(0, event.spotsAvailable - 1);
        await ctx.db.patch(signup.eventId, {
          spotsAvailable: newSpotsAvailable,
        });
      } else if (previousStatus === "SCHEDULED" && !args.confirmed) {
        // SCHEDULED -> PENDING: free a spot
        const newSpotsAvailable = Math.min(
          event.spotsTotal,
          event.spotsAvailable + 1,
        );
        await ctx.db.patch(signup.eventId, {
          spotsAvailable: newSpotsAvailable,
        });
      }
    }

    return null;
  },
});

// Delete signup (Admin only)
export const deleteSignup = mutation({
  args: {
    signupId: v.id("signups"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check if signup exists
    const signup = await ctx.db.get(args.signupId);
    if (!signup) {
      throw new Error("Signup not found");
    }

    // If signup was scheduled, free up a spot
    if (signup.status === "SCHEDULED") {
      const event = await ctx.db.get(signup.eventId);
      if (event) {
        const newSpotsAvailable = Math.min(
          event.spotsTotal,
          event.spotsAvailable + 1,
        );
        await ctx.db.patch(signup.eventId, {
          spotsAvailable: newSpotsAvailable,
        });
      }
    }
    // Delete the signup
    await ctx.db.delete(args.signupId);
    return null;
  },
});
