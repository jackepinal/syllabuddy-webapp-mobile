"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScheduleForm } from "@/components/ScheduleForm";
import { ScheduleList } from "@/components/ScheduleList";
import { ScheduleWeekView } from "@/components/ScheduleWeekView";
import type { Course, ScheduleBlockWithCourse } from "@/lib/types";

type CourseLite = Pick<Course, "id" | "name">;
type ViewMode = "list" | "week";

export function ScheduleView({
  blocks,
  courses,
}: {
  blocks: ScheduleBlockWithCourse[];
  courses: CourseLite[];
}) {
  const [view, setView] = useState<ViewMode>("week");
  const [addingOpen, setAddingOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center justify-between">
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
          {addingOpen ? "Cancel" : "+ Add to schedule"}
        </Button>
      </Card>

      {addingOpen && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Add a class or activity</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Classes borrow their color and icon from the course; extracurriculars get their own.
          </p>
          <div className="mt-4">
            <ScheduleForm courses={courses} />
          </div>
        </Card>
      )}

      {view === "week" ? <ScheduleWeekView blocks={blocks} /> : <ScheduleList blocks={blocks} />}
    </div>
  );
}
