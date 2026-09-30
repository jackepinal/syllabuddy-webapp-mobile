export function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return "No date";
  return new Date(dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDueDateFull(dueAt: string | null): string {
  if (!dueAt) return "No due date";
  return new Date(dueAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Combines a YYYY-MM-DD date and an HH:MM time (both from a form or Claude's
// extraction) into an ISO-ish local timestamp. Defaults to end-of-day when no
// time was given, so a date-only due date still sorts after everything else
// due that same day.
export function combineDateTime(date: string | null, time: string | null): string | null {
  if (!date) return null;
  return `${date}T${time || "23:59"}:00`;
}

// Splits a due_at timestamp back into the separate date/time form inputs use.
export function splitDateTime(dueAt: string | null): { date: string; time: string } {
  if (!dueAt) return { date: "", time: "" };
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time: time === "23:59" ? "" : time };
}
