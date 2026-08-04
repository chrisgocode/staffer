export type SemesterDates = {
	semester: string;
	startDate: string;
	endDate: string;
};

type PublishedSchedule = {
	semester: string;
	createdAt: number;
};

export function resolveStudentSemesters({
	semesters,
	publishedSchedules,
	today,
}: {
	semesters: SemesterDates[];
	publishedSchedules: PublishedSchedule[];
	today: string;
}) {
	const ordered = [...semesters].sort((a, b) =>
		a.startDate.localeCompare(b.startDate),
	);
	const currentIndex = ordered.findIndex(
		(semester) => semester.startDate <= today && today <= semester.endDate,
	);
	const current = ordered[currentIndex];
	const next = current
		? ordered[currentIndex + 1]
		: ordered.find((semester) => semester.startDate > today);
	const canPreviewNext =
		current &&
		next &&
		(current.semester.startsWith("Spring ") ||
			current.semester.startsWith("Summer ")) &&
		publishedSchedules.some((schedule) => schedule.semester === next.semester);

	const upcomingPublished =
		!current &&
		next &&
		publishedSchedules.some((schedule) => schedule.semester === next.semester);
	const previousPublished = [...ordered]
		.reverse()
		.find(
			(semester) =>
				semester.endDate < today &&
				publishedSchedules.some(
					(schedule) => schedule.semester === semester.semester,
				),
		);
	const latestPublished = [...publishedSchedules].sort(
		(a, b) => b.createdAt - a.createdAt,
	)[0];
	const defaultSemester =
		current?.semester ??
		(upcomingPublished
			? next.semester
			: (previousPublished?.semester ?? latestPublished?.semester));

	return {
		defaultSemester,
		allowedSemesters: current
			? [current.semester, ...(canPreviewNext ? [next.semester] : [])]
			: defaultSemester
				? [defaultSemester]
				: [],
	};
}
