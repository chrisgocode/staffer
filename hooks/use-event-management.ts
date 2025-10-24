import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { EventSignup } from "@/lib/types";

export function useEventManagement(eventId: Id<"events">) {
  const router = useRouter();
  const [signupToRemove, setSignupToRemove] = useState<Id<"signups"> | null>(
    null,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateSignupStatus = useMutation(api.signups.confirmSignup);
  const removeStudentFromEvent = useMutation(api.events.removeStudentFromEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const handleApprove = (signupId: Id<"signups">) => {
    updateSignupStatus({ signupId, confirmed: true });
    toast.success("Signup Approved", {
      description: "The student has been scheduled for this event",
    });
  };

  const handleRemove = (signupId: Id<"signups">) => {
    setSignupToRemove(signupId);
  };

  const confirmRemoveStudent = (signups: EventSignup[]) => {
    if (!signupToRemove) return;
    const s = signups.find((u) => u._id === signupToRemove);
    if (!s) return;
    removeStudentFromEvent({
      eventId,
      studentId: s.studentId,
    });
    toast.success("Student Removed", {
      description: "The student has been removed from this event",
    });
    setSignupToRemove(null);
  };

  const handleDeleteEvent = async () => {
    try {
      await deleteEvent({ eventId });
      toast.success("Event Deleted", {
        description: "The event has been successfully deleted",
      });
      router.push("/admin");
    } catch (error) {
      toast.error("Failed to delete event");
      setShowDeleteDialog(false);
    }
  };

  return {
    signupToRemove,
    setSignupToRemove,
    showDeleteDialog,
    setShowDeleteDialog,
    handleApprove,
    handleRemove,
    confirmRemoveStudent,
    handleDeleteEvent,
  };
}
