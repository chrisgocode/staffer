"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import favicon from "@/public/favicon.svg";

export default function Unauthorized() {
	const { signOut } = useAuthActions();
	const user = useQuery(api.users.getCurrentUser);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const handleSignOut = async () => {
		setIsSigningOut(true);
		await signOut();
		window.location.replace("/");
	};

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-card">
				<div className="container mx-auto flex h-20 items-center gap-2 px-4">
					<Image
						src={favicon}
						alt=""
						width={44}
						height={44}
						aria-hidden="true"
					/>
					<span className="text-lg font-semibold">NC Event Staffing</span>
				</div>
			</header>

			<main className="container mx-auto px-4 py-16 sm:py-24">
				<div className="max-w-2xl">
					<p className="mb-3 text-sm font-semibold text-destructive">
						Access denied
					</p>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
						This account doesn&apos;t have active access.
					</h1>
					<p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
						Ask Newbury Center staff to add or restore your account before
						trying again.
					</p>

					<div className="my-8 border-y border-border py-5 text-sm">
						{user?.email && (
							<p>
								Signed in as <span className="font-medium">{user.email}</span>
							</p>
						)}
						<p className="mt-1 text-muted-foreground">
							Wrong Google account? Sign out and try another one.
						</p>
					</div>

					<Button
						type="button"
						onClick={handleSignOut}
						disabled={isSigningOut}
					>
						<LogOut />
						{isSigningOut ? "Signing out…" : "Sign out and try again"}
					</Button>
				</div>
			</main>
		</div>
	);
}
