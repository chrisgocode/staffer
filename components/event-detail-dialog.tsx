"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit2,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import type { Event } from "@/lib/types";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
}: EventDetailDialogProps) {
  const user = useQuery(api.users.getCurrentUser);
  const addSignup = useMutation(api.signups.signupForEvent);
  const userSignups = useQuery(api.signups.getUserSignups) ?? [];
  const updateSignup = useMutation(api.signups.editSignupEvent);
  const deleteSignup = useMutation(api.signups.cancelSignup);
  const eventSignups =
    useQuery(
      api.signups.getPublicEventSignups,
      event ? { eventId: event._id } : "skip",
    ) ?? [];
  const [timeslots, setTimeslots] = useState<
    Array<{ startTime: string; endTime: string }>
  >([{ startTime: "", endTime: "" }]);
  const [isEditingSignup, setIsEditingSignup] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (!event) return null;

  const existingSignup = userSignups.find(
    (signup) => signup.eventId === event._id,
  );

  const handleEditSignup = () => {
    if (existingSignup) {
      setTimeslots(
        existingSignup.timeslots.length > 0
          ? existingSignup.timeslots.map(
              (slot: { startTime: string; endTime: string }) => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
              }),
            )
          : [{ startTime: "", endTime: "" }],
      );
      setIsEditingSignup(true);
    }
  };

  const addTimeslot = () => {
    if (timeslots.length < 2) {
      setTimeslots([...timeslots, { startTime: "", endTime: "" }]);
    }
  };

  const removeTimeslot = (index: number) => {
    if (timeslots.length > 1) {
      setTimeslots(timeslots.filter((_, i) => i !== index));
    }
  };

  const updateTimeslot = (
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    const newTimeslots = [...timeslots];
    newTimeslots[index][field] = value;
    setTimeslots(newTimeslots);
  };

  const handleSignUp = () => {
    if (!user) return;

    if (existingSignup && !isEditingSignup) {
      toast.error("Already Signed Up", {
        description: "You have already applied for this event",
      });
      return;
    }

    if (event.spotsAvailable <= 0 && !isEditingSignup) {
      toast.error("Event Full", {
        description: "No spots available for this event",
      });
      return;
    }

    const validTimeslots = timeslots.filter(
      (slot) => slot.startTime && slot.endTime,
    );

    if (validTimeslots.length > 0) {
      for (const slot of validTimeslots) {
        if (
          slot.startTime < event.startTime ||
          slot.endTime > event.endTime ||
          slot.startTime >= slot.endTime
        ) {
          toast.error("Invalid Time Range", {
            description:
              "Please select valid time ranges within the event hours",
          });
          return;
        }
      }
    }

    if (isEditingSignup && existingSignup) {
      const first =
        validTimeslots.length > 0
          ? validTimeslots[0]
          : {
              startTime: event.startTime.toString(),
              endTime: event.endTime.toString(),
            };

      updateSignup({
        signupId: existingSignup._id,
        timeSlotStart: first.startTime,
        timeSlotEnd: first.endTime,
      });

      toast.success("Signup Updated", {
        description: "Your availability has been updated",
      });

      setIsEditingSignup(false);
      setTimeslots([{ startTime: "", endTime: "" }]);
    } else {
      const first =
        validTimeslots.length > 0
          ? validTimeslots[0]
          : {
              startTime: event.startTime.toString(),
              endTime: event.endTime.toString(),
            };

      addSignup({
        eventId: event._id,
        timeSlotStart: first.startTime,
        timeSlotEnd: first.endTime,
      });

      toast.success("You are signed up for this event", {
        description: "Your signup is pending admin approval",
      });

      setTimeslots([{ startTime: "", endTime: "" }]);
    }

    onOpenChange(false);
  };

  const handleCancelSignup = () => {
    if (!existingSignup) return;
    deleteSignup({ signupId: existingSignup._id });

    toast.success("Signup Cancelled", {
      description: "You have been removed from this event",
    });

    setShowCancelDialog(false);
    onOpenChange(false);
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

  const getInitials = (fullName?: string) => {
    if (!fullName) return "S";
    const parts = fullName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "S";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setIsEditingSignup(false);
          setTimeslots([{ startTime: "", endTime: "" }]);
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{event.title}</DialogTitle>
          <DialogDescription>{event.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
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
              {event.spotsAvailable} of {event.spotsTotal} spots available
            </span>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Students Signed Up ({eventSignups.length})
              </h4>
            </div>
            {eventSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students have signed up yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {eventSignups.map((s) => (
                  <li key={s._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(s.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">
                          {s.studentName}
                          {user?._id === s.studentId && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (You)
                            </span>
                          )}
                        </div>
                        {s.timeslots.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            {s.timeslots
                              .map(
                                (t) =>
                                  `${formatTime(t.startTime)} - ${formatTime(t.endTime)}`,
                              )
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        s.status === "SCHEDULED"
                          ? "default"
                          : s.status === "PENDING"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user?.role === "STUDENT" && (!existingSignup || isEditingSignup) && (
            <div className="pt-4 border-t space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {isEditingSignup
                    ? "Update Your Availability"
                    : "Select Your Availability (Optional)"}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  If you can only work part of the event, select your available
                  time range(s). Add a second timeslot if you have a class
                  break.
                </p>
                <div className="space-y-3">
                  {timeslots.map((slot, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Timeslot {index + 1}
                        </Label>
                        {timeslots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeTimeslot(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`start-time-${index}`}
                            className="text-sm"
                          >
                            Start Time
                          </Label>
                          <input
                            id={`start-time-${index}`}
                            type="time"
                            value={slot.startTime}
                            onChange={(e) =>
                              updateTimeslot(index, "startTime", e.target.value)
                            }
                            min={event.startTime}
                            max={event.endTime}
                            className="w-full px-3 py-2 border border-border rounded-md text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`end-time-${index}`}
                            className="text-sm"
                          >
                            End Time
                          </Label>
                          <input
                            id={`end-time-${index}`}
                            type="time"
                            value={slot.endTime}
                            onChange={(e) =>
                              updateTimeslot(index, "endTime", e.target.value)
                            }
                            min={event.startTime}
                            max={event.endTime}
                            className="w-full px-3 py-2 border border-border rounded-md text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {timeslots.length < 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTimeslot}
                      className="gap-2 bg-transparent"
                    >
                      <Plus className="h-4 w-4" />
                      Add Second Timeslot
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {existingSignup && !isEditingSignup && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your Status:</span>
                <Badge
                  variant={
                    existingSignup.status === "SCHEDULED"
                      ? "default"
                      : existingSignup.status === "PENDING"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {existingSignup.status.charAt(0).toUpperCase() +
                    existingSignup.status.slice(1)}
                </Badge>
              </div>
              {existingSignup.timeslots.length > 0 && (
                <div className="text-sm space-y-1">
                  <span className="font-medium">Your Availability:</span>
                  {existingSignup.timeslots.map((slot, index) => (
                    <div key={index} className="text-muted-foreground pl-4">
                      Timeslot {index + 1}: {formatTime(slot.startTime)} -{" "}
                      {formatTime(slot.endTime)}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditSignup}
                  className="gap-2 bg-transparent"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Availability
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                  className="gap-2 text-destructive bg-transparent"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Signup
                </Button>
              </div>
            </div>
          )}

          {user?.role === "STUDENT" && (!existingSignup || isEditingSignup) && (
            <div className="flex gap-2">
              {isEditingSignup && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingSignup(false);
                    setTimeslots([{ startTime: "", endTime: "" }]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSignUp}
                className="flex-1"
                disabled={!isEditingSignup && event.spotsAvailable <= 0}
              >
                {isEditingSignup
                  ? "Update Signup"
                  : event.spotsAvailable <= 0
                    ? "Event Full"
                    : "Sign Up for Event"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Signup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your signup for this event? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Signup</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSignup}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Signup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
