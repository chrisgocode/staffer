"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { EditEventDialog } from "@/components/admin/event/edit-event-dialog";
import { CreateEventDialog } from "@/components/admin/event/create-event-dialog";
import { EventInfoCard } from "@/components/admin/event/event-info-card";
import { EventSignupsCard } from "@/components/admin/event/event-signups-card";
import { EventStatisticsCard } from "@/components/admin/event/event-statistics-card";
import { Button } from "@/components/ui/button";
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
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Spinner } from "@/components/ui/spinner";
import { useEventManagement } from "@/hooks/use-event-management";

export default function EventDetailPage() {
  const routeParams = useParams<{ id: string }>();
  const user = useQuery(api.users.getCurrentUser);
  const events = useQuery(api.events.listEvents);
  const event = events?.find((e) => e._id === routeParams.id);
  const eventSignups =
    useQuery(
      api.signups.getEventSignups,
      event ? { eventId: event._id } : "skip",
    ) ?? [];
  const searchParams = useSearchParams();
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const isLoading = user === undefined || events === undefined;

  const {
    signupToRemove,
    setSignupToRemove,
    showDeleteDialog,
    setShowDeleteDialog,
    handleApprove,
    handleRemove,
    confirmRemoveStudent,
    handleDeleteEvent,
  } = useEventManagement(event?._id || ("" as any));

  useEffect(() => {
    setEditDialogOpen(searchParams.get("edit") === "1");
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader onCreateEvent={() => setCreateDialogOpen(true)} />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center justify-center">
            <div className="scale-150 mb-4">
              <Spinner />
            </div>
            <div className="text-center text-muted-foreground text-lg font-medium">
              Loading event details...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader onCreateEvent={() => setCreateDialogOpen(true)} />
        <main className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The event you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const signups = eventSignups;
  const pendingSignups = signups.filter((s) => s.status === "PENDING");
  const scheduledSignups = signups.filter((s) => s.status === "SCHEDULED");

  const handleOpenEdit = () => {
    setEditDialogOpen(true);
    router.push(`/admin/event/${routeParams.id}?edit=1`);
  };

  const handleCloseEdit = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      router.push(`/admin/event/${routeParams.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader onCreateEvent={() => setCreateDialogOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EventInfoCard
              event={event}
              onEdit={handleOpenEdit}
              onDelete={() => setShowDeleteDialog(true)}
            />

            <EventSignupsCard
              signups={signups}
              eventStartTime={event.startTime}
              eventEndTime={event.endTime}
              onApprove={handleApprove}
              onRemove={handleRemove}
            />
          </div>

          <div>
            <EventStatisticsCard
              totalSignups={signups.length}
              pendingSignups={pendingSignups.length}
              scheduledSignups={scheduledSignups.length}
              spotsAvailable={event.spotsAvailable}
            />
          </div>
        </div>
      </main>
      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <EditEventDialog
        event={event}
        open={editDialogOpen}
        onOpenChange={handleCloseEdit}
      />
      <AlertDialog
        open={signupToRemove !== null}
        onOpenChange={(open) => !open && setSignupToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this student from the event? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveStudent(signups)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={handleDeleteEvent}
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
