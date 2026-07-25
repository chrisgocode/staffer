"use client";

import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	Ban,
	Check,
	Pen,
	RotateCcw,
	ShieldCheck,
	UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AvatarUpload from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type PendingAction =
	| { type: "role"; email: string; role: "ADMIN" | "STUDENT" }
	| { type: "revoke"; email: string };

export default function Settings() {
	const user = useQuery(api.users.getCurrentUser);
	const grants = useQuery(api.access.listAccessGrants);
	const updateUserName = useMutation(api.users.updateUserName);
	const grantAccess = useMutation(api.access.grantAccess);
	const revokeAccess = useMutation(api.access.revokeAccess);
	const setCanManageEvents = useMutation(
		api.access.setCanManageEvents,
	).withOptimisticUpdate((localStore, args) => {
		const current = localStore.getQuery(api.access.listAccessGrants, {});
		if (!current) return;
		localStore.setQuery(
			api.access.listAccessGrants,
			{},
			current.map((grant) =>
				grant.userId === args.userId
					? { ...grant, canManageEvents: args.canManageEvents }
					: grant,
			),
		);
	});
	const migrateFromEnvironment = useMutation(api.access.migrateFromEnvironment);
	const router = useRouter();
	const [isEditingName, setIsEditingName] = useState(false);
	const [editedName, setEditedName] = useState<string | null>(null);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"ADMIN" | "STUDENT">("STUDENT");
	const [showRevokedUsers, setShowRevokedUsers] = useState(false);
	const [isSavingAccess, setIsSavingAccess] = useState(false);
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(
		null,
	);
	const pendingEventManagerUpdates = useRef(new Set<Id<"users">>());
	const [pendingEventManagerIds, setPendingEventManagerIds] = useState(
		new Set<Id<"users">>(),
	);
	const isLoading = user === undefined;
	const revokedCount =
		grants?.filter((grant) => grant.status === "REVOKED").length ?? 0;
	const visibleGrants = (grants ?? []).filter(
		(grant) => showRevokedUsers || grant.status !== "REVOKED",
	);

	useEffect(() => {
		if (!isLoading && (!user || user.role !== "ADMIN")) router.push("/");
	}, [user, isLoading, router]);

	const handleNameEdit = () => {
		if (!isEditingName && user) setEditedName(user.name);
		setIsEditingName(!isEditingName);
	};

	const handleNameSave = async () => {
		if (editedName === null || !user) return;
		try {
			if (editedName !== user.name) await updateUserName({ name: editedName });
			setIsEditingName(false);
			toast.success("Name updated");
		} catch (error) {
			console.error(error);
			toast.error("Could not update your name");
		}
	};

	const handleGrant = async (event: React.FormEvent) => {
		event.preventDefault();
		setIsSavingAccess(true);
		try {
			await grantAccess({ email, role });
			setEmail("");
			toast.success("Access granted");
		} catch (error) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "Could not grant access",
			);
		} finally {
			setIsSavingAccess(false);
		}
	};

	const handleRoleChange = async (
		emailAddress: string,
		nextRole: "ADMIN" | "STUDENT",
	) => {
		try {
			await grantAccess({ email: emailAddress, role: nextRole });
			toast.success("Role updated");
		} catch (error) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "Could not update role",
			);
		}
	};

	const handleRevoke = async (emailAddress: string) => {
		try {
			await revokeAccess({ email: emailAddress });
			toast.success("Access revoked");
		} catch (error) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "Could not revoke access",
			);
		}
	};

	const confirmPendingAction = async () => {
		const action = pendingAction;
		setPendingAction(null);
		if (!action) return;
		if (action.type === "role") {
			await handleRoleChange(action.email, action.role);
		} else {
			await handleRevoke(action.email);
		}
	};

	const handleMigration = async () => {
		try {
			const result = await migrateFromEnvironment({});
			toast.success(
				`Imported ${result.linkedUsers + result.awaitingFirstSignIn} access grants`,
			);
		} catch (error) {
			console.error(error);
			toast.error(
				error instanceof Error ? error.message : "Could not import whitelist",
			);
		}
	};

	const handleEventManagerChange = async (
		userId: Id<"users">,
		canManageEvents: boolean,
	) => {
		if (pendingEventManagerUpdates.current.has(userId)) return;
		pendingEventManagerUpdates.current.add(userId);
		setPendingEventManagerIds((current) => new Set(current).add(userId));

		try {
			await setCanManageEvents({ userId, canManageEvents });
			toast.success(
				canManageEvents ? "Event access granted" : "Event access removed",
			);
		} catch (error) {
			console.error(error);
			toast.error("Could not update event access");
		} finally {
			pendingEventManagerUpdates.current.delete(userId);
			setPendingEventManagerIds((current) => {
				const next = new Set(current);
				next.delete(userId);
				return next;
			});
		}
	};

	if (isLoading || !user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader />
			<main className="container mx-auto px-4 py-8">
				<div className="mx-auto max-w-4xl space-y-8">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<h2 className="text-3xl font-bold tracking-tight">Settings</h2>
						<Button variant="ghost" onClick={() => router.push("/admin")}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Dashboard
						</Button>
					</div>

					<Card className="p-6 sm:p-8">
						<div className="flex flex-col gap-8 sm:flex-row sm:gap-12">
							<div className="flex-1 space-y-6">
								<div className="space-y-2">
									<Label>Name</Label>
									<div className="flex gap-2">
										<Input
											disabled={!isEditingName}
											value={
												isEditingName && editedName != null
													? editedName
													: user.name
											}
											onChange={(event) => setEditedName(event.target.value)}
										/>
										<Button
											size="icon"
											variant={isEditingName ? "default" : "outline"}
											onClick={isEditingName ? handleNameSave : handleNameEdit}
											aria-label={isEditingName ? "Save name" : "Edit name"}
										>
											{isEditingName ? (
												<Check className="h-4 w-4" />
											) : (
												<Pen className="h-4 w-4" />
											)}
										</Button>
									</div>
								</div>
								<div className="space-y-2">
									<Label>Email</Label>
									<Input value={user.email} disabled className="bg-muted" />
								</div>
							</div>
							<div className="flex flex-col items-center gap-4">
								<p className="text-sm font-medium text-muted-foreground">
									Profile photo
								</p>
								<AvatarUpload imageUrl={user.imageUrl} />
							</div>
						</div>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ShieldCheck className="h-5 w-5" />
								People &amp; Access
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Approve an email before the person signs in. Revoking access
								takes effect immediately.
							</p>
						</CardHeader>
						<CardContent className="space-y-6">
							<form
								onSubmit={handleGrant}
								className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end"
							>
								<div className="space-y-2">
									<Label htmlFor="access-email">Email address</Label>
									<Input
										id="access-email"
										type="email"
										placeholder="person@bu.edu"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="access-role">Role</Label>
									<Select
										value={role}
										onValueChange={(value) =>
											setRole(value as "ADMIN" | "STUDENT")
										}
									>
										<SelectTrigger id="access-role" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="STUDENT">Student</SelectItem>
											<SelectItem value="ADMIN">Administrator</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<Button type="submit" disabled={isSavingAccess}>
									<UserPlus className="mr-2 h-4 w-4" />
									Grant access
								</Button>
							</form>

							{grants === undefined ? (
								<div className="flex justify-center py-8">
									<Spinner />
								</div>
							) : grants.length === 0 ? (
								<div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
									<span>
										Import the current whitelist before managing access.
									</span>
									<Button variant="outline" size="sm" onClick={handleMigration}>
										Import whitelist
									</Button>
								</div>
							) : (
								<div className="space-y-3">
									{revokedCount > 0 && (
										<div className="flex justify-end">
											<label
												htmlFor="show-revoked-users"
												className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
											>
												<Checkbox
													id="show-revoked-users"
													checked={showRevokedUsers}
													onCheckedChange={(checked) =>
														setShowRevokedUsers(checked === true)
													}
												/>
												Show revoked users ({revokedCount})
											</label>
										</div>
									)}
									<div className="divide-y rounded-lg border">
										{visibleGrants.map((grant) => {
										const isPending =
											grant.status === "ACTIVE" && !grant.hasSignedIn;
										const statusLabel =
											grant.status === "REVOKED"
												? "Revoked"
												: isPending
													? "Awaiting sign-in"
													: "Active";
										return (
											<div
												key={grant._id}
												className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_9rem_11rem_auto] lg:items-center"
											>
												<div className="min-w-0">
													<p className="truncate font-medium">
														{grant.name || grant.email}
													</p>
													{grant.name && (
														<p className="truncate text-sm text-muted-foreground">
															{grant.email}
														</p>
													)}
													<p className="mt-1 text-xs text-muted-foreground">
														{statusLabel}
													</p>
												</div>
												<Select
													value={grant.role}
													disabled={grant.status === "REVOKED"}
													onValueChange={(value) =>
														setPendingAction({
															type: "role",
															email: grant.email,
															role: value as "ADMIN" | "STUDENT",
														})
													}
												>
													<SelectTrigger
														className="w-full"
														aria-label={`Role for ${grant.email}`}
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="STUDENT">Student</SelectItem>
														<SelectItem value="ADMIN">Administrator</SelectItem>
													</SelectContent>
												</Select>
												<label className="flex items-center gap-2 text-sm text-muted-foreground">
													<input
														type="checkbox"
														checked={grant.canManageEvents}
														disabled={
															grant.role !== "STUDENT" ||
															grant.status !== "ACTIVE" ||
															!grant.userId ||
															pendingEventManagerIds.has(grant.userId)
														}
														onChange={(event) =>
															grant.userId &&
															void handleEventManagerChange(
																grant.userId,
																event.target.checked,
															)
														}
													/>
													Manage events
												</label>
												{grant.status === "REVOKED" ? (
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															void grantAccess({
																email: grant.email,
																role: grant.role,
															})
																.then(() => toast.success("Access restored"))
																.catch(() =>
																	toast.error("Could not restore access"),
																)
														}
													>
														<RotateCcw className="mr-2 h-4 w-4" />
														Restore
													</Button>
												) : (
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive hover:text-destructive"
														onClick={() =>
															setPendingAction({
																type: "revoke",
																email: grant.email,
															})
														}
													>
														<Ban className="mr-2 h-4 w-4" />
														Revoke
													</Button>
												)}
											</div>
										);
										})}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</main>

			<AlertDialog
				open={pendingAction !== null}
				onOpenChange={(open) => !open && setPendingAction(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pendingAction?.type === "revoke"
								? "Revoke access?"
								: "Change this role?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingAction?.type === "revoke"
								? `${pendingAction.email} will immediately lose access to the application.`
								: `${pendingAction?.email} will become ${pendingAction?.role === "ADMIN" ? "an administrator" : "a student"}.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className={
								pendingAction?.type === "revoke"
									? "bg-destructive text-white hover:bg-destructive/90"
									: undefined
							}
							onClick={() => void confirmPendingAction()}
						>
							{pendingAction?.type === "revoke"
								? "Revoke access"
								: "Change role"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
