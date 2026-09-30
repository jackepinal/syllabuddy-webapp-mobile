"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AssignmentStatusSelect } from "@/components/AssignmentStatusSelect";
import { AssignmentForm } from "@/components/AssignmentForm";
import { formatDueDateFull } from "@/lib/format";
import type { AssignmentWithCourse } from "@/lib/types";

export function AssignmentRow({
  assignment,
  returnTo = "/assignments",
}: {
  assignment: AssignmentWithCourse;
  returnTo?: string;
}) {
  const [editing, setEditing] = useState(false);
  const a = assignment;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {a.course && (
          <Link
            href={`/courses/${a.course.id}`}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-lg text-white"
            style={{ backgroundColor: a.course.color }}
            aria-label={a.course.name}
          >
            {a.course.icon}
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{a.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {a.course?.name ?? "Unknown class"} · {formatDueDateFull(a.due_at)}
            {a.points_possible != null ? ` · ${a.points_possible} pts` : ""}
          </p>
        </div>
        <AssignmentStatusSelect
          assignmentId={a.id}
          courseId={a.course_id}
          status={a.status}
          dueAt={a.due_at}
        />
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex-none text-xs text-muted hover:text-accent"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>
      {editing && (
        <div className="border-t border-line pt-3">
          <AssignmentForm assignment={a} courseId={a.course_id} returnTo={returnTo} />
        </div>
      )}
    </Card>
  );
}
