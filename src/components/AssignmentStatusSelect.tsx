"use client";

import { useState, useTransition } from "react";
import { updateAssignmentStatus } from "@/app/actions/assignments";
import type { AssignmentStatus } from "@/lib/types";
import { STATUS_META, MANUAL_STATUS_ORDER, getEffectiveStatus } from "@/lib/status";

export function AssignmentStatusSelect({
  assignmentId,
  courseId,
  status,
  dueAt,
}: {
  assignmentId: string;
  courseId?: string;
  status: AssignmentStatus;
  dueAt: string | null;
}) {
  // The last status a student actually picked. Rows saved before the status
  // vocabulary changed (or any other unrecognized value) fall back to "todo".
  const [manualStatus, setManualStatus] = useState<AssignmentStatus>(
    MANUAL_STATUS_ORDER.includes(status) ? status : "todo"
  );
  const [isPending, startTransition] = useTransition();

  // What's actually shown: "complete" always wins, and once the due date has
  // passed it's "overdue" no matter what was last picked. Overdue isn't
  // something a student chooses — it's automatic.
  const effective = getEffectiveStatus({ status: manualStatus, due_at: dueAt });
  const meta = STATUS_META[effective] ?? STATUS_META.todo;
  const options: AssignmentStatus[] = effective === "overdue" ? ["overdue", "complete"] : MANUAL_STATUS_ORDER;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as AssignmentStatus;
    const previous = manualStatus;
    setManualStatus(next);
    startTransition(async () => {
      const { error } = await updateAssignmentStatus(assignmentId, next, courseId);
      if (error) setManualStatus(previous);
    });
  }

  return (
    <select
      value={effective}
      onChange={handleChange}
      disabled={isPending}
      aria-label="Assignment status"
      className={`flex-none cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-medium outline-none transition-opacity focus:ring-1 focus:ring-accent disabled:cursor-wait disabled:opacity-60 ${meta.bg} ${meta.text}`}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
