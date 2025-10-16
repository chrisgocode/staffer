import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const eventSchema = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.optional(v.string()),
  location: v.string(),
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  createdBy: v.id("users"),
  spotsAvailable: v.number(),
  spotsTotal: v.number(),
  updatedAt: v.number(),
});

function extractUserId(tokenIdentifier: string): string {
  const parts = tokenIdentifier.split("|");
  if (parts.length < 2) {
    throw new Error(
      `Invalid token format: expected format "provider|userId", got "${tokenIdentifier}"`,
    );
  }
  return parts[1];
}

// Get all events
export const listEvents = query({
  args: {},
  returns: v.array(eventSchema),
  handler: async (ctx) => {
    return await ctx.db.query("events").withIndex("by_start_time").collect();
  },
});

// Get events by date range
export const getEventsByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(eventSchema),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_start_and_end_time")
      .filter((q) =>
        q.and(
          q.lte(q.field("startTime"), args.endDate),
          q.gte(q.field("endTime"), args.startDate),
        ),
      )
      .collect();
  },
});

// Create a new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    location: v.string(),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    spotsTotal: v.number(),
    spotsAvailable: v.number(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = extractUserId(identity.tokenIdentifier);

    if (args.startTime >= args.endTime) {
      throw new Error("Event end time must be after start time");
    }

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      location: args.location,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      createdBy: userId as Id<"users">,
      spotsTotal: args.spotsTotal,
      spotsAvailable: args.spotsAvailable,
      updatedAt: Date.now(),
    });
  },
});

// Update an event
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    spotsTotal: v.optional(v.number()),
    spotsAvailable: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const userId = extractUserId(identity.tokenIdentifier);

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", userId as Id<"users">))
      .unique();

    if (!user || user.role !== "ADMIN") {
      throw new Error("You are not authorized to update this event");
    }

    const updateData: Partial<{
      title: string;
      description: string | undefined;
      location: string;
      date: string;
      startTime: string;
      endTime: string;
      spotsTotal: number;
      spotsAvailable: number;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.location !== undefined) updateData.location = args.location;
    if (args.date !== undefined) updateData.date = args.date;
    if (args.startTime !== undefined) updateData.startTime = args.startTime;
    if (args.endTime !== undefined) updateData.endTime = args.endTime;
    if (args.spotsTotal !== undefined) updateData.spotsTotal = args.spotsTotal;
    if (args.spotsAvailable !== undefined)
      updateData.spotsAvailable = args.spotsAvailable;

    // Validate that endTime is strictly after startTime when both are being updated
    if (args.startTime !== undefined && args.endTime !== undefined) {
      if (args.endTime <= args.startTime) {
        throw new Error("endTime must be after startTime");
      }
    }

    await ctx.db.patch(args.eventId, updateData);
    return null;
  },
});

// Delete an event
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const userId = extractUserId(identity.tokenIdentifier);

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", userId as Id<"users">))
      .unique();

    if (!user || user.role !== "ADMIN") {
      throw new Error("You are not authorized to delete this event");
    }

    await ctx.db.delete(args.eventId);
    return null;
  },
});

// Remove a student from an event (Admin only)
export const removeStudentFromEvent = mutation({
  args: {
    eventId: v.id("events"),
    studentId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = extractUserId(identity.tokenIdentifier);

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_id", (q) => q.eq("_id", userId as Id<"users">))
      .unique();

    if (!user || user.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    // Check if event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if student is signed up for the event
    const signup = await ctx.db
      .query("signups")
      .withIndex("by_event_and_student", (q) =>
        q.eq("eventId", args.eventId).eq("studentId", args.studentId),
      )
      .unique();
    if (!signup) {
      throw new Error("Signup not found for this student and event");
    }

    // If the signup was scheduled, free up a spot on the event
    if (signup.status === "SCHEDULED") {
      const event = await ctx.db.get(args.eventId);
      if (event) {
        const newSpotsAvailable = Math.min(
          event.spotsTotal,
          event.spotsAvailable + 1,
        );
        await ctx.db.patch(args.eventId, { spotsAvailable: newSpotsAvailable });
      }
    }

    // Remove the signup
    await ctx.db.delete(signup._id);
    return null;
  },
});
