"use client";

import { useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	Ban,
	Check,
	Pen,
	RotateCcw,
	Search,
	ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { createAccessGrantSearch } from "@/components/admin/settings/access-grant-search";
import { GrantAccessDialog } from "@/components/admin/settings/grant-access-dialog";
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
	const [accessQuery, setAccessQuery] = useState("");
	const [showRevokedUsers, setShowRevokedUsers] = useState(false);
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(
		null,
	);
	const pendingEventManagerUpdates = useRef(new Set<Id<"users">>());
	const [pendingEventManagerIds, setPendingEventManagerIds] = useState(
		new Set<Id<"users">>(),
	);
	const pendingRestores = useRef(new Set<string>());
	const [pendingRestoreEmails, setPendingRestoreEmails] = useState(
		new Set<string>(),
	);
	const isLoading = user === undefined;
	const revokedCount =
		grants?.filter((grant) => grant.status === "REVOKED").length ?? 0;
	const visibleGrants = useMemo(
		() =>
			(grants ?? []).filter(
				(grant) => showRevokedUsers || grant.status !== "REVOKED",
			),
		[grants, showRevokedUsers],
	);
	const accessGrantSearch = useMemo(
		() => createAccessGrantSearch(visibleGrants),
		[visibleGrants],
	);
	const matchingGrants = useMemo(() => {
		const query = accessQuery.trim();
		return query
			? accessGrantSearch.search(query).map(({ item }) => item)
			: visibleGrants;
	}, [accessGrantSearch, accessQuery, visibleGrants]);

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

	const handleRoleChange = async (
		emailAddress: string,
		nextRole: "ADMIN" | "STUDENT",
		successMessage = "Role updated",
		fallbackError = "Could not update role",
	) => {
		try {
			await grantAccess({ email: emailAddress, role: nextRole });
			toast.success(successMessage);
		} catch (error) {
			console.error(error);
			toast.error(error instanceof Error ? error.message : fallbackError);
		}
	};

	const handleRestore = async (
		emailAddress: string,
		role: "ADMIN" | "STUDENT",
	) => {
		if (pendingRestores.current.has(emailAddress)) return;
		pendingRestores.current.add(emailAddress);
		setPendingRestoreEmails((current) => new Set(current).add(emailAddress));
		try {
			await handleRoleChange(
				emailAddress,
				role,
				"Access restored",
				"Could not restore access",
			);
		} finally {
			pendingRestores.current.delete(emailAddress);
			setPendingRestoreEmails((current) => {
				const next = new Set(current);
				next.delete(emailAddress);
				return next;
			});
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
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div className="space-y-1.5">
									<CardTitle className="flex items-center gap-2">
										<ShieldCheck className="h-5 w-5" />
										People &amp; Access
									</CardTitle>
									<p className="text-sm text-muted-foreground">
										Approve an email before the person signs in. Revoking access
										takes effect immediately.
									</p>
								</div>
								<GrantAccessDialog disabled={grants === undefined} />
							</div>
						</CardHeader>
						<CardContent className="space-y-6">
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
									<div className="flex items-center gap-3">
										<div className="relative min-w-0 flex-1">
											<Label htmlFor="access-search" className="sr-only">
												Search users by name or email
											</Label>
											<Search
												aria-hidden="true"
												className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
											/>
											<Input
												id="access-search"
												type="search"
												placeholder="Search by name or email…"
												value={accessQuery}
												onChange={(event) => setAccessQuery(event.target.value)}
												className="pl-9"
											/>
										</div>
										<label
											htmlFor="show-revoked-users"
											className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-muted-foreground"
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
									{matchingGrants.length === 0 ? (
										<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
											{accessQuery.trim()
												? `No users match “${accessQuery.trim()}”.`
												: "No users to display."}
										</div>
									) : (
										<div
											className="h-128 divide-y overflow-y-scroll overscroll-contain rounded-lg border"
											role="region"
											aria-label="People with access"
											tabIndex={0}
										>
											{matchingGrants.map((grant) => {
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
																<SelectItem value="ADMIN">
																	Administrator
																</SelectItem>
															</SelectContent>
														</Select>
														<div className="flex items-center gap-2 text-sm text-muted-foreground">
															<Checkbox
																id={`manage-events-${grant._id}`}
																aria-label={`Manage events for ${grant.name || grant.email}`}
																checked={grant.canManageEvents}
																disabled={
																	grant.role !== "STUDENT" ||
																	grant.status !== "ACTIVE" ||
																	!grant.userId ||
																	pendingEventManagerIds.has(grant.userId)
																}
																onCheckedChange={(checked) =>
																	grant.userId &&
																	void handleEventManagerChange(
																		grant.userId,
																		checked === true,
																	)
																}
															/>
															<label htmlFor={`manage-events-${grant._id}`}>
																Manage events
															</label>
														</div>
														{grant.status === "REVOKED" ? (
															<Button
																variant="outline"
																size="sm"
																disabled={pendingRestoreEmails.has(grant.email)}
																onClick={() =>
																	void handleRestore(grant.email, grant.role)
																}
															>
																<RotateCcw className="mr-2 h-4 w-4" />
																{pendingRestoreEmails.has(grant.email)
																	? "Restoring…"
																	: "Restore"}
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
									)}
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
