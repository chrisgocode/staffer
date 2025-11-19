"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

type CalendarEventSignup = {
  _id: Id<"signups">;
  eventId: Id<"events">;
  studentId: Id<"users">;
  studentName: string;
  studentImageUrl?: string;
  status: "PENDING" | "SCHEDULED";
  timeslots: Array<{ startTime: string; endTime: string }>;
};

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  isEnlarged?: boolean;
  onEnlargeToggle?: (enlarged: boolean) => void;
  eventSignups?: Record<Id<"events">, CalendarEventSignup[]>;
  initialView?: "month" | "week";
  onViewChange?: (view: "month" | "week") => void;
}

type ViewMode = "month" | "week";

export function CalendarView({
  events,
  onEventClick,
  isEnlarged = false,
  onEnlargeToggle,
  eventSignups = {},
  initialView = "month",
  onViewChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  // Sync with prop changes
  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format date as YYYY-MM-DD
  const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  // Helper to get Sunday of the week containing the given date
  const getSundayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is day 0
    return new Date(d.setDate(diff));
  };

  // Get all 7 days of the current week (Sun-Sat)
  const getWeekDays = () => {
    const sunday = getSundayOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

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

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date: Date | number) => {
    let dateStr: string;
    if (typeof date === "number") {
      // For monthly view
      dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    } else {
      // For weekly view
      dateStr = formatDateStr(date);
    }
    return events.filter((event) => event.date === dateStr);
  };

  const isToday = (date: Date | number) => {
    const today = new Date();
    if (typeof date === "number") {
      return (
        date === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      );
    } else {
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }
  };

  // Monthly view rendering
  const renderMonthView = () => {
    const calendarDays = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="min-h-28 p-2" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const today = isToday(day);

      calendarDays.push(
        <div
          key={day}
          className={cn(
            "min-h-28 border border-border p-2 transition-colors hover:bg-muted/50",
            today && "bg-primary/5 border-primary/30",
          )}
        >
          <div
            className={cn("text-sm font-medium mb-1", today && "text-primary")}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.map((event) => {
              const filledSpots = event.spotsTotal - event.spotsAvailable;
              const signups = eventSignups[event._id] ?? [];
              const studentNames = signups
                .filter((s) => s.status === "SCHEDULED")
                .map((s) => s.studentName.split(" ")[0])
                .join(", ");

              return (
                <button
                  key={event._id}
                  onClick={() => onEventClick(event)}
                  className="w-full text-left text-xs bg-card hover:bg-muted border border-border px-2 py-1.5 rounded transition-colors"
                >
                  {isEnlarged ? (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-medium truncate min-w-0 flex-1">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <Users className="h-3 w-3" />
                          <span className="text-[10px]">
                            {filledSpots}/{event.spotsTotal}
                          </span>
                        </div>
                      </div>
                      <div className="text-muted-foreground text-[10px] mb-1 truncate">
                        {event.location}
                      </div>
                      {studentNames && (
                        <div className="text-muted-foreground text-[10px] truncate">
                          {studentNames}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate min-w-0 flex-1">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <Users className="h-3 w-3" />
                        <span>
                          {filledSpots}/{event.spotsTotal}
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
        {dayNames.map((day) => (
          <div
            key={day}
            className="bg-muted p-2 text-center text-sm font-medium border-b border-border"
          >
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    );
  };

  // Weekly view rendering
  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <>
        <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
          {dayNames.map((day) => (
            <div
              key={day}
              className="bg-muted p-2 text-center text-sm font-medium border-b border-border"
            >
              {day}
            </div>
          ))}
          {dayNames.map((day, index) => {
            const date = weekDays[index];
            const dayEvents = getEventsForDate(date);
            const today = isToday(date);

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[600px] border-r border-border last:border-r-0 p-2 transition-colors hover:bg-muted/50",
                  today && "bg-primary/5 border-primary/30",
                )}
              >
                <div className="mb-2">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      today && "text-primary",
                    )}
                  >
                    {date.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayEvents.map((event) => {
                    const filledSpots = event.spotsTotal - event.spotsAvailable;
                    const signups = eventSignups[event._id] ?? [];
                    const studentNames = signups
                      .filter((s) => s.status === "SCHEDULED")
                      .map((s) => s.studentName.split(" ")[0])
                      .join(", ");

                    return (
                      <button
                        key={event._id}
                        onClick={() => onEventClick(event)}
                        className="w-full text-left text-xs bg-card hover:bg-muted border border-border px-2 py-1.5 rounded transition-colors"
                      >
                        {isEnlarged ? (
                          <>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="font-medium truncate min-w-0 flex-1">
                                {event.title}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                                <Users className="h-3 w-3" />
                                <span className="text-xs">
                                  {filledSpots}/{event.spotsTotal}
                                </span>
                              </div>
                            </div>
                            <div className="text-muted-foreground text-xs mb-1 truncate">
                              {event.location}
                            </div>
                            {studentNames && (
                              <div className="text-muted-foreground text-xs truncate">
                                {studentNames}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium truncate min-w-0 flex-1">
                                {event.title}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                                <Users className="h-3 w-3" />
                                <span>
                                  {filledSpots}/{event.spotsTotal}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return `${monthNames[month]} ${year}`;
    } else {
      const weekDays = getWeekDays();
      const sunday = weekDays[0];
      const saturday = weekDays[6];
      if (sunday.getMonth() === saturday.getMonth()) {
        return `${monthNames[sunday.getMonth()]} ${sunday.getDate()}-${saturday.getDate()}, ${sunday.getFullYear()}`;
      } else {
        return `${monthNames[sunday.getMonth()]} ${sunday.getDate()} - ${monthNames[saturday.getMonth()]} ${saturday.getDate()}, ${saturday.getFullYear()}`;
      }
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{getHeaderTitle()}</h2>
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              const newView = v as ViewMode;
              setViewMode(newView);
              onViewChange?.(newView);
            }}
          >
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            {onEnlargeToggle && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEnlargeToggle(!isEnlarged)}
                aria-label={
                  isEnlarged ? "Minimize calendar" : "Enlarge calendar"
                }
              >
                {isEnlarged ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={viewMode === "month" ? previousMonth : previousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={viewMode === "month" ? nextMonth : nextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {viewMode === "month" ? renderMonthView() : renderWeekView()}
    </Card>
  );
}
