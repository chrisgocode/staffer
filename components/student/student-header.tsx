"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Calendar } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { getInitialsFromName } from "@/lib/name-util";
import favicon from "@/public/favicon.svg";

export function StudentHeader() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);

  if (!user || user == undefined) return null;

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Image src={favicon} alt="NC Event Staffing" width={48} height={48} />
          <h1 className="text-xl font-semibold">NC Event Staffing</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                />
                <AvatarFallback>
                  {getInitialsFromName(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
