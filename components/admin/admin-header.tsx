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
import { useAuthActions } from "@convex-dev/auth/react";
import { ModeToggle } from "../ui/mode-toggle";
import { LogOut, Plus, Settings } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { getInitialsFromName } from "@/lib/name-util";
import { useQuery } from "convex/react";
import favicon from "@/public/favicon.svg";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

interface AdminHeaderProps {
  onCreateEvent?: () => void;
}

export function AdminHeader({ onCreateEvent }: AdminHeaderProps) {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  const handleSettingsClick = () => {
    router.push("/admin/settings");
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center">
          <div className="flex items-center gap-1">
            <Link href="/admin">
              <Image
                src={favicon}
                alt="NC Event Staffing"
                width={48}
                height={48}
              />
            </Link>
            <h1 className="text-xl font-semibold">NC Event Staffing</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              {isAdmin ? "Admin" : "Event Manager"}
            </span>
          </div>
          <div className="flex justify-center">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>
                {isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/admin">Events</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                {isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/admin/schedule">Schedule</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
                {!isAdmin && (
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link href="/student">Sign Up For Events</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center justify-end gap-3">
            {onCreateEvent && (
              <Button onClick={onCreateEvent}>
                <Plus className="h-4 w-4" />
                Create New Event
              </Button>
            )}
            <div className="flex flex-row gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      {user.imageUrl ? (
                        <AvatarImage src={user.imageUrl} />
                      ) : (
                        <AvatarFallback>
                          {getInitialsFromName(user.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={handleSettingsClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
