"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((event) => event.date === dateStr);
  };

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-28 p-2" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDate(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    calendarDays.push(
      <div
        key={day}
        className={cn(
          "min-h-28 border border-border p-2 transition-colors hover:bg-muted/50",
          isToday && "bg-primary/5 border-primary/30",
        )}
      >
        <div
          className={cn("text-sm font-medium mb-1", isToday && "text-primary")}
        >
          {day}
        </div>
        <div className="space-y-1">
          {dayEvents.map((event) => {
            const filledSpots = event.spotsTotal - event.spotsAvailable;

            return (
              <button
                key={event._id}
                onClick={() => onEventClick(event)}
                className="w-full text-left text-xs bg-card hover:bg-muted border border-border px-2 py-1.5 rounded transition-colors"
              >
                <div className="font-medium truncate mb-1">{event.title}</div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>
                    {filledSpots}/{event.spotsTotal}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>,
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
    </Card>
  );
}
