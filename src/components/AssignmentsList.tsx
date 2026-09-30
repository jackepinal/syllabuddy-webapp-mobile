"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AssignmentRow } from "@/components/AssignmentRow";
import { AssignmentForm } from "@/components/AssignmentForm";
import { AssignmentsWeekView } from "@/components/AssignmentsWeekView";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type { AssignmentStatus, AssignmentWithCourse, Course } from "@/lib/types";

type CourseLite = Pick<Course, "id" | "name" | "color" | "icon">;

type SortDir = "earliest" | "latest";
type StatusFilter = "all" | AssignmentStatus;
type ViewMode = "list" | "week";

export function AssignmentsList({
  assignments,
  courses,
}: {
  assignments: AssignmentWithCourse[];
  courses: CourseLite[];
}) {
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortDir, setSortDir] = useState<SortDir>("earliest");
  const [view, setView] = useState<ViewMode>("list");
  const [addingOpen, setAddingOpen] = useState(false);

  const filteredBase = useMemo(() => {
    let list = assignments;
    if (courseFilter !== "all") list = list.filter((a) => a.course_id === courseFilter);
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    return list;
  }, [assignments, courseFilter, statusFilter]);

  const sorted = useMemo(() => {
    const dated = filteredBase.filter((a) => a.due_at);
    const undated = filteredBase.filter((a) => !a.due_at);
    dated.sort((a, b) => {
      const diff = new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime();
      return sortDir === "earliest" ? diff : -diff;
    });
    return [...dated, ...undated];
  }, [filteredBase, sortDir]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1">
            <Label htmlFor="sort">Due date</Label>
            <Select id="sort" value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)}>
              <option value="earliest">Earliest → latest</option>
              <option value="latest">Latest → earliest</option>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="course">Class</Label>
            <Select id="course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="all">All classes</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="inline-flex overflow-hidden rounded-card border border-line-strong text-sm">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-3.5 py-1.5 font-medium transition-colors ${
                view === "list" ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              Scroll
            </button>
            <button
              type="button"
              onClick={() => setView("week")}
              className={`px-3.5 py-1.5 font-medium transition-colors ${
                view === "week" ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              Week
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={() => setAddingOpen((v) => !v)}>
            {addingOpen ? "Cancel" : "+ Add assignment"}
          </Button>
        </div>
      </Card>

      {addingOpen && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Add an assignment</h2>
          <p className="mt-1 text-sm text-ink-soft">
            For anything a syllabus upload didn&apos;t catch.
          </p>
          <div className="mt-4">
            <AssignmentForm courses={courses} returnTo="/assignments" />
          </div>
        </Card>
      )}

      {view === "week" ? (
        <AssignmentsWeekView assignments={filteredBase} />
      ) : sorted.length === 0 ? (
        <Card className="text-sm text-ink-soft">No assignments match those filters yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((a) => (
            <AssignmentRow key={a.id} assignment={a} returnTo="/assignments" />
          ))}
        </div>
      )}
    </div>
  );
}
