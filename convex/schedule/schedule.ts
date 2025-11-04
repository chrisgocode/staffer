import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const storeClassSchedule = internalMutation({
  args: {
    userId: v.id("users"),
    classSchedule: v.array(
      v.object({
        courseCode: v.string(),
        section: v.string(),
        description: v.string(),
        days: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        dates: v.string(),
        room: v.string(),
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
