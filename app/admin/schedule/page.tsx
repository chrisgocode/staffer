"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { StaffScheduleCalendar } from "@/components/admin/schedule/admin-schedule-view";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";

export default function SchedulePage() {
	const router = useRouter();
	const user = useQuery(api.users.getCurrentUser);
	const hasActiveAccess =
		user?.accessStatus === "ACTIVE" && user.role === "ADMIN";
	const isLoading = user === undefined;

	useEffect(() => {
		if (isLoading || hasActiveAccess) return;
		router.replace(
			user?.accessStatus === "REVOKED"
				? "/unauthorized"
				: user
					? "/admin"
					: "/",
		);
	}, [user, isLoading, hasActiveAccess, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (!hasActiveAccess) {
		return null;
	}

	return (
		<div>
			<AdminHeader />
			<StaffScheduleCalendar />
		</div>
	);
}
