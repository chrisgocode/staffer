"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import type { Event, EventSignup } from "@/lib/types";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const EVENTS_PER_PAGE = 5;

  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map((v) => Number.parseInt(v));
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter((event) => parseLocalDate(event.date) >= today)
    .sort(
      (a, b) =>
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
    );

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
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

  const totalPages = Math.ceil(upcomingEvents.length / EVENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const endIndex = startIndex + EVENTS_PER_PAGE;
  const paginatedEvents = upcomingEvents.slice(startIndex, endIndex);

  const navigateToPage = (value: string) => {
    const pageNum = Number.parseInt(value);

    if (isNaN(pageNum) || value.trim() === "") {
      toast.error("Please enter a valid number");
      setPageInput(currentPage.toString());
      return;
    }

    if (pageNum < 1 || pageNum > totalPages) {
      toast.error(`Please enter a number between 1 and ${totalPages}`);
      setPageInput(currentPage.toString());
      return;
    }

    setCurrentPage(pageNum);
    setPageInput(pageNum.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      navigateToPage(pageInput);
    }
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
          paginatedEvents.map((event) => {
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
                <div className="text-xs mt-2">
                  {event.spotsAvailable} spots available
                </div>
              </button>
            );
          })
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1);
                setPageInput("1");
              }}
              disabled={currentPage === 1}
              className="px-2"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                setPageInput(newPage.toString());
              }}
              disabled={currentPage === 1}
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => navigateToPage(pageInput)}
                onKeyDown={handleKeyDown}
                className="w-12 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                setPageInput(newPage.toString());
              }}
              disabled={currentPage === totalPages}
              className="px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(totalPages);
                setPageInput(totalPages.toString());
              }}
              disabled={currentPage === totalPages}
              className="px-2"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
