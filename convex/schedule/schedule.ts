import { ConvexError, v } from "convex/values";
import { dateInNewYork } from "../../lib/read-only-schedule";
import { resolveStudentSemesters } from "../../lib/semester-schedule";
import { internalMutation, mutation, query } from "../_generated/server";
import {
	getActiveIdentity,
	getUserAccess,
	requireAdmin,
} from "../permissions";
import { doesShiftConflict, getAllBlockedRanges } from "./conflictUtils";

export const storeClassSchedule = internalMutation({
	args: {
		userId: v.id("users"),
		classSchedule: v.array(
			v.object({
				days: v.string(),
				startTime: v.string(),
				endTime: v.string(),
				dates: v.string(),
			}),
		),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.userId, {
			classSchedule: args.classSchedule,
		});
		return null;
	},
});

// Get the active schedule for a semester
export const getScheduleForSemester = query({
	args: { semester: v.string() },
	returns: v.union(
		v.object({
			_id: v.id("staffSchedules"),
			_creationTime: v.number(),
			semester: v.string(),
			createdAt: v.number(),
			createdBy: v.id("users"),
			isActive: v.boolean(),
			shifts: v.array(
				v.object({
					_id: v.id("staffShifts"),
					userId: v.id("users"),
					userName: v.string(),
					dayOfWeek: v.number(),
					startTime: v.string(),
					endTime: v.string(),
				}),
			),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const identity = await getActiveIdentity(ctx);
		if (!identity || identity.access.role !== "ADMIN") return null;

		// Find active schedule for semester
		const schedule = await ctx.db
			.query("staffSchedules")
			.withIndex("by_semester_and_active", (q) =>
				q.eq("semester", args.semester).eq("isActive", true),
			)
			.first();

		if (!schedule) return null;

		// Get all shifts for this schedule
		const shifts = await ctx.db
			.query("staffShifts")
			.withIndex("by_schedule_id", (q) => q.eq("scheduleId", schedule._id))
			.collect();

		// Enrich with user data
		const enrichedShifts = await Promise.all(
			shifts.map(async (shift) => {
				const user = await ctx.db.get(shift.userId);
				return {
					_id: shift._id,
					userId: shift.userId,
					userName: user?.name ?? "Unknown",
					dayOfWeek: shift.dayOfWeek,
					startTime: shift.startTime,
					endTime: shift.endTime,
				};
			}),
		);

		return {
			...schedule,
			shifts: enrichedShifts,
		};
	},
});

export const listSemesters = query({
	args: {},
	returns: v.object({
		semesters: v.array(
			v.object({
				semester: v.string(),
				startDate: v.string(),
				endDate: v.string(),
			}),
		),
		defaultSemester: v.optional(v.string()),
	}),
	handler: async (ctx) => {
		if (!(await getActiveIdentity(ctx))) return { semesters: [] };
		const semesters = (await ctx.db.query("semesters").collect())
			.map(({ semester, startDate, endDate }) => ({
				semester,
				startDate,
				endDate,
			}))
			.sort((a, b) => a.startDate.localeCompare(b.startDate));
		const publishedSchedules = (await ctx.db.query("staffSchedules").collect())
			.filter((schedule) => schedule.isActive)
			.sort((a, b) => b.createdAt - a.createdAt);
		const { defaultSemester } = resolveStudentSemesters({
			semesters,
			publishedSchedules,
			today: dateInNewYork(),
		});
		return {
			semesters,
			...(defaultSemester ? { defaultSemester } : {}),
		};
	},
});

export const getStudentSchedule = query({
	args: { semester: v.optional(v.string()) },
	returns: v.object({
		selectedSemester: v.optional(v.string()),
		visibleSemesters: v.array(
			v.object({
				semester: v.string(),
				startDate: v.optional(v.string()),
				endDate: v.optional(v.string()),
			}),
		),
		schedule: v.union(
			v.object({
				shifts: v.array(
					v.object({
						_id: v.id("staffShifts"),
						userId: v.id("users"),
						userName: v.string(),
						dayOfWeek: v.number(),
						startTime: v.string(),
						endTime: v.string(),
						isCurrentUser: v.boolean(),
					}),
				),
			}),
			v.null(),
		),
		holidays: v.array(
			v.object({
				date: v.string(),
				name: v.string(),
				isSubstitution: v.boolean(),
			}),
		),
	}),
	handler: async (ctx, args) => {
		const identity = await getActiveIdentity(ctx);
		if (!identity || identity.access.role !== "STUDENT") {
			return { visibleSemesters: [], schedule: null, holidays: [] };
		}
		const { user } = identity;
		const semesters = await ctx.db.query("semesters").collect();
		const publishedSchedules = (await ctx.db.query("staffSchedules").collect())
			.filter((schedule) => schedule.isActive)
			.sort((a, b) => b.createdAt - a.createdAt);
		const visibility = resolveStudentSemesters({
			semesters,
			publishedSchedules,
			today: dateInNewYork(),
		});
		if (args.semester && !visibility.allowedSemesters.includes(args.semester)) {
			throw new ConvexError("This semester is not available");
		}
		const selectedSemester = args.semester ?? visibility.defaultSemester;
		const semesterDates = semesters.find(
			(semester) => semester.semester === selectedSemester,
		);
		const selectedSchedule = publishedSchedules.find(
			(schedule) => schedule.semester === selectedSemester,
		);
		const shifts = selectedSchedule
			? await ctx.db
					.query("staffShifts")
					.withIndex("by_schedule_id", (q) =>
						q.eq("scheduleId", selectedSchedule._id),
					)
					.collect()
			: [];
		const enrichedShifts = await Promise.all(
			shifts.map(async (shift) => {
				const staffMember = await ctx.db.get(shift.userId);
				return {
					_id: shift._id,
					userId: shift.userId,
					userName: staffMember?.name ?? "Unknown",
					dayOfWeek: shift.dayOfWeek,
					startTime: shift.startTime,
					endTime: shift.endTime,
					isCurrentUser: shift.userId === user._id,
				};
			}),
		);
		const holidays = semesterDates
			? await ctx.db
					.query("holidays")
					.withIndex("by_date", (q) =>
						q
							.gte("date", semesterDates.startDate)
							.lte("date", semesterDates.endDate),
					)
					.collect()
			: [];
		const visibleSemesters = visibility.allowedSemesters.map((semester) => {
			const dates = semesters.find((item) => item.semester === semester);
			return dates
				? {
						semester,
						startDate: dates.startDate,
						endDate: dates.endDate,
					}
				: { semester };
		});

		return {
			...(selectedSemester ? { selectedSemester } : {}),
			visibleSemesters,
			schedule: selectedSchedule ? { shifts: enrichedShifts } : null,
			holidays: holidays.map((holiday) => ({
				date: holiday.date,
				name: holiday.name,
				isSubstitution: holiday.isSubstitution ?? false,
			})),
		};
	},
});

// Get all student staff members
export const getStaffMembers = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id("users"),
			name: v.string(),
			email: v.string(),
			classSchedule: v.optional(
				v.array(
					v.object({
						days: v.string(),
						startTime: v.string(),
						endTime: v.string(),
						dates: v.string(),
					}),
				),
			),
			preferences: v.optional(
				v.object({
					schedule: v.optional(
						v.record(
							v.string(),
							v.object({
								monday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								tuesday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								wednesday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								thursday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
								friday: v.object({
									isFullDayOff: v.boolean(),
									timeBlocks: v.array(
										v.object({
											start: v.string(),
											end: v.string(),
										}),
									),
								}),
							}),
						),
					),
					ui: v.optional(
						v.object({
							calendar: v.optional(
								v.object({
									enlarged: v.boolean(),
									view: v.union(v.literal("month"), v.literal("week")),
								}),
							),
						}),
					),
				}),
			),
		}),
	),
	handler: async (ctx) => {
		const identity = await getActiveIdentity(ctx);
		if (!identity || identity.access.role !== "ADMIN") return [];

		const grants = await ctx.db
			.query("accessGrants")
			.withIndex("by_status_and_role", (q) =>
				q.eq("status", "ACTIVE").eq("role", "STUDENT"),
			)
			.collect();
		const staff = await Promise.all(
			grants.map((grant) =>
				grant.userId ? ctx.db.get(grant.userId) : Promise.resolve(null),
			),
		);

		return staff
			.filter((user) => user !== null)
			.map((user) => ({
				_id: user._id,
				name: user.name,
				email: user.email,
				classSchedule: user.classSchedule,
				preferences: user.preferences,
			}));
	},
});

// Add a shift to the schedule
export const addShift = mutation({
	args: {
		scheduleId: v.id("staffSchedules"),
		userId: v.id("users"),
		dayOfWeek: v.number(),
		startTime: v.string(),
		endTime: v.string(),
	},
	returns: v.id("staffShifts"),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		// Get the schedule to determine semester
		const schedule = await ctx.db.get(args.scheduleId);
		if (!schedule) {
			throw new Error(`Schedule not found: ${args.scheduleId}`);
		}

		// Get the user associated with this shift
		const user = await ctx.db.get(args.userId);
		if (!user) {
			throw new Error(`User not found: ${args.userId}`);
		}
		const access = await getUserAccess(ctx, user);
		if (access?.status !== "ACTIVE" || access.role !== "STUDENT") {
			throw new Error("Shifts can only be assigned to active students");
		}

		// Validate shift against user's class schedule only - preferences are informational only
		const blockedRanges = getAllBlockedRanges(
			user.classSchedule,
			undefined, // Ignore preferences - admins can schedule over them
			schedule.semester,
			args.dayOfWeek,
		);

		if (doesShiftConflict(args.startTime, args.endTime, blockedRanges)) {
			const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
			throw new Error(
				`Shift conflicts with class time for ${user.name} on ${dayNames[args.dayOfWeek]} ${args.startTime}-${args.endTime}`,
			);
		}

		// Proceed with insert if no schedule conflicts detected
		return await ctx.db.insert("staffShifts", {
			scheduleId: args.scheduleId,
			userId: args.userId,
			dayOfWeek: args.dayOfWeek,
			startTime: args.startTime,
			endTime: args.endTime,
		});
	},
});

// Update shift times/day
export const updateShift = mutation({
	args: {
		shiftId: v.id("staffShifts"),
		dayOfWeek: v.optional(v.number()),
		startTime: v.optional(v.string()),
		endTime: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);

		// Fetch the existing shift record first
		const existingShift = await ctx.db.get(args.shiftId);
		if (!existingShift) {
			throw new Error(`Shift not found: ${args.shiftId}`);
		}

		// Compute the updated dayOfWeek/startTime/endTime by merging existing values with any provided in args
		const updatedDayOfWeek = args.dayOfWeek ?? existingShift.dayOfWeek;
		const updatedStartTime = args.startTime ?? existingShift.startTime;
		const updatedEndTime = args.endTime ?? existingShift.endTime;

		// Get the schedule to determine semester
		const schedule = await ctx.db.get(existingShift.scheduleId);
		if (!schedule) {
			throw new Error(`Schedule not found: ${existingShift.scheduleId}`);
		}

		// Get the user associated with this shift
		const user = await ctx.db.get(existingShift.userId);
		if (!user) {
			throw new Error(`User not found: ${existingShift.userId}`);
		}
		const access = await getUserAccess(ctx, user);
		if (access?.status !== "ACTIVE" || access.role !== "STUDENT") {
			throw new Error("Shifts can only be assigned to active students");
		}

		// Validate against class schedule only - preferences are informational only
		const blockedRanges = getAllBlockedRanges(
			user.classSchedule,
			undefined, // Ignore preferences - admins can schedule over them
			schedule.semester,
			updatedDayOfWeek,
		);

		if (doesShiftConflict(updatedStartTime, updatedEndTime, blockedRanges)) {
			const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
			throw new Error(
				`Shift conflicts with class time for ${user.name} on ${dayNames[updatedDayOfWeek]} ${updatedStartTime}-${updatedEndTime}`,
			);
		}

		// Proceed with patch if no schedule conflicts detected
		const { shiftId, ...updates } = args;
		await ctx.db.patch(shiftId, updates);
		return null;
	},
});

// Delete a shift
export const deleteShift = mutation({
	args: { shiftId: v.id("staffShifts") },
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		await ctx.db.delete(args.shiftId);
		return null;
	},
});

// Publish entire schedule (create schedule + bulk insert shifts)
export const publishSchedule = mutation({
	args: {
		semester: v.string(),
		shifts: v.array(
			v.object({
				userId: v.id("users"),
				dayOfWeek: v.number(),
				startTime: v.string(),
				endTime: v.string(),
			}),
		),
	},
	returns: v.id("staffSchedules"),
	handler: async (ctx, args) => {
		const { user: admin } = await requireAdmin(ctx);
		const userId = admin._id;

		// Weekday names for error messages
		const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

		// Validate each shift against student's class schedule
		for (const shift of args.shifts) {
			// Validate dayOfWeek is an integer between 0 and 4 (inclusive)
			if (!Number.isInteger(shift.dayOfWeek)) {
				throw new Error(
					`Invalid dayOfWeek: ${shift.dayOfWeek}. Must be an integer between 0 (Monday) and 4 (Friday).`,
				);
			}
			const dayOfWeek = shift.dayOfWeek;
			if (dayOfWeek < 0 || dayOfWeek > 4) {
				throw new Error(
					`Invalid dayOfWeek: ${dayOfWeek}. Must be between 0 (Monday) and 4 (Friday).`,
				);
			}

			const user = await ctx.db.get(shift.userId);
			if (!user) {
				throw new Error(`User not found: ${shift.userId}`);
			}
			const access = await getUserAccess(ctx, user);
			if (access?.status !== "ACTIVE" || access.role !== "STUDENT") {
				throw new Error("Shifts can only be assigned to active students");
			}

			// Validate against class schedule only - preferences are informational only
			const blockedRanges = getAllBlockedRanges(
				user.classSchedule,
				undefined, // Ignore preferences - admins can schedule over them
				args.semester,
				dayOfWeek,
			);

			if (doesShiftConflict(shift.startTime, shift.endTime, blockedRanges)) {
				throw new Error(
					`Shift conflicts with class time for ${user.name} on ${dayNames[dayOfWeek]} ${shift.startTime}-${shift.endTime}`,
				);
			}
		}

		// Deactivate any existing schedule for this semester
		const existing = await ctx.db
			.query("staffSchedules")
			.withIndex("by_semester", (q) => q.eq("semester", args.semester))
			.collect();

		for (const schedule of existing) {
			await ctx.db.patch(schedule._id, { isActive: false });
		}

		// Create new schedule
		const scheduleId = await ctx.db.insert("staffSchedules", {
			semester: args.semester,
			createdAt: Date.now(),
			createdBy: userId,
			isActive: true,
		});

		// Insert all shifts
		for (const shift of args.shifts) {
			await ctx.db.insert("staffShifts", {
				scheduleId,
				userId: shift.userId,
				dayOfWeek: shift.dayOfWeek,
				startTime: shift.startTime,
				endTime: shift.endTime,
			});
		}

		return scheduleId;
	},
});
