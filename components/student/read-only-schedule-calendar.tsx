"use client";

import { useQuery } from "convex/react";
import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ShiftDetailsDialog } from "@/components/admin/schedule/ShiftDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
	dateInNewYork,
	initialScheduleDate,
	shiftsForDate,
} from "@/lib/read-only-schedule";
import { getStaffColor } from "@/lib/schedule-colors";
import { daysOfWeek, getShiftPosition, timeSlots } from "@/lib/schedule-utils";
import { calculateShiftLayout } from "@/lib/shift-layout-utils";
import type { Shift } from "@/lib/types";

type ReadOnlyShift = {
	_id: Id<"staffShifts">;
	userId: Id<"users">;
	userName: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
	isCurrentUser: boolean;
	color: string;
};

function toISODate(date: Date) {
	return format(date, "yyyy-MM-dd");
}

function weekDates(date: string) {
	const monday = startOfWeek(parseISO(date), { weekStartsOn: 1 });
	return Array.from({ length: 5 }, (_, index) => addDays(monday, index));
}

function moveWeekday(date: string, direction: -1 | 1) {
	let next = addDays(parseISO(date), direction);
	while (next.getDay() === 0 || next.getDay() === 6) {
		next = addDays(next, direction);
	}
	return toISODate(next);
}

function isWithinSemester(
	date: string,
	semester?: { startDate?: string; endDate?: string },
) {
	return (
		!semester?.startDate ||
		!semester.endDate ||
		(semester.startDate <= date && date <= semester.endDate)
	);
}

export function ReadOnlyScheduleCalendar() {
	const [semester, setSemester] = useState<string>();
	const [focusDate, setFocusDate] = useState(dateInNewYork());
	const [mobileView, setMobileView] = useState<"day" | "week">("day");
	const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
	const data = useQuery(api.schedule.schedule.getStudentSchedule, {
		...(semester ? { semester } : {}),
	});

	useEffect(() => {
		if (!data?.selectedSemester) return;
		if (
			!semester ||
			!data.visibleSemesters.some((item) => item.semester === semester)
		) {
			setSemester(data.selectedSemester);
		}
	}, [data, semester]);

	const selectedSemester = data?.visibleSemesters.find(
		(item) => item.semester === data.selectedSemester,
	);

	useEffect(() => {
		if (!data?.selectedSemester) return;
		setFocusDate(
			initialScheduleDate(
				dateInNewYork(),
				selectedSemester?.startDate && selectedSemester.endDate
					? {
							startDate: selectedSemester.startDate,
							endDate: selectedSemester.endDate,
						}
					: undefined,
			),
		);
	}, [
		data?.selectedSemester,
		selectedSemester?.startDate,
		selectedSemester?.endDate,
	]);

	const shifts = useMemo<ReadOnlyShift[]>(() => {
		const rawShifts = data?.schedule?.shifts ?? [];
		const staffIds = [...new Set(rawShifts.map((shift) => shift.userId))];
		return rawShifts.map((shift) => ({
			...shift,
			color: getStaffColor(staffIds.indexOf(shift.userId)),
		}));
	}, [data?.schedule?.shifts]);

	if (data === undefined) {
		return (
			<div className="flex min-h-96 items-center justify-center">
				<Spinner />
			</div>
		);
	}

	const semesterRange =
		selectedSemester?.startDate && selectedSemester.endDate
			? {
					startDate: selectedSemester.startDate,
					endDate: selectedSemester.endDate,
				}
			: undefined;
	const dates = weekDates(focusDate);
	const previousWeek = toISODate(addWeeks(dates[0], -1));
	const nextWeek = toISODate(addWeeks(dates[0], 1));
	const canMoveWeekBack =
		!semesterRange ||
		toISODate(addDays(parseISO(previousWeek), 4)) >= semesterRange.startDate;
	const canMoveWeekForward =
		!semesterRange || nextWeek <= semesterRange.endDate;
	const previousDay = moveWeekday(focusDate, -1);
	const nextDay = moveWeekday(focusDate, 1);

	const openShift = (shift: ReadOnlyShift) => {
		setSelectedShift({ ...shift, zIndex: 1 });
	};

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden">
				<div className="space-y-5 p-4 sm:p-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<div>
								<h1 className="text-2xl font-semibold">Schedule</h1>
								<p className="text-sm text-muted-foreground">
									Published weekly staffing coverage
								</p>
							</div>
							{data.selectedSemester && (
								<Select
									value={data.selectedSemester}
									onValueChange={setSemester}
								>
									<SelectTrigger className="w-full sm:w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{data.visibleSemesters.map((item) => (
											<SelectItem key={item.semester} value={item.semester}>
												{item.semester}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>

						<div className="hidden items-center gap-2 md:flex">
							<Button
								variant="outline"
								size="icon"
								aria-label="Previous week"
								disabled={!canMoveWeekBack}
								onClick={() => setFocusDate(previousWeek)}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<div className="min-w-40 text-center text-sm font-medium">
								{format(dates[0], "MMM d")}–{format(dates[4], "MMM d, yyyy")}
							</div>
							<Button
								variant="outline"
								onClick={() =>
									setFocusDate(
										initialScheduleDate(dateInNewYork(), semesterRange),
									)
								}
							>
								Today
							</Button>
							<Button
								variant="outline"
								size="icon"
								aria-label="Next week"
								disabled={!canMoveWeekForward}
								onClick={() => setFocusDate(nextWeek)}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div className="flex items-center justify-between gap-3 md:hidden">
						<div className="flex rounded-md border p-1">
							<Button
								size="sm"
								variant={mobileView === "day" ? "default" : "ghost"}
								onClick={() => {
									setFocusDate(initialScheduleDate(focusDate, semesterRange));
									setMobileView("day");
								}}
							>
								Day
							</Button>
							<Button
								size="sm"
								variant={mobileView === "week" ? "default" : "ghost"}
								onClick={() => setMobileView("week")}
							>
								Week
							</Button>
						</div>
						{mobileView === "day" ? (
							<DateNavigation
								label={format(parseISO(focusDate), "EEE, MMM d")}
								canGoBack={isWithinSemester(previousDay, selectedSemester)}
								canGoForward={isWithinSemester(nextDay, selectedSemester)}
								onBack={() => setFocusDate(previousDay)}
								onForward={() => setFocusDate(nextDay)}
							/>
						) : (
							<DateNavigation
								label={`${format(dates[0], "MMM d")}–${format(dates[4], "MMM d")}`}
								canGoBack={canMoveWeekBack}
								canGoForward={canMoveWeekForward}
								onBack={() => setFocusDate(previousWeek)}
								onForward={() => setFocusDate(nextWeek)}
							/>
						)}
					</div>

					<div
						className="hidden overflow-x-auto md:block"
						role="region"
						aria-label="Weekly staff schedule"
						tabIndex={0}
					>
						<WeekGrid
							dates={dates}
							semester={semesterRange}
							shifts={shifts}
							holidays={data.holidays}
							onShiftClick={openShift}
						/>
					</div>
					<div className="md:hidden">
						{mobileView === "day" ? (
							<DayGrid
								date={parseISO(focusDate)}
								semester={semesterRange}
								shifts={shifts}
								holidays={data.holidays}
								onShiftClick={openShift}
							/>
						) : (
							<div
								className="overflow-x-auto"
								role="region"
								aria-label="Weekly staff schedule"
								tabIndex={0}
							>
								<WeekGrid
									dates={dates}
									semester={semesterRange}
									shifts={shifts}
									holidays={data.holidays}
									onShiftClick={openShift}
								/>
							</div>
						)}
					</div>
				</div>
			</Card>

			<ShiftDetailsDialog
				shift={selectedShift}
				isOpen={selectedShift !== null}
				onClose={() => setSelectedShift(null)}
			/>
		</div>
	);
}

function DateNavigation({
	label,
	canGoBack,
	canGoForward,
	onBack,
	onForward,
}: {
	label: string;
	canGoBack: boolean;
	canGoForward: boolean;
	onBack: () => void;
	onForward: () => void;
}) {
	return (
		<div className="flex items-center gap-1">
			<Button
				variant="ghost"
				size="icon"
				aria-label="Previous"
				disabled={!canGoBack}
				onClick={onBack}
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<span className="min-w-24 text-center text-sm font-medium">{label}</span>
			<Button
				variant="ghost"
				size="icon"
				aria-label="Next"
				disabled={!canGoForward}
				onClick={onForward}
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}

function WeekGrid({
	dates,
	semester,
	shifts,
	holidays,
	onShiftClick,
}: {
	dates: Date[];
	semester?: { startDate: string; endDate: string };
	shifts: ReadOnlyShift[];
	holidays: Array<{ date: string; name: string; isSubstitution: boolean }>;
	onShiftClick: (shift: ReadOnlyShift) => void;
}) {
	return (
		<div className="min-w-[900px] overflow-hidden rounded-lg border">
			<div className="grid grid-cols-[80px_repeat(5,1fr)] border-b bg-muted/50">
				<div className="p-3 text-xs font-medium text-muted-foreground">
					Time
				</div>
				{dates.map((date, index) => {
					const isoDate = toISODate(date);
					const holiday = holidays.find((item) => item.date === isoDate);
					return (
						<div key={isoDate} className="border-l p-3 text-center">
							<div className="text-sm font-semibold">{daysOfWeek[index]}</div>
							<div className="text-xs text-muted-foreground">
								{format(date, "MMM d")}
							</div>
							{holiday && (
								<div className="truncate text-xs text-primary">
									{holiday.name}
								</div>
							)}
						</div>
					);
				})}
			</div>
			<div className="grid grid-cols-[80px_repeat(5,1fr)]">
				<TimeLabels />
				{dates.map((date) => (
					<ScheduleDay
						key={toISODate(date)}
						date={date}
						semester={semester}
						shifts={shifts}
						holidays={holidays}
						onShiftClick={onShiftClick}
					/>
				))}
			</div>
		</div>
	);
}

function DayGrid(
	props: Omit<React.ComponentProps<typeof ScheduleDay>, "showHeader">,
) {
	const isoDate = toISODate(props.date);
	const holiday = props.holidays.find((item) => item.date === isoDate);
	return (
		<div className="overflow-hidden rounded-lg border">
			<div className="border-b bg-muted/50 p-3 text-center">
				<div className="font-semibold">
					{format(props.date, "EEEE, MMMM d")}
				</div>
				{holiday && <div className="text-sm text-primary">{holiday.name}</div>}
			</div>
			<div className="grid grid-cols-[72px_1fr]">
				<TimeLabels />
				<ScheduleDay {...props} />
			</div>
		</div>
	);
}

function TimeLabels() {
	return (
		<div className="border-r">
			{timeSlots.map((time) => (
				<div
					key={time}
					className="h-16 border-b px-2 py-2 text-xs text-muted-foreground last:border-b-0"
				>
					{time}
				</div>
			))}
		</div>
	);
}

function ScheduleDay({
	date,
	semester,
	shifts,
	holidays,
	onShiftClick,
}: {
	date: Date;
	semester?: { startDate: string; endDate: string };
	shifts: ReadOnlyShift[];
	holidays: Array<{ date: string; name: string; isSubstitution: boolean }>;
	onShiftClick: (shift: ReadOnlyShift) => void;
	showHeader?: boolean;
}) {
	const isoDate = toISODate(date);
	const dayShifts = shiftsForDate({
		date: isoDate,
		semester,
		shifts,
		holidays,
	});
	const dayOfWeek = date.getDay() - 1;
	const displayShifts = dayShifts.map((shift) => ({ ...shift, dayOfWeek }));
	const layouts = calculateShiftLayout(displayShifts, dayOfWeek);
	const outsideSemester = semester && !isWithinSemester(isoDate, semester);

	return (
		<div
			className={`relative border-l ${outsideSemester ? "bg-muted/40" : ""}`}
		>
			{timeSlots.map((time, index) => (
				<div
					key={time}
					className={`h-16 border-b last:border-b-0 ${index % 2 === 0 ? "bg-muted/10" : ""}`}
				/>
			))}
			<div className="pointer-events-none absolute inset-0">
				{displayShifts.map((shift) => {
					const position = getShiftPosition(shift.startTime, shift.endTime);
					const layout = layouts.get(shift._id);
					return (
						<button
							key={shift._id}
							type="button"
							className={`pointer-events-auto absolute rounded-md border-l-2 p-2 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${shift.color} ${shift.isCurrentUser ? "ring-2 ring-primary" : ""}`}
							style={{
								top: position.top,
								height: position.height,
								left: layout?.left ?? "4px",
								width: layout?.width ?? "calc(100% - 8px)",
							}}
							onClick={() => onShiftClick(shift)}
							aria-label={`${shift.userName}, ${shift.startTime} to ${shift.endTime}`}
						>
							<div className="flex min-w-0 items-center gap-1">
								<span className="truncate text-xs font-semibold">
									{shift.userName}
								</span>
								{shift.isCurrentUser && (
									<Badge className="px-1 py-0 text-[10px]">You</Badge>
								)}
							</div>
							<div className="truncate text-xs opacity-75">
								{shift.startTime}–{shift.endTime}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
