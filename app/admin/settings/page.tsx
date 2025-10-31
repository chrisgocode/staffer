"use client";

import AvatarUpload from "@/components/student/settings/avatar-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Check, Pen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/admin-header";

export default function Settings() {
  const user = useQuery(api.users.getCurrentUser);
  const updateUserName = useMutation(api.users.updateUserName);
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [editedName, setEditedName] = useState<string | null>(null);

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

  if (!user) {
    return (
      <div>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
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
          </Card>
        </div>
      </main>
    </div>
  );
}
