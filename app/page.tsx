"use client";

import { GoogleSignIn } from "@/components/google-sign-in";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (user === undefined) return; // loading state
    if (!user) return; // unauthenticated, show sign-in
    router.replace(user.role === "STUDENT" ? "/student" : "/admin");
  }, [user, router]);

  if (user === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  if (user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          NC Event Staffing
        </h1>
        <p className="text-lg text-muted-foreground">
          Connect students with campus event opportunities
        </p>
      </div>
      <GoogleSignIn />
    </main>
  );
}
