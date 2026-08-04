"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function GoogleSignIn() {
	const { signIn } = useAuthActions();

	const handleSignIn = async () => {
		try {
			await signIn("google");
		} catch (error) {
			console.error(error);
			toast.error("Access has not been granted for this account");
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="space-y-1">
				<CardTitle className="text-2xl font-semibold">Sign In</CardTitle>
				<CardDescription>
					Use your @bu.edu email to access the platform
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button onClick={handleSignIn} className="w-full">
					Sign in with Google
				</Button>
			</CardContent>
		</Card>
	);
}
