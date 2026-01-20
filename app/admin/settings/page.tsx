"use client";

import { useEffect, useMemo } from "react";
import AvatarUpload from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Pen, Plus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";
import { Id } from "@/convex/_generated/dataModel";

export default function Settings() {
  const user = useQuery(api.users.getCurrentUser);
  const students = useQuery(api.users.listStudentsWithEventManagerFlag);
  const updateUserName = useMutation(api.users.updateUserName);
  const setUserCanManageEvents = useMutation(api.users.setUserCanManageEvents);
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isLoading = user === undefined;

  // Derive event managers and available students from the students list
  const eventManagers = useMemo(
    () => students?.filter((s) => s.canManageEvents === true) ?? [],
    [students],
  );
  const availableStudents = useMemo(
    () => students?.filter((s) => s.canManageEvents !== true) ?? [],
    [students],
  );

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

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

  const handleAddEventManager = async (userId: Id<"users">) => {
    try {
      await setUserCanManageEvents({
        userId,
        canManageEvents: true,
      });
      toast.success("Event manager access granted");
      setPopoverOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to grant event manager access");
    }
  };

  const handleRemoveEventManager = async (userId: Id<"users">) => {
    try {
      await setUserCanManageEvents({
        userId,
        canManageEvents: false,
      });
      toast.success("Event manager access revoked");
    } catch (error) {
      console.error(error);
      toast.error("Failed to revoke event manager access");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex flex-row justify-between max-w-3xl mx-auto mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <Button variant="ghost" onClick={() => router.push("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Profile Settings */}
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
          </Card>

          {/* Event Managers Section */}
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Event Managers
                </CardTitle>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search by name or email..." />
                      <CommandList>
                        <CommandEmpty>No students found.</CommandEmpty>
                        <CommandGroup>
                          {availableStudents.map((student) => (
                            <CommandItem
                              key={student._id}
                              value={`${student.name ?? ""} ${student.email ?? ""}`}
                              onSelect={() =>
                                handleAddEventManager(student._id)
                              }
                              className="cursor-pointer"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {student.name || "Unnamed"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {student.email}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground">
                Grant students the ability to create, edit, and manage events on
                the calendar.
              </p>
            </CardHeader>
            <CardContent>
              {students === undefined ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : eventManagers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 px-3 border border-dashed border-border rounded-lg">
                  No event managers assigned yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {eventManagers.map((manager) => (
                    <div
                      key={manager._id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {manager.name || "Unnamed"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {manager.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveEventManager(manager._id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
