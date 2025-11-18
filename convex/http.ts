import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Upload holidays endpoint
http.route({
  path: "/calendar/uploadHolidays",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { holidays } = body;

    if (!Array.isArray(holidays)) {
      return new Response("Invalid request: holidays must be an array", {
        status: 400,
      });
    }

    await ctx.runMutation(internal.calendar.storeHolidays, { holidays });

    return new Response(
      JSON.stringify({ success: true, count: holidays.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

// Calendar ICS feed endpoint - matches any path starting with /calendar/
http.route({
  pathPrefix: "/calendar/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract token from URL path
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/\/calendar\/([^/.]+)\.ics$/);

    if (!pathMatch || !pathMatch[1]) {
      return new Response("Invalid calendar URL", { status: 404 });
    }

    const token = pathMatch[1];

    // Fetch scheduled events and shifts for this token
    const items = await ctx.runQuery(
      internal.calendar.getScheduledEventsForToken,
      { token },
    );

    // Fetch Monday holidays for the next 6 months
    const now = new Date();
    const sixMonthsLater = new Date(now);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const mondayHolidays = await ctx.runQuery(
      internal.calendar.getMondayHolidays,
      {
        startDate: now.toISOString().split("T")[0],
        endDate: sixMonthsLater.toISOString().split("T")[0],
      },
    );

    // Generate ICS file content
    const icsContent = generateICS(items, mondayHolidays);

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }),
});

// Helper function to generate ICS content
function generateICS(
  items: Array<
    | {
        type: "event";
        signupId: string;
        eventTitle: string;
        eventDescription?: string;
        eventLocation: string;
        eventDate: string;
        eventStartTime: string;
        eventEndTime: string;
        timeslots: Array<{ startTime: string; endTime: string }>;
        eventUpdatedAt: number;
      }
    | {
        type: "shift";
        shiftId: string;
        scheduleId: string;
        semester: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        scheduleCreatedAt: number;
      }
  >,
  mondayHolidays: Array<{ date: string; name: string }>,
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NC Events//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:NC Event Shifts",
    "X-WR-TIMEZONE:America/New_York",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "BEGIN:VTIMEZONE",
    "TZID:America/New_York",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  const mondayShifts: Array<{
    shiftId: string;
    scheduleId: string;
    semester: string;
    startTime: string;
    endTime: string;
    scheduleCreatedAt: number;
  }> = [];

  for (const item of items) {
    if (item.type === "event") {
      // Handle one-time event signups
      for (const timeslot of item.timeslots) {
        const startDateTime = `${item.eventDate}T${timeslot.startTime}:00`;
        const endDateTime = `${item.eventDate}T${timeslot.endTime}:00`;

        const dtstart = formatICSDateTime(startDateTime);
        const dtend = formatICSDateTime(endDateTime);
        const dtstamp = formatICSDateTime(
          new Date(item.eventUpdatedAt).toISOString(),
        );

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${item.signupId}-${timeslot.startTime}@nc-events`);
        lines.push(`DTSTAMP:${dtstamp}`);
        lines.push(`DTSTART;TZID=America/New_York:${dtstart}`);
        lines.push(`DTEND;TZID=America/New_York:${dtend}`);
        lines.push(`SUMMARY:${escapeICSText(item.eventTitle)}`);
        lines.push(`LOCATION:${escapeICSText(item.eventLocation)}`);

        if (item.eventDescription) {
          lines.push(`DESCRIPTION:${escapeICSText(item.eventDescription)}`);
        }

        lines.push("STATUS:CONFIRMED");
        lines.push("END:VEVENT");
      }
    } else if (item.type === "shift") {
      // Handle recurring weekly shifts
      const dayNames = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
      const icsDay = dayNames[item.dayOfWeek];

      // Calculate first occurrence date
      const scheduleStartDate = new Date(item.scheduleCreatedAt);
      const currentDay = scheduleStartDate.getDay();
      // Convert JavaScript day (0=Sunday) to our dayOfWeek (0=Monday)
      const jsDayToOurDay = (jsDay: number) => (jsDay + 6) % 7;
      const currentDayOur = jsDayToOurDay(currentDay);
      let daysToAdd = (item.dayOfWeek - currentDayOur + 7) % 7;
      if (daysToAdd === 0) {
        // Check if we've passed the time today
        const [hours, minutes] = item.startTime.split(":").map(Number);
        const shiftTime = hours * 60 + minutes;
        const nowTime =
          scheduleStartDate.getHours() * 60 + scheduleStartDate.getMinutes();
        if (nowTime > shiftTime) {
          daysToAdd = 7;
        }
      }

      const firstOccurrence = new Date(scheduleStartDate);
      firstOccurrence.setDate(firstOccurrence.getDate() + daysToAdd);

      // Format first occurrence date
      const year = firstOccurrence.getFullYear();
      const month = String(firstOccurrence.getMonth() + 1).padStart(2, "0");
      const day = String(firstOccurrence.getDate()).padStart(2, "0");
      const [startHours, startMinutes] = item.startTime.split(":").map(Number);
      const [endHours, endMinutes] = item.endTime.split(":").map(Number);

      // Create proper ISO date strings for formatICSDateTime
      const startDateTime = `${year}-${month}-${day}T${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}:00`;
      const endDateTime = `${year}-${month}-${day}T${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:00`;

      const dtstart = formatICSDateTime(startDateTime);
      const dtend = formatICSDateTime(endDateTime);
      const dtstamp = formatICSDateTime(new Date().toISOString());

      // Calculate end date (16 weeks from start, or end of semester)
      const endDate = new Date(firstOccurrence);
      endDate.setDate(endDate.getDate() + 16 * 7);
      const endDateStr = formatICSDate(endDate);

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${item.shiftId}@nc-events-shift`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;TZID=America/New_York:${dtstart}`);
      lines.push(`DTEND;TZID=America/New_York:${dtend}`);

      // Add EXDATE for Monday holidays if this is a Monday shift
      if (item.dayOfWeek === 0 && mondayHolidays.length > 0) {
        const exdates = mondayHolidays
          .map((holiday) => {
            const [hours, minutes] = item.startTime.split(":").map(Number);
            return formatICSDateTime(
              `${holiday.date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
            );
          })
          .join(",");
        lines.push(`EXDATE;TZID=America/New_York:${exdates}`);
      }

      lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${icsDay};UNTIL=${endDateStr}`);
      lines.push(`SUMMARY:${escapeICSText(`Staff Shift - ${item.semester}`)}`);
      lines.push(
        `DESCRIPTION:${escapeICSText(`Weekly staff shift for ${item.semester}`)}`,
      );
      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");

      // Store Monday shifts for creating Tuesday replacement events
      if (item.dayOfWeek === 0) {
        mondayShifts.push({
          shiftId: item.shiftId,
          scheduleId: item.scheduleId,
          semester: item.semester,
          startTime: item.startTime,
          endTime: item.endTime,
          scheduleCreatedAt: item.scheduleCreatedAt,
        });
      }
    }
  }

  // Create one-time Tuesday events for each Monday holiday
  for (const holiday of mondayHolidays) {
    const holidayDate = new Date(holiday.date);
    const tuesdayDate = new Date(holidayDate);
    tuesdayDate.setDate(tuesdayDate.getDate() + 1); // Next day (Tuesday)

    for (const shift of mondayShifts) {
      const [hours, minutes] = shift.startTime.split(":").map(Number);
      const [endHours, endMinutes] = shift.endTime.split(":").map(Number);

      // Create proper ISO date strings for formatICSDateTime
      const year = tuesdayDate.getFullYear();
      const month = String(tuesdayDate.getMonth() + 1).padStart(2, "0");
      const day = String(tuesdayDate.getDate()).padStart(2, "0");
      const startDateTime = `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
      const endDateTime = `${year}-${month}-${day}T${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:00`;

      const dtstart = formatICSDateTime(startDateTime);
      const dtend = formatICSDateTime(endDateTime);
      const dtstamp = formatICSDateTime(new Date().toISOString());

      lines.push("BEGIN:VEVENT");
      lines.push(
        `UID:${shift.shiftId}-${holiday.date}@nc-events-shift-tuesday`,
      );
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;TZID=America/New_York:${dtstart}`);
      lines.push(`DTEND;TZID=America/New_York:${dtend}`);
      lines.push(
        `SUMMARY:${escapeICSText(`Staff Shift - ${shift.semester} (Monday Schedule)`)}`,
      );
      lines.push(
        `DESCRIPTION:${escapeICSText(`Monday schedule moved to Tuesday due to ${holiday.name}`)}`,
      );
      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

// Format datetime string to ICS format (YYYYMMDDTHHMMSS) in local time
function formatICSDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// Format date as YYYYMMDD
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Escape special characters in ICS text fields
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export default http;
