import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

function extractUserId(tokenIdentifier: string): string {
  const parts = tokenIdentifier.split("|");
  if (parts.length < 2) {
    throw new Error(
      `Invalid token format: expected format "provider|userId", got "${tokenIdentifier}"`,
    );
  }
  return parts[1];
}

async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Extract the userId part from tokenIdentifier (second part between pipes)
  const userId = extractUserId(identity.tokenIdentifier);

  const currentUser = await ctx.db.get(userId as Id<"users">);

  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return currentUser;
}

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.union(v.literal("ADMIN"), v.literal("STUDENT"))),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("No identity found");
      return null;
    }

    console.log("Identity tokenIdentifier:", identity.tokenIdentifier);

    // Extract the userId part from tokenIdentifier (second part between pipes)
    const userId = extractUserId(identity.tokenIdentifier);
    console.log("Extracted userId:", userId);

    const user = await ctx.db.get(userId as Id<"users">);

    console.log("Found user:", user);

    if (!user) return null;
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      role: user.role,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract the userId part from tokenIdentifier (second part between pipes)
    const userId = extractUserId(identity.tokenIdentifier);

    const currentUser = await ctx.db.get(userId as Id<"users">);

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();

    // Return only non-sensitive fields
    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      role: user.role,
    }));
  },
});
