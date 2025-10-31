"use client";

import { ChangeEvent } from "react";
import { TrashIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";

export default function AvatarUpload({ imageUrl }: { imageUrl?: string }) {
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateUserAvatar = useMutation(api.users.updateUserAvatar);
  const deleteUserAvatar = useMutation(api.users.deleteUserAvatar);

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    try {
      const postUrl = await generateUploadUrl();

      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`);
      const { storageId } = await result.json(); // Convex returns the file’s storage ID
      await updateUserAvatar({ storageId });
    } catch (err) {
      console.error("Error uploading avatar:", err);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await deleteUserAvatar();
    } catch (err) {
      console.error("Error deleting avatar:", err);
    }
  };

  return (
    <div className="relative w-32 h-32 rounded-full overflow-hidden">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt="User Avatar"
          width={128}
          height={128}
          className="w-full h-full object-cover"
          style={{ aspectRatio: "128/128", objectFit: "cover" }}
        />
      ) : (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center group-hover:opacity-100 transition-opacity duration-200">
          <UploadIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
      <label
        htmlFor="avatar-upload"
        className="absolute inset-0 cursor-pointer group"
      >
        <input
          id="avatar-upload"
          type="file"
          className="sr-only"
          onChange={handleAvatarUpload}
        />
        {imageUrl && (
          <div className="absolute inset-0 bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleAvatarDelete}
            >
              <TrashIcon className="w-6 h-6 text-muted-foreground" />
            </Button>
          </div>
        )}
      </label>
    </div>
  );
}
