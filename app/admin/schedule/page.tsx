"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminHeader } from "@/components/admin/admin-header";
import { StaffScheduleCalendar } from "@/components/admin/schedule/admin-schedule-view";
import { Spinner } from "@/components/ui/spinner";

export default function SchedulePage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const isLoading = user === undefined;

  // Redirect if not admin (schedule is admin-only)
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push("/admin");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div>
      <AdminHeader />
      <StaffScheduleCalendar />
    </div>
  );
}
