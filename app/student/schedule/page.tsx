"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ReadOnlyScheduleCalendar } from "@/components/student/read-only-schedule-calendar";
import { StudentHeader } from "@/components/student/student-header";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";

export default function StudentSchedulePage() {
	const router = useRouter();
	const user = useQuery(api.users.getCurrentUser);
	const canViewSchedule =
		user?.accessStatus === "ACTIVE" && user.role === "STUDENT";

	useEffect(() => {
		if (user !== undefined && !canViewSchedule) router.replace("/unauthorized");
	}, [canViewSchedule, router, user]);

	if (user === undefined) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}
	if (!canViewSchedule) return null;

	return (
		<div className="min-h-screen bg-background">
			<StudentHeader />
			<main className="container mx-auto px-4 py-8">
				<ReadOnlyScheduleCalendar />
			</main>
		</div>
	);
}
