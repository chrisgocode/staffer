"use client";

import {
	ChevronLeft,
	ChevronRight,
	Maximize2,
	Minimize2,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Id } from "@/convex/_generated/dataModel";
import {
	eventsForDate,
	eventWeekDates,
	formatCalendarDate,
	moveEventDay,
} from "@/lib/event-calendar";
import type { Event } from "@/lib/types";
import { cn } from "@/lib/utils";

type CalendarEventSignup = {
	_id: Id<"signups">;
	eventId: Id<"events">;
	studentId: Id<"users">;
	studentName: string;
	studentImageUrl?: string;
	status: "PENDING" | "SCHEDULED";
	timeslots: Array<{ startTime: string; endTime: string }>;
};

interface EventCalendarProps {
	events: Event[];
	onEventClick: (event: Event) => void;
	getPendingCount?: (eventId: Id<"events">) => number;
	isEnlarged?: boolean;
	onEnlargeToggle?: (enlarged: boolean) => void;
	eventSignups?: Record<Id<"events">, CalendarEventSignup[]>;
	initialView?: "month" | "week";
	onViewChange?: (view: "month" | "week") => void;
}

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

export function EventCalendar({
	events,
	onEventClick,
	getPendingCount,
	isEnlarged = false,
	onEnlargeToggle,
	eventSignups = {},
	initialView = "month",
	onViewChange,
}: EventCalendarProps) {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [desktopView, setDesktopView] = useState<"month" | "week">(initialView);
	const [mobileView, setMobileView] = useState<"day" | "week">("day");

	useEffect(() => setDesktopView(initialView), [initialView]);

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();
	const weekDays = eventWeekDates(currentDate);

	const moveMonth = (amount: number) =>
		setCurrentDate(new Date(year, month + amount, 1));
	const moveWeek = (amount: number) =>
		setCurrentDate(moveEventDay(currentDate, amount * 7));

	const isToday = (date: Date) =>
		formatCalendarDate(date) === formatCalendarDate(new Date());

	const renderEvent = (event: Event, detailed = false) => (
		<EventCard
			key={event._id}
			event={event}
			detailed={detailed}
			signups={eventSignups[event._id] ?? []}
			pendingCount={getPendingCount?.(event._id) ?? 0}
			onClick={() => onEventClick(event)}
		/>
	);

	const renderMonthView = () => {
		const firstDay = new Date(year, month, 1);
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const cells = Array.from({ length: firstDay.getDay() }, (_, index) => (
			<div key={`empty-${index}`} className="min-h-28 p-2" />
		));

		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month, day);
			cells.push(
				<div
					key={day}
					className={cn(
						"min-h-28 border p-2 transition-colors hover:bg-muted/50",
						isToday(date) && "border-primary/30 bg-primary/5",
					)}
				>
					<div
						className={cn(
							"mb-1 text-sm font-medium",
							isToday(date) && "text-primary",
						)}
					>
						{day}
					</div>
					<div className="space-y-1">
						{eventsForDate(events, date).map((event) =>
							renderEvent(event, isEnlarged),
						)}
					</div>
				</div>,
			);
		}

		return (
			<div className="grid grid-cols-7 overflow-hidden rounded-lg border">
				{dayNames.map((day) => (
					<div
						key={day}
						className="border-b bg-muted p-2 text-center text-sm font-medium"
					>
						{day}
					</div>
				))}
				{cells}
			</div>
		);
	};

	const renderWeekView = () => (
		<div className="min-w-[840px]">
			<div className="grid grid-cols-7 overflow-hidden rounded-lg border">
				{weekDays.map((date) => (
					<div
						key={`header-${formatCalendarDate(date)}`}
						className="border-b bg-muted p-2 text-center"
					>
						<div className="text-sm font-medium">{dayNames[date.getDay()]}</div>
						<div className="text-xs text-muted-foreground">
							{monthNames[date.getMonth()].slice(0, 3)} {date.getDate()}
						</div>
					</div>
				))}
				{weekDays.map((date) => (
					<div
						key={`day-${formatCalendarDate(date)}`}
						className={cn(
							"min-h-[600px] border-r p-2 transition-colors last:border-r-0 hover:bg-muted/50",
							isToday(date) && "border-primary/30 bg-primary/5",
						)}
					>
						<div className="space-y-1">
							{eventsForDate(events, date).map((event) =>
								renderEvent(event, isEnlarged),
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);

	const renderDayView = () => {
		const dayEvents = eventsForDate(events, currentDate);
		return (
			<div className="min-h-80 rounded-lg border p-3">
				<div className="space-y-2">
					{dayEvents.map((event) => renderEvent(event, true))}
					{dayEvents.length === 0 && (
						<p className="py-12 text-center text-sm text-muted-foreground">
							No events scheduled
						</p>
					)}
				</div>
			</div>
		);
	};

	const weekTitle = () => {
		const sunday = weekDays[0];
		const saturday = weekDays[6];
		return sunday.getMonth() === saturday.getMonth()
			? `${monthNames[sunday.getMonth()]} ${sunday.getDate()}–${saturday.getDate()}, ${sunday.getFullYear()}`
			: `${monthNames[sunday.getMonth()]} ${sunday.getDate()} – ${monthNames[saturday.getMonth()]} ${saturday.getDate()}, ${saturday.getFullYear()}`;
	};
	const desktopTitle =
		desktopView === "month" ? `${monthNames[month]} ${year}` : weekTitle();
	const mobileTitle =
		mobileView === "day"
			? currentDate.toLocaleDateString("en-US", {
					weekday: "long",
					month: "long",
					day: "numeric",
				})
			: weekTitle();

	return (
		<Card className="p-3 sm:p-4">
			<div className="hidden md:block">
				<div className="mb-4 flex items-center justify-between gap-3">
					<h2 className="text-xl font-semibold">{desktopTitle}</h2>
					<div className="flex items-center gap-2">
						<Tabs
							value={desktopView}
							onValueChange={(value) => {
								const view = value as "month" | "week";
								setDesktopView(view);
								onViewChange?.(view);
							}}
						>
							<TabsList>
								<TabsTrigger value="month">Month</TabsTrigger>
								<TabsTrigger value="week">Week</TabsTrigger>
							</TabsList>
						</Tabs>
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
						<CalendarNavigation
							onPrevious={() =>
								desktopView === "month" ? moveMonth(-1) : moveWeek(-1)
							}
							onNext={() =>
								desktopView === "month" ? moveMonth(1) : moveWeek(1)
							}
							period={desktopView}
						/>
					</div>
				</div>
				{desktopView === "month" ? (
					renderMonthView()
				) : (
					<div
						className="overflow-x-auto"
						role="region"
						aria-label="Weekly events calendar"
						tabIndex={0}
					>
						{renderWeekView()}
					</div>
				)}
			</div>

			<div className="md:hidden">
				<div className="mb-4 space-y-3">
					<div className="flex items-center justify-between gap-2">
						<Tabs
							value={mobileView}
							onValueChange={(value) => setMobileView(value as "day" | "week")}
						>
							<TabsList>
								<TabsTrigger value="day">Day</TabsTrigger>
								<TabsTrigger value="week">Week</TabsTrigger>
							</TabsList>
						</Tabs>
						<CalendarNavigation
							onPrevious={() =>
								setCurrentDate(
									moveEventDay(currentDate, mobileView === "day" ? -1 : -7),
								)
							}
							onNext={() =>
								setCurrentDate(
									moveEventDay(currentDate, mobileView === "day" ? 1 : 7),
								)
							}
							period={mobileView}
						/>
					</div>
					<h2 className="text-lg font-semibold">{mobileTitle}</h2>
				</div>
				{mobileView === "day" ? (
					renderDayView()
				) : (
					<div
						className="overflow-x-auto"
						role="region"
						aria-label="Weekly events calendar"
						tabIndex={0}
					>
						{renderWeekView()}
					</div>
				)}
			</div>
		</Card>
	);
}

function CalendarNavigation({
	onPrevious,
	onNext,
	period,
}: {
	onPrevious: () => void;
	onNext: () => void;
	period: "day" | "week" | "month";
}) {
	return (
		<div className="flex gap-2">
			<Button
				variant="outline"
				size="icon"
				onClick={onPrevious}
				aria-label={`Previous ${period}`}
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<Button
				variant="outline"
				size="icon"
				onClick={onNext}
				aria-label={`Next ${period}`}
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}

function EventCard({
	event,
	detailed,
	signups,
	pendingCount,
	onClick,
}: {
	event: Event;
	detailed: boolean;
	signups: CalendarEventSignup[];
	pendingCount: number;
	onClick: () => void;
}) {
	const filledSpots = event.spotsTotal - event.spotsAvailable;
	const studentNames = signups
		.filter((signup) => signup.status === "SCHEDULED")
		.map((signup) => signup.studentName.split(" ")[0])
		.join(", ");

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded border bg-card px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label={`${event.title}, ${event.startTime} to ${event.endTime}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0 flex-1 truncate font-medium">{event.title}</div>
				<div className="flex shrink-0 items-center gap-1 text-muted-foreground">
					<Users className="h-3 w-3" />
					<span>
						{filledSpots}/{event.spotsTotal}
					</span>
					{pendingCount > 0 && (
						<Badge
							variant="secondary"
							className="bg-yellow-500 px-1 py-0 text-xs"
						>
							{pendingCount}
						</Badge>
					)}
				</div>
			</div>
			{detailed && (
				<>
					<div className="mt-1 truncate text-muted-foreground">
						{event.startTime}–{event.endTime} · {event.location}
					</div>
					{studentNames && (
						<div className="truncate text-muted-foreground">{studentNames}</div>
					)}
				</>
			)}
		</button>
	);
}
