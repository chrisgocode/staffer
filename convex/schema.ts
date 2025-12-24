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
    imageId: v.optional(
      v.id("_storage"), // Convex storage ID
    ),
    email: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
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
                    start: v.string(), // "09:00" (24-hour format)
                    end: v.string(), // "17:00" (24-hour format)
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

  staffSchedules: defineTable({
    semester: v.string(),
    createdAt: v.number(),
    createdBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_semester", ["semester"])
    .index("by_semester_and_active", ["semester", "isActive"]),

  staffShifts: defineTable({
    scheduleId: v.id("staffSchedules"),
    userId: v.id("users"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
  })
    .index("by_schedule_id", ["scheduleId"])
    .index("by_schedule_and_day", ["scheduleId", "dayOfWeek"])
    .index("by_schedule_and_user", ["scheduleId", "userId"]),

  holidays: defineTable({
    date: v.string(),
    name: v.string(),
    semester: v.optional(v.string()),
    isMonday: v.boolean(),
    isSubstitution: v.optional(v.boolean()),
    scrapedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_semester", ["semester"])
    .index("by_monday", ["isMonday"]),

  semesters: defineTable({
    semester: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    createdAt: v.number(),
  }).index("by_semester", ["semester"]),
});
