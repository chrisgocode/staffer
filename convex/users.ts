import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./permissions";

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
      emailVerificationTime: v.optional(v.number()),
      phoneVerificationTime: v.optional(v.number()),
      role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
      calendarToken: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    return await ctx.db.get(userId);
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
