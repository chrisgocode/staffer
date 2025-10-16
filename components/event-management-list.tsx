"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trash2,
  Edit,
  SlidersHorizontal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Event } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

interface EventManagementListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onDeleteEvent: (eventId: Id<"events">) => void;
  getPendingCount: (eventId: Id<"events">) => number;
}

export function EventManagementList({
  events,
  onEventClick,
  onDeleteEvent,
  getPendingCount,
}: EventManagementListProps) {
  const router = useRouter();
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [showNeedsStaff, setShowNeedsStaff] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events
    .filter((event) => {
      const eventDate = new Date(event.date);
      if (eventDate < today) return false;

      if (
        selectedMonths.length > 0 &&
        !selectedMonths.includes(eventDate.getMonth())
      ) {
        return false;
      }

      if (showNeedsStaff && event.spotsAvailable === 0) {
        return false;
      }

      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const availableMonths = Array.from(
    new Set(
      events
        .filter((event) => new Date(event.date) >= today)
        .map((event) => new Date(event.date).getMonth()),
    ),
  ).sort((a, b) => a - b);

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    );
  };

  const activeFilterCount = selectedMonths.length + (showNeedsStaff ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Event Management</CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 px-1.5 py-0 text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-3">Filter by Month</h4>
                  <div className="space-y-2">
                    {availableMonths.map((month) => (
                      <div key={month} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${month}`}
                          checked={selectedMonths.includes(month)}
                          onCheckedChange={() => toggleMonth(month)}
                        />
                        <Label
                          htmlFor={`month-${month}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {monthNames[month]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needs-staff"
                      checked={showNeedsStaff}
                      onCheckedChange={(checked) =>
                        setShowNeedsStaff(checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="needs-staff"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Needs Staff
                    </Label>
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedMonths([]);
                      setShowNeedsStaff(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activeFilterCount > 0
              ? "No events match your filters"
              : "No upcoming events"}
          </p>
        ) : (
          upcomingEvents.map((event) => {
            const pendingCount = getPendingCount(event._id);
            const filledSpots = event.spotsTotal - event.spotsAvailable;

            return (
              <div
                key={event._id}
                onClick={() => router.push(`/admin/event/${event._id}`)}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-base mb-1">
                      {event.title}
                    </h3>
                    {pendingCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {pendingCount} pending approval
                        {pendingCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/event/${event._id}?edit=1`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(event._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {formatTime(event.startTime)} -{" "}
                      {formatTime(event.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {filledSpots}/{event.spotsTotal} spots filled
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
