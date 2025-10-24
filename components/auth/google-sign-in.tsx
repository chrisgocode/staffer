"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthActions } from "@convex-dev/auth/react";

export function GoogleSignIn() {
  const { signIn } = useAuthActions();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Sign In</CardTitle>
        <CardDescription>
          Use your @bu.edu email to access the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => void signIn("google")} className="w-full">
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
