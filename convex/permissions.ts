import { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("No user found");
  }

  const currentUser = await ctx.db.get(userId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  const isAdmin = currentUser.role === "ADMIN";

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return true;
}

// Allow admins OR users with canManageEvents permission
export async function requireEventManager(
  ctx: QueryCtx | MutationCtx,
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("No user found");
  }

  const currentUser = await ctx.db.get(userId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  const isAdmin = currentUser.role === "ADMIN";
  const canManageEvents = currentUser.canManageEvents === true;

  if (!isAdmin && !canManageEvents) {
    throw new Error("Event management access required");
  }

  return true;
}

// Check if user is an event manager (without throwing)
export async function isEventManager(
  ctx: QueryCtx | MutationCtx,
): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  const currentUser = await ctx.db.get(userId);
  if (!currentUser) {
    return false;
  }

  return currentUser.role === "ADMIN" || currentUser.canManageEvents === true;
}
