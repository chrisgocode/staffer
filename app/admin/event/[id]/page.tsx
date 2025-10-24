"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { SignupApprovalCard } from "@/components/signup-approval-card";
import { EditEventDialog } from "@/components/edit-event-dialog";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { Spinner } from "@/components/ui/spinner";

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
  const updateSignupStatus = useMutation(api.signups.confirmSignup);
  const removeStudentFromEvent = useMutation(api.events.removeStudentFromEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [signupToRemove, setSignupToRemove] = useState<Id<"signups"> | null>(
    null,
  );
  const isLoading = user === undefined || events === undefined;

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

  const handleApprove = (signupId: Id<"signups">) => {
    updateSignupStatus({ signupId, confirmed: true });
    toast.success("Signup Approved", {
      description: "The student has been scheduled for this event",
    });
  };

  const handleRemove = (signupId: Id<"signups">) => {
    setSignupToRemove(signupId);
  };

  const confirmRemoveStudent = () => {
    if (!signupToRemove) return;
    const s = signups.find((u) => u._id === signupToRemove);
    if (!s) return;
    removeStudentFromEvent({
      eventId: event._id,
      studentId: s.studentId,
    });
    toast.success("Student Removed", {
      description: "The student has been removed from this event",
    });
    setSignupToRemove(null);
  };

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

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent({ eventId: event._id });
      toast.success("Event Deleted", {
        description: "The event has been successfully deleted",
      });
      // Navigate immediately after successful deletion
      router.push("/admin");
    } catch (error) {
      toast.error("Failed to delete event");
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">
                      {event.title}
                    </CardTitle>
                    <p className="text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleOpenEdit}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {event.spotsTotal - event.spotsAvailable} of{" "}
                    {event.spotsTotal} spots filled
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Signups</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pending">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">
                      Pending
                      {pendingSignups.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {pendingSignups.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="scheduled">
                      Scheduled
                      {scheduledSignups.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {scheduledSignups.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pending" className="space-y-3 mt-4">
                    {pendingSignups.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No pending signups
                      </p>
                    ) : (
                      pendingSignups.map((signup) => (
                        <SignupApprovalCard
                          key={signup._id}
                          signup={signup}
                          onApprove={handleApprove}
                          onRemove={handleRemove}
                          eventStartTime={event.startTime}
                          eventEndTime={event.endTime}
                        />
                      ))
                    )}
                  </TabsContent>
                  <TabsContent value="scheduled" className="space-y-3 mt-4">
                    {scheduledSignups.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No scheduled students
                      </p>
                    ) : (
                      scheduledSignups.map((signup) => (
                        <SignupApprovalCard
                          key={signup._id}
                          signup={signup}
                          onApprove={handleApprove}
                          onRemove={handleRemove}
                          eventStartTime={event.startTime}
                          eventEndTime={event.endTime}
                        />
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Total Signups
                  </div>
                  <div className="text-2xl font-bold">{signups.length}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Pending Review
                  </div>
                  <div className="text-2xl font-bold text-secondary-foreground">
                    {pendingSignups.length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Scheduled
                  </div>
                  <div className="text-2xl font-bold text-accent">
                    {scheduledSignups.length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Spots Remaining
                  </div>
                  <div className="text-2xl font-bold">
                    {event.spotsAvailable}
                  </div>
                </div>
              </CardContent>
            </Card>
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
              onClick={confirmRemoveStudent}
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
