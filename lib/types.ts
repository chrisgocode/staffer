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
  status: "PENDING" | "SCHEDULED";
  timeslots: Array<{
    startTime: string;
    endTime: string;
  }>;
}
