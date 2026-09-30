import type { AssignmentStatus } from "@/lib/types";

// Single source of truth for the four assignment statuses: the label shown
// in menus, and the text/background color pair (Tailwind classes, driven by
// the CSS variables in globals.css so they adapt in dark mode).
export const STATUS_META: Record<
  AssignmentStatus,
  { label: string; text: string; bg: string }
> = {
  todo: { label: "To do", text: "text-status-todo", bg: "bg-status-todo-soft" },
  in_progress: { label: "In progress", text: "text-status-progress", bg: "bg-status-progress-soft" },
  overdue: { label: "Overdue", text: "text-status-overdue", bg: "bg-status-overdue-soft" },
  complete: { label: "Complete!", text: "text-good", bg: "bg-good-soft" },
};

// All four statuses, for places that just need to enumerate or filter by them.
export const STATUS_ORDER: AssignmentStatus[] = ["todo", "in_progress", "overdue", "complete"];

// The statuses a student ever picks by hand. "Overdue" isn't one of them —
// it's computed (see getEffectiveStatus below), never stored as a deliberate
// choice.
export const MANUAL_STATUS_ORDER: AssignmentStatus[] = ["todo", "in_progress", "complete"];

// What should actually be shown for an assignment right now. A saved status
// of "complete" always wins. Otherwise, once the due date has passed the
// assignment is overdue regardless of whatever was last picked — the only
// way out is marking it complete or (for assignments the student edits)
// pushing the due date forward. An assignment with no due date, or one due
// in the future, just shows whatever was last picked (falling back to "todo"
// for a stray/legacy value, including a stored "overdue" whose due date has
// since moved to the future).
export function getEffectiveStatus(assignment: {
  status: AssignmentStatus;
  due_at: string | null;
}): AssignmentStatus {
  if (assignment.status === "complete") return "complete";
  if (assignment.due_at && new Date(assignment.due_at).getTime() < Date.now()) return "overdue";
  return MANUAL_STATUS_ORDER.includes(assignment.status) ? assignment.status : "todo";
}
