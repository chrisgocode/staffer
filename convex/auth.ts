import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      try {
        const email = args.profile.email;

        // Validate @bu.edu domain
        // Validate @bu.edu domain
        if (!email) {
          console.log("ERROR: No email found in profile");
          throw new Error("Only @bu.edu emails are allowed");
        }

        // if (!email.endsWith("@bu.edu")) {
        //   console.log("ERROR: Email not from @bu.edu domain:", email);
        //   throw new Error("Only @bu.edu emails are allowed");
        // }

        // Parse email whitelists from environment variables
        const adminEmails =
          process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) || [];
        const studentEmails =
          process.env.STUDENT_EMAILS?.split(",").map((e) => e.trim()) || [];

        // Determine role based on whitelist
        let role: "ADMIN" | "STUDENT";
        if (adminEmails.includes(email)) {
          role = "ADMIN";
        } else if (studentEmails.includes(email)) {
          role = "STUDENT";
        } else {
          console.log("ERROR: Email not whitelisted:", email);
          throw new Error(
            "Email not whitelisted. Contact administrator for access.",
          );
        }

        const userId = args.userId;

        // Create or update user profile using userId from args
        const existingProfile = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("_id"), userId))
          .unique();

        if (existingProfile) {
          console.log("Updating existing profile:", existingProfile._id);
          // Update existing profile
          await ctx.db.patch(existingProfile._id, {
            role,
          });
        } else {
          console.log("Creating new profile for user:", userId);
          // Create new profile
          const profileId = await ctx.db.insert("users", {
            userId: userId,
            email,
            name: args.profile.name || email.split("@")[0],
            role,
            createdAt: Date.now(),
          });
          console.log("Created profile with ID:", profileId);
        }

        console.log("=== afterUserCreatedOrUpdated CALLBACK COMPLETED ===");
      } catch (error) {
        console.log("ERROR in afterUserCreatedOrUpdated:", error);
        throw error;
      }
    },
  },
});
