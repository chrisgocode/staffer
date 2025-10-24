import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.string(),
    image: v.optional(v.string()),
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
    calendarToken: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("by_role", ["role"])
    .index("by_calendar_token", ["calendarToken"]),
  events: defineTable({
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
  })
    .index("by_start_time", ["startTime"])
    .index("by_start_and_end_time", ["startTime", "endTime"])
    .index("by_date", ["date"]),

  signups: defineTable({
    eventId: v.id("events"),
    studentId: v.id("users"),
    studentName: v.string(),
    studentEmail: v.string(),
    status: v.union(v.literal("PENDING"), v.literal("SCHEDULED")),
    timeslots: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      }),
    ),
  })
    .index("by_event_id", ["eventId"])
    .index("by_student_id", ["studentId"])
    .index("by_event_and_student", ["eventId", "studentId"]),
});
