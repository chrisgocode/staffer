"use client";

import { AlertCircleIcon, RefreshCcw, FileText, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AvatarUpload from "@/components/ui/avatar-upload";
import { StudentHeader } from "@/components/student/student-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/ui/shadcn-io/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Pen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";

export default function Settings() {
  const user = useQuery(api.users.getCurrentUser);
  const getCalendarURL = useQuery(api.calendar.getMyCalendarUrl);
  const generateCalendarToken = useMutation(api.calendar.generateCalendarToken);
  const updateUserName = useMutation(api.users.updateUserName);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadSchedule = useMutation(api.users.uploadSchedule);
  const deleteSchedule = useMutation(api.users.deleteSchedule);
  const scheduleUrl = useQuery(api.users.getScheduleUrl);
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [isUploadingSchedule, setIsUploadingSchedule] = useState(false);

  const calendarURL = getCalendarURL;

  if (!calendarURL) {
    return;
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isActive && user) {
      setEditedName(user.name);
    }
    setIsActive(!isActive);
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (editedName === null || !user) {
        return;
      }

      // Only call the mutation if the name actually changed
      if (editedName !== user.name) {
        updateUserName({ name: editedName });
        toast.success("Your name has been successfully updated!");
      }

      setIsActive(!isActive);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong, please try again.");
    }
  };

  const handleRegenerateToken = async () => {
    try {
      await generateCalendarToken();
      toast.success("Calendar token regenerated successfully!");
    } catch (error) {
      console.log(error);
      toast.error("Failed to regenerate token. Please try again.");
    }
  };

  const handleScheduleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Invalid file type. Please upload a PDF file.");
      return;
    }

    // Validate file size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
      toast.error("File size exceeds 1MB. Please upload a smaller file.");
      return;
    }

    setIsUploadingSchedule(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      // Save the storage ID to the user record
      await uploadSchedule({ storageId });

      setScheduleFile(file);
      toast.success("Schedule uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload schedule. Please try again.");
    } finally {
      setIsUploadingSchedule(false);
    }
  };

  const handleScheduleDelete = async () => {
    try {
      await deleteSchedule();
      setScheduleFile(null);
      toast.success("Schedule deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete schedule. Please try again.");
    }
  };

  if (!user) {
    return (
      <div>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="container mx-auto px-4 py-8">
        <div>
          <div className="flex flex-row justify-between max-w-3xl mx-auto mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <Button variant="ghost" onClick={() => router.push("/student")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <Card className="max-w-3xl mx-auto p-8">
            <div className="flex flex-row gap-12">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Name
                  </Label>
                  <div className="flex flex-row gap-2">
                    <Input
                      className="flex-1"
                      disabled={!isActive}
                      value={
                        isActive && editedName != null ? editedName : user.name
                      }
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                    {!isActive ? (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleEditClick}
                      >
                        <Pen className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleSubmit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center space-y-4 pt-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Update your photo
                </p>
                <AvatarUpload imageUrl={user.imageUrl} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Calendar URL
              </Label>
              <div className="flex flex-row gap-2">
                <Input
                  value={user.calendarToken ? calendarURL.url : ""}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <CopyButton
                  variant="outline"
                  content={user.calendarToken ? calendarURL.url : ""}
                  onCopy={() =>
                    toast.success("Calendar URL copied to clipboard!")
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Regenerate Calendar Token?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will invalidate your current calendar URL.
                        You&apos;ll need to update any calendar subscriptions
                        with the new URL. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-800 hover:bg-red-600"
                        onClick={handleRegenerateToken}
                      >
                        Regenerate Token
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="grid w-full max-w-xl items-start gap-4">
              <Alert variant="warning">
                <AlertCircleIcon />
                <AlertTitle>Keep your calendar URL private</AlertTitle>
                <AlertDescription>
                  <p>
                    This URL contains a private token that grants read-only
                    access to your calendar. Only add it to trusted calendar
                    applications.
                  </p>
                  <p>
                    If you believe your URL has been compromised, regenerate
                    your token immediately and update your calendar
                    subscription.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                University Schedule
              </Label>
              <div className="flex flex-col gap-2">
                {user.scheduleFileId || scheduleFile ? (
                  <div className="flex items-center gap-2 p-4 border rounded-md">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm">
                      {scheduleFile?.name || "schedule.pdf"}
                    </span>
                    {scheduleUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(scheduleUrl, "_blank")}
                      >
                        View
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your uploaded schedule.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-800 hover:bg-red-600"
                            onClick={handleScheduleDelete}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <Dropzone
                    accept={{ "application/pdf": [".pdf"] }}
                    maxFiles={1}
                    maxSize={1048576}
                    onDrop={handleScheduleUpload}
                    disabled={isUploadingSchedule}
                    onError={(error) => {
                      toast.error(error.message);
                    }}
                  >
                    <DropzoneEmptyState />
                    <DropzoneContent />
                  </Dropzone>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload your university schedule from Student Link (PDF format,
                max 1MB)
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
