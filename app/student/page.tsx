"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentHeader } from "@/components/student/student-header";
import { CalendarView } from "@/components/student/calendar-view";
import { UpcomingEventsList } from "@/components/student/event/upcoming-events-list";
import { EventDetailDialog } from "@/components/student/event/event-detail-dialog";
import type { Event } from "@/lib/types";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function StudentDashboard() {
  const [isCalendarEnlarged, setIsCalendarEnlarged] = useState(false);
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useQuery(api.users.getCurrentUser);
  const updateCalendarPreferences = useMutation(
    api.users.updateCalendarPreferences,
  );
  const rawEvents = useQuery(api.events.listEvents);
  const events = useMemo(() => rawEvents ?? [], [rawEvents]);
  const userSignups = useQuery(api.signups.getUserSignups) ?? [];

  // Fetch signups for all events using batch query
  const eventSignupsData = useQuery(
    api.signups.getPublicEventSignupsBatch,
    events.length > 0 ? { eventIds: events.map((e) => e._id) } : "skip",
  );
  const eventSignups = useMemo(() => {
    return eventSignupsData ?? {};
  }, [eventSignupsData]);

  const isLoading = user === undefined;

  // Load preferences from user
  useEffect(() => {
    if (user?.preferences?.ui?.calendar) {
      const calendarPrefs = user.preferences.ui.calendar;
      setIsCalendarEnlarged(calendarPrefs.enlarged ?? false);
      setCalendarView(calendarPrefs.view ?? "month");
    }
  }, [user]);

  // Save preferences when they change
  const handleEnlargeToggle = (enlarged: boolean) => {
    setIsCalendarEnlarged(enlarged);
    updateCalendarPreferences({ enlarged });
  };

  const handleViewChange = (view: "month" | "week") => {
    setCalendarView(view);
    updateCalendarPreferences({ view });
  };

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
        {isCalendarEnlarged ? (
          <div className="space-y-6">
            <div className="w-full">
              <CalendarView
                events={events}
                onEventClick={handleEventClick}
                isEnlarged={isCalendarEnlarged}
                onEnlargeToggle={handleEnlargeToggle}
                eventSignups={eventSignups}
                initialView={calendarView}
                onViewChange={handleViewChange}
              />
            </div>
            <div className="w-full">
              <UpcomingEventsList
                events={events}
                signups={userSignups}
                onEventClick={handleEventClick}
                isEnlarged={isCalendarEnlarged}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CalendarView
                events={events}
                onEventClick={handleEventClick}
                isEnlarged={isCalendarEnlarged}
                onEnlargeToggle={handleEnlargeToggle}
                eventSignups={eventSignups}
                initialView={calendarView}
                onViewChange={handleViewChange}
              />
            </div>
            <div>
              <UpcomingEventsList
                events={events}
                signups={userSignups}
                onEventClick={handleEventClick}
                isEnlarged={isCalendarEnlarged}
              />
            </div>
          </div>
        )}
      </main>
      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
