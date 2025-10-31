"use client";

import { AlertCircleIcon, RefreshCcw } from "lucide-react";
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
import AvatarUpload from "@/components/student/settings/avatar-upload";
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

export default function Settings() {
  const user = useQuery(api.users.getCurrentUser);
  const getCalendarURL = useQuery(api.calendar.getMyCalendarUrl);
  const generateCalendarToken = useMutation(api.calendar.generateCalendarToken);
  const updateUserName = useMutation(api.users.updateUserName);
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [editedName, setEditedName] = useState<string | null>(null);

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
                <AvatarUpload />
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
          </Card>
        </div>
      </main>
    </div>
  );
}
