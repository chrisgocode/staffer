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
