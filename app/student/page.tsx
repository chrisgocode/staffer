"use client";

import { useState, useEffect, useMemo } from "react";
import { StudentHeader } from "@/components/student/student-header";
import { CalendarView } from "@/components/student/calendar-view";
import { UpcomingEventsList } from "@/components/student/event/upcoming-events-list";
import { EventDetailDialog } from "@/components/student/event/event-detail-dialog";
import type { Event } from "@/lib/types";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function StudentDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const rawEvents = useQuery(api.events.listEvents);
  const events = useMemo(() => rawEvents ?? [], [rawEvents]);
  const userSignups = useQuery(api.signups.getUserSignups) ?? [];
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const isLoading = user === undefined;

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "STUDENT")) {
      window.location.href = "/";
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
    window.history.pushState({}, "", `/student?id=${event._id}`);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      window.history.pushState({}, "", "/student");
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
