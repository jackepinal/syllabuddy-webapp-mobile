"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_META, getEffectiveStatus } from "@/lib/status";
import type { AssignmentWithCourse } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, n: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function AssignmentsWeekView({ assignments }: { assignments: AssignmentWithCourse[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const withDueDates = assignments.filter((a) => a.due_at);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Previous week
        </button>
        <p className="text-sm font-medium text-ink">
          {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
          {days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="text-sm font-medium text-accent hover:underline"
        >
          Next week →
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((date) => {
          const items = withDueDates
            .filter((a) => isSameDay(new Date(a.due_at!), date))
            .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
          const isToday = isSameDay(date, today);

          return (
            <div
              key={date.toISOString()}
              className={`rounded-card border p-2.5 ${isToday ? "border-accent" : "border-line"}`}
            >
              <p
                className={`font-mono text-[0.68rem] uppercase tracking-wide ${isToday ? "text-accent" : "text-muted"}`}
              >
                {DAY_LABELS[date.getDay()]} {date.getDate()}
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {items.length === 0 && <p className="text-xs text-muted">—</p>}
                {items.map((a) => {
                  const effective = getEffectiveStatus({ status: a.status, due_at: a.due_at });
                  const meta = STATUS_META[effective];
                  return (
                    <Link
                      key={a.id}
                      href={a.course ? `/courses/${a.course.id}` : "/assignments"}
                      title={a.title}
                      className={`block truncate rounded px-2 py-1 text-xs font-medium ${meta.bg} ${meta.text}`}
                    >
                      {a.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
