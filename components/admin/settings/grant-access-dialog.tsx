"use client";

import { useMutation } from "convex/react";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { getConvexErrorMessage } from "@/lib/convex-error";

export function GrantAccessDialog({ disabled = false }: { disabled?: boolean }) {
	const grantAccess = useMutation(api.access.grantAccess);
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"ADMIN" | "STUDENT">("STUDENT");
	const [isSaving, setIsSaving] = useState(false);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen && !isSaving) {
			setEmail("");
			setRole("STUDENT");
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (isSaving) return;
		setIsSaving(true);
		try {
			await grantAccess({ email, role });
			toast.success("Access granted");
			setEmail("");
			setRole("STUDENT");
			setOpen(false);
		} catch (error) {
			console.error(error);
			toast.error(getConvexErrorMessage(error, "Could not grant access"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button disabled={disabled}>
					<UserPlus className="mr-2 h-4 w-4" />
					Add user
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					<DialogHeader>
						<DialogTitle>Grant access</DialogTitle>
						<DialogDescription>
							Approve an email and choose a role. The person can then sign in
							with Google.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="grant-access-email">Email address</Label>
							<Input
								id="grant-access-email"
								type="email"
								placeholder="person@bu.edu"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								autoFocus
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="grant-access-role">Role</Label>
							<Select
								value={role}
								onValueChange={(value) =>
									setRole(value as "ADMIN" | "STUDENT")
								}
							>
								<SelectTrigger id="grant-access-role" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="STUDENT">Student</SelectItem>
									<SelectItem value="ADMIN">Administrator</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={isSaving}>
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? "Granting…" : "Grant access"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
