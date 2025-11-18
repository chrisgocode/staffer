import { Id } from "@/convex/_generated/dataModel";

export type UserRole = "STUDENT" | "ADMIN";

export interface User {
  _id: Id<"users">;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Event {
  _id: Id<"events">;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  spotsAvailable: number;
  spotsTotal: number;
  createdBy: Id<"users">;
}

export interface EventSignup {
  _id: Id<"signups">;
  eventId: Id<"events">;
  studentId: Id<"users">;
  studentName: string;
  studentEmail: string;
  studentImageUrl?: string;
  status: "PENDING" | "SCHEDULED";
  timeslots: Array<{
    startTime: string;
    endTime: string;
  }>;
}

export interface Shift {
  _id: Id<"staffShifts">;
  userId: Id<"users">;
  userName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  color: string;
  zIndex: number;
}

export interface ClassSchedule {
  days: string;
  startTime: string;
  endTime: string;
  dates: string;
}

export interface StaffMember {
  _id: Id<"users">;
  name: string;
  email: string;
  color: string;
  classSchedule?: ClassSchedule[];
}

export interface DropPreview {
  day: number;
  startTime: string;
  endTime: string;
  color: string;
}
