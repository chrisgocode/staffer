import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

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

    // Fetch scheduled events for this token
    const events = await ctx.runQuery(
      internal.calendar.getScheduledEventsForToken,
      { token },
    );

    if (events.length === 0) {
      return new Response("No scheduled events found", { status: 200 });
    }

    // Generate ICS file content
    const icsContent = generateICS(events);

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
  events: Array<{
    signupId: string;
    eventTitle: string;
    eventDescription?: string;
    eventLocation: string;
    eventDate: string;
    eventStartTime: string;
    eventEndTime: string;
    timeslots: Array<{ startTime: string; endTime: string }>;
    eventUpdatedAt: number;
  }>,
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

  for (const event of events) {
    // For each timeslot, create a separate event
    for (const timeslot of event.timeslots) {
      // Combine event date with timeslot times to create full datetime strings
      const startDateTime = `${event.eventDate}T${timeslot.startTime}:00`;
      const endDateTime = `${event.eventDate}T${timeslot.endTime}:00`;

      // Format timestamps for ICS (YYYYMMDDTHHMMSS)
      const dtstart = formatICSDateTime(startDateTime);
      const dtend = formatICSDateTime(endDateTime);
      const dtstamp = formatICSDateTime(
        new Date(event.eventUpdatedAt).toISOString(),
      );

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${event.signupId}-${timeslot.startTime}@nc-events`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;TZID=America/New_York:${dtstart}`);
      lines.push(`DTEND;TZID=America/New_York:${dtend}`);
      lines.push(`SUMMARY:${escapeICSText(event.eventTitle)}`);
      lines.push(`LOCATION:${escapeICSText(event.eventLocation)}`);

      if (event.eventDescription) {
        lines.push(`DESCRIPTION:${escapeICSText(event.eventDescription)}`);
      }

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

// Escape special characters in ICS text fields
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export default http;
