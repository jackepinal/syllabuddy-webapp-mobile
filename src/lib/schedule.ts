import type { ScheduleBlockWithCourse } from "@/lib/types";

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// A block's display info comes from its course when it's a class meeting,
// or from its own title/color/icon when it's a student-added extracurricular.
export function scheduleBlockDisplay(block: ScheduleBlockWithCourse) {
  return {
    name: block.course?.name ?? block.title ?? "Untitled",
    color: block.course?.color ?? block.color ?? "#2c4a7c",
    icon: block.course?.icon ?? block.icon ?? "⭐",
    href: block.course ? `/courses/${block.course.id}` : null,
  };
}

// One class meeting on Mon/Wed/Fri is stored as three separate rows (one per
// day) with no shared id of their own. This key groups them back together —
// by course for a class, or by title+color+icon for an extracurricular — so
// editing one day's row can edit every day of the same class/activity at
// once (add a day, drop a day, or change the shared time/location).
export function scheduleSeriesKey(block: ScheduleBlockWithCourse): string {
  return block.course_id ?? `activity:${block.title ?? ""}:${block.color ?? ""}:${block.icon ?? ""}`;
}

// Postgres `time` columns come back as "HH:MM:SS".
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr.padStart(2, "0")} ${suffix}`;
}
