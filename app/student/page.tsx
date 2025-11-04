"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentHeader } from "@/components/student/student-header";
import { CalendarView } from "@/components/student/calendar-view";
import { UpcomingEventsList } from "@/components/student/event/upcoming-events-list";
import { EventDetailDialog } from "@/components/student/event/event-detail-dialog";
import type { Event } from "@/lib/types";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export default function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useQuery(api.users.getCurrentUser);
  const rawEvents = useQuery(api.events.listEvents);
  const events = useMemo(() => rawEvents ?? [], [rawEvents]);
  const userSignups = useQuery(api.signups.getUserSignups) ?? [];
  const isLoading = user === undefined;

  // Derive state from URL instead of storing in state
  const eventId = searchParams.get("id");
  const selectedEvent = useMemo(() => {
    if (!eventId || events.length === 0) return null;
    return events.find((e) => e._id === eventId) ?? null;
  }, [eventId, events]);
  const dialogOpen = !!selectedEvent;

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "STUDENT")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleEventClick = (event: Event) => {
    router.push(`/student?id=${event._id}`, { scroll: false });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      router.push("/student", { scroll: false });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Sign up for Newbury Center events!
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarView events={events} onEventClick={handleEventClick} />
          </div>
          <div>
            <UpcomingEventsList
              events={events}
              signups={userSignups}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </main>
      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
