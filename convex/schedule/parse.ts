"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { PDFParse } from "pdf-parse";

interface ClassSchedule {
  days: string;
  startTime: string;
  endTime: string;
  dates: string;
}

function parseScheduleText(text: string): ClassSchedule[] {
  const schedule: ClassSchedule[] = [];
  const lines = text.split("\n");
  let currentClass: Partial<ClassSchedule> = {};

  console.log("starting loop through pdf lines");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "") {
      continue;
    }

    // Days
    if (line.startsWith("Days:")) {
      if (Object.keys(currentClass).length > 0) {
        schedule.push(currentClass as ClassSchedule);
      }
      // Start a new class
      currentClass = {};
      currentClass.days = line.replace("Days:", "").trim();
    }
    // Start time
    else if (line.startsWith("Start:")) {
      currentClass.startTime = line.replace("Start:", "").trim();
    }
    // End time
    else if (line.startsWith("End:")) {
      currentClass.endTime = line.replace("End:", "").trim();
    }
    // Dates
    else if (line.startsWith("Dates:")) {
      currentClass.dates = line.replace("Dates:", "").trim();
    }
  }

  if (Object.keys(currentClass).length > 0) {
    schedule.push(currentClass as ClassSchedule);
  }

  console.log(schedule);
  return schedule;
}

export async function parsePDF(url: string): Promise<ClassSchedule[]> {
  const parser = new PDFParse({ url: url });

  const scheduleText = await parser.getText();

  // Parse the text and return the schedule
  return parseScheduleText(scheduleText.text);
}

export const parseSchedulePDF = internalAction({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Get the PDF URL from storage
      const pdfUrl = await ctx.storage.getUrl(args.storageId);
      if (!pdfUrl) {
        throw new Error("PDF not found in storage");
      }

      const schedule = await parsePDF(pdfUrl);

      console.log(`Parsed ${schedule.length} classes from schedule PDF`);

      // Store the data via internal mutation
      await ctx.runMutation(internal.schedule.schedule.storeClassSchedule, {
        userId: args.userId,
        classSchedule: schedule,
      });
    } catch (error) {
      console.error("Failed to parse schedule PDF:", error);
    }

    return null;
  },
});
