"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { Event, EventSignup } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface UpcomingEventsListProps {
  events: Event[];
  signups: EventSignup[];
  onEventClick: (event: Event) => void;
}

export function UpcomingEventsList({
  events,
  signups,
  onEventClick,
}: UpcomingEventsListProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter((event) => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSignupStatus = (eventId: Id<"events">) => {
    return signups.find((signup) => signup.eventId === eventId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        ) : (
          upcomingEvents.map((event) => {
            const signup = getSignupStatus(event._id);
            return (
              <button
                key={event._id}
                onClick={() => onEventClick(event)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm">{event.title}</h3>
                  {signup && (
                    <Badge
                      variant={
                        signup.status === "SCHEDULED"
                          ? "default"
                          : signup.status === "PENDING"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {signup.status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatTime(event.startTime)} -{" "}
                      {formatTime(event.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{event.location}</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "text-xs mt-2",
                    event.spotsAvailable > 0
                      ? "text-accent"
                      : "text-muted-foreground",
                  )}
                >
                  {event.spotsAvailable} spots available
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
