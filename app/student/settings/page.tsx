"use client";

import {
  AlertCircleIcon,
  RefreshCcw,
  FileText,
  Trash2,
  Clock,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/ui/shadcn-io/copy-button";
import { semesterOptions } from "@/lib/schedule-utils";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Pen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

interface TimeBlock {
  start: string;
  end: string;
}

interface DayPreference {
  isFullDayOff: boolean;
  timeBlocks: TimeBlock[];
}

type SchedulePreferences = {
  [key in DayOfWeek]: DayPreference;
};

export default function Settings() {
  const user = useQuery(api.users.getCurrentUser);
  const getCalendarURL = useQuery(api.calendar.getMyCalendarUrl);
  const generateCalendarToken = useMutation(api.calendar.generateCalendarToken);
  const updateUserName = useMutation(api.users.updateUserName);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadSchedule = useMutation(api.users.uploadSchedule);
  const deleteSchedule = useMutation(api.users.deleteSchedule);
  const scheduleUrl = useQuery(api.users.getScheduleUrl);
  const updateSchedulePreferences = useMutation(
    api.users.updateSchedulePreferences,
  );
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [isUploadingSchedule, setIsUploadingSchedule] = useState(false);
  const [schedulePreferences, setSchedulePreferences] =
    useState<SchedulePreferences>({
      monday: { isFullDayOff: false, timeBlocks: [] },
      tuesday: { isFullDayOff: false, timeBlocks: [] },
      wednesday: { isFullDayOff: false, timeBlocks: [] },
      thursday: { isFullDayOff: false, timeBlocks: [] },
      friday: { isFullDayOff: false, timeBlocks: [] },
    });
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>(
    semesterOptions[0],
  );

  const daysOfWeek: { key: DayOfWeek; label: string; short: string }[] = [
    { key: "monday", label: "Monday", short: "Mon" },
    { key: "tuesday", label: "Tuesday", short: "Tue" },
    { key: "wednesday", label: "Wednesday", short: "Wed" },
    { key: "thursday", label: "Thursday", short: "Thu" },
    { key: "friday", label: "Friday", short: "Fri" },
  ];

  const calendarURL = getCalendarURL;

  // Load preferences from user data for selected semester
  useEffect(() => {
    if (user?.preferences?.schedule?.[selectedSemester]) {
      setSchedulePreferences(user.preferences.schedule[selectedSemester]);
    } else {
      // Reset to defaults if no preferences for this semester
      setSchedulePreferences({
        monday: { isFullDayOff: false, timeBlocks: [] },
        tuesday: { isFullDayOff: false, timeBlocks: [] },
        wednesday: { isFullDayOff: false, timeBlocks: [] },
        thursday: { isFullDayOff: false, timeBlocks: [] },
        friday: { isFullDayOff: false, timeBlocks: [] },
      });
    }
  }, [user, selectedSemester]);

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

      // Save the storage ID and filename to the user record
      await uploadSchedule({ storageId, filename: file.name });

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
      toast.success("Schedule deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete schedule. Please try again.");
    }
  };

  const toggleFullDay = (day: DayOfWeek) => {
    setSchedulePreferences((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isFullDayOff: !prev[day].isFullDayOff,
        timeBlocks: !prev[day].isFullDayOff ? [] : prev[day].timeBlocks,
      },
    }));
  };

  const addTimeBlock = (day: DayOfWeek) => {
    setSchedulePreferences((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeBlocks: [...prev[day].timeBlocks, { start: "09:00", end: "17:00" }],
      },
    }));
  };

  const removeTimeBlock = (day: DayOfWeek, index: number) => {
    setSchedulePreferences((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeBlocks: prev[day].timeBlocks.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeBlock = (
    day: DayOfWeek,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    setSchedulePreferences((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeBlocks: prev[day].timeBlocks.map((block, i) =>
          i === index ? { ...block, [field]: value } : block,
        ),
      },
    }));
  };

  const formatTimeBlocks = (blocks: TimeBlock[]) => {
    if (blocks.length === 0) return null;
    return blocks.map((block) => `${block.start}-${block.end}`).join(", ");
  };

  const handleSavePreferences = async () => {
    try {
      await updateSchedulePreferences({
        semester: selectedSemester,
        preferences: schedulePreferences,
      });
      toast.success("Schedule preferences saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save preferences. Please try again.");
    }
  };

  if (!user || !calendarURL) {
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
                Class Schedule
              </Label>
              <div className="flex flex-col gap-2">
                {user.scheduleFileId ? (
                  <div className="flex items-center gap-2 p-4 border rounded-md">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 text-sm">
                      {user.scheduleFilename || "schedule.pdf"}
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
                Upload your class schedule from Student Link (PDF format, max
                1MB)
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Schedule Preferences
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Mark days or times when you prefer not to work
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Semester
                  </Label>
                  <Select
                    value={selectedSemester}
                    onValueChange={setSelectedSemester}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesterOptions.map((semester) => (
                        <SelectItem key={semester} value={semester}>
                          {semester}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {daysOfWeek.map(({ key, label, short }) => {
                  const dayPref = schedulePreferences[key];
                  const hasPreferences =
                    dayPref.isFullDayOff || dayPref.timeBlocks.length > 0;
                  const isSelected = selectedDay === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(isSelected ? null : key)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : hasPreferences
                            ? "border-amber-500/50 bg-amber-500/5"
                            : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{short}</div>
                      <div className="text-xs text-muted-foreground">
                        {dayPref.isFullDayOff ? (
                          <span className="text-amber-600 font-medium">
                            Off
                          </span>
                        ) : dayPref.timeBlocks.length > 0 ? (
                          <span className="text-amber-600 font-medium">
                            {dayPref.timeBlocks.length} block
                            {dayPref.timeBlocks.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span>Available</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDay && (
                <Card className="p-6 border-primary/50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {daysOfWeek.find((d) => d.key === selectedDay)?.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Set your availability preferences
                        </p>
                      </div>
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          Mark entire day as unavailable
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Toggle this if you don&apos;t want to work at all on
                          this day
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFullDay(selectedDay)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          schedulePreferences[selectedDay].isFullDayOff
                            ? "bg-amber-600"
                            : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            schedulePreferences[selectedDay].isFullDayOff
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {!schedulePreferences[selectedDay].isFullDayOff && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">
                            Specific unavailable times
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeBlock(selectedDay)}
                            className="h-8"
                          >
                            Add Block
                          </Button>
                        </div>

                        {schedulePreferences[selectedDay].timeBlocks.length ===
                        0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                            No time blocks set. Click &quot;Add Block&quot; to
                            mark specific unavailable hours.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {schedulePreferences[selectedDay].timeBlocks.map(
                              (block, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input
                                      type="time"
                                      value={block.start}
                                      onChange={(e) =>
                                        updateTimeBlock(
                                          selectedDay,
                                          index,
                                          "start",
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      to
                                    </span>
                                    <Input
                                      type="time"
                                      value={block.end}
                                      onChange={(e) =>
                                        updateTimeBlock(
                                          selectedDay,
                                          index,
                                          "end",
                                          e.target.value,
                                        )
                                      }
                                      className="flex-1"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      removeTimeBlock(selectedDay, index)
                                    }
                                    className="h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePreferences}>
                  Save Preferences
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
