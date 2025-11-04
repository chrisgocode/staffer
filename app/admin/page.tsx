"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminCalendarView } from "@/components/admin/admin-calendar-view";
import { EventManagementList } from "@/components/admin/event/event-management-list";
import { CreateEventDialog } from "@/components/admin/event/create-event-dialog";
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
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Event } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const events = useQuery(api.events.listEvents) ?? [];
  const deleteEvent = useMutation(api.events.deleteEvent);
  const pendingCounts =
    useQuery(api.signups.getPendingCountsForEvents, {
      eventIds: events.map((e) => e._id),
    }) ?? {};
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Id<"events"> | null>(null);
  const isLoading = user === undefined;

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
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

  const getPendingCount = (eventId: Id<"events">) => {
    return pendingCounts[eventId] ?? 0;
  };

  const handleDeleteEvent = (eventId: Id<"events">) => {
    setEventToDelete(eventId);
  };

  const confirmDeleteEvent = () => {
    if (!eventToDelete) return;
    deleteEvent({ eventId: eventToDelete });
    toast.success("Event Deleted", {
      description: "The event has been successfully deleted",
    });
    setEventToDelete(null);
  };

  const handleEventClick = (event: Event) => {
    router.push(`/admin/event/${event._id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onCreateEvent={() => setCreateDialogOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage Newbury Center events and review student staff signups
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
      <AlertDialog
        open={eventToDelete !== null}
        onOpenChange={(open) => !open && setEventToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone and will remove all associated signups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEvent}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
