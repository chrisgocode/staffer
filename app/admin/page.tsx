"use client";

import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin-header";
import { AdminCalendarView } from "@/components/admin-calendar-view";
import { EventManagementList } from "@/components/event-management-list";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Event } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const events = useQuery(api.events.listEvents) ?? [];
  const deleteEvent = useMutation(api.events.deleteEvent);
  const pendingCounts =
    useQuery(api.signups.getPendingCountsForEvents, {
      eventIds: events.map((e) => e._id),
    }) ?? {};
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const isLoading = user === undefined;

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
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

  const getPendingCount = (eventId: Id<"events">) => {
    return pendingCounts[eventId] ?? 0;
  };

  const handleDeleteEvent = (eventId: Id<"events">) => {
    if (
      confirm(
        "Are you sure you want to delete this event? This action cannot be undone.",
      )
    ) {
      deleteEvent({ eventId });
      toast.success("Event Deleted", {
        description: "The event has been successfully deleted",
      });
    }
  };

  const handleEventClick = (event: Event) => {
    window.location.href = `/admin/event/${event._id}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onCreateEvent={() => setCreateDialogOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage events and review student applications
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AdminCalendarView
              events={events}
              onEventClick={handleEventClick}
              getPendingCount={getPendingCount}
            />
          </div>
          <div>
            <EventManagementList
              events={events}
              onEventClick={handleEventClick}
              onDeleteEvent={handleDeleteEvent}
              getPendingCount={getPendingCount}
            />
          </div>
        </div>
      </main>
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
