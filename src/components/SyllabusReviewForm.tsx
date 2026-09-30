"use client";

import { useState, useTransition, type FormEvent } from "react";
import { commitSyllabusReview } from "@/app/actions/syllabus";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { ParsedAssignment, ParsedGradingCategory, ParsedScheduleBlock, ParsedSyllabusData } from "@/lib/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `row-${idCounter}`;
}

type CategoryRow = ParsedGradingCategory & { key: string };
type AssignmentRow = Omit<ParsedAssignment, "category_name"> & { key: string; category_key: string | null };
type ScheduleRow = ParsedScheduleBlock & { key: string };

export function SyllabusReviewForm({
  courseId,
  syllabusId,
  parsed,
}: {
  courseId: string;
  syllabusId: string;
  parsed: ParsedSyllabusData;
}) {
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<CategoryRow[]>(() =>
    parsed.grading_categories.map((c) => ({ ...c, key: nextId() }))
  );
  const [assignments, setAssignments] = useState<AssignmentRow[]>(() =>
    parsed.assignments.map((a) => {
      const match = parsed.grading_categories.findIndex(
        (c) => c.name.toLowerCase() === (a.category_name ?? "").toLowerCase()
      );
      return {
        key: nextId(),
        category_key: match >= 0 ? `seed-${match}` : null,
        title: a.title,
        due_date: a.due_date,
        due_time: a.due_time,
        points_possible: a.points_possible,
        description: a.description,
        ai_summary: a.ai_summary,
      };
    })
  );
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleRow[]>(() =>
    parsed.schedule_blocks.map((s) => ({ ...s, key: nextId() }))
  );

  // Categories seeded from the initial parse are referenced by assignments
  // via a stable "seed-N" key (N = their position in the original parse),
  // which handleSubmit resolves back to that category's live array index —
  // this keeps the reference correct even as rows are added/removed/reordered.

  function updateCategory(key: string, patch: Partial<CategoryRow>) {
    setCategories((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeCategory(key: string) {
    setCategories((rows) => rows.filter((r) => r.key !== key));
    setAssignments((rows) => rows.map((r) => (r.category_key === key ? { ...r, category_key: null } : r)));
  }
  function addCategory() {
    const key = nextId();
    setCategories((rows) => [...rows, { key, name: "New category", weight_pct: 0, drop_lowest_n: 0 }]);
  }

  function updateAssignment(key: string, patch: Partial<AssignmentRow>) {
    setAssignments((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeAssignment(key: string) {
    setAssignments((rows) => rows.filter((r) => r.key !== key));
  }
  function addAssignment() {
    const key = nextId();
    setAssignments((rows) => [
      ...rows,
      {
        key,
        title: "New assignment",
        category_key: null,
        due_date: null,
        due_time: null,
        points_possible: null,
        description: null,
        ai_summary: null,
      },
    ]);
  }

  function updateSchedule(key: string, patch: Partial<ScheduleRow>) {
    setScheduleBlocks((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeSchedule(key: string) {
    setScheduleBlocks((rows) => rows.filter((r) => r.key !== key));
  }
  function addSchedule() {
    const key = nextId();
    setScheduleBlocks((rows) => [
      ...rows,
      { key, days: [1], start_time: "09:00", end_time: "09:50", location: null },
    ]);
  }

  function toggleDay(rowKey: string, day: number) {
    setScheduleBlocks((rows) =>
      rows.map((r) => {
        if (r.key !== rowKey) return r;
        const has = r.days.includes(day);
        const days = has ? r.days.filter((d) => d !== day) : [...r.days, day].sort();
        return { ...r, days };
      })
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Resolve each assignment's category by matching its seed/local key back
    // to the *current* categories array order, which is what the server
    // action will insert in — that final order is what category_index needs
    // to line up with.
    const keyToIndex = new Map(categories.map((c, i) => [c.key, i]));
    // Seeded assignments reference "seed-N" keys pointing at the original
    // parse order; map those back to the live category row at that
    // position, if it still exists.
    const seedIndexToKey = new Map(categories.map((c, i) => [`seed-${i}`, c.key]));

    const resolvedAssignments = assignments.map((a) => {
      let index: number | null = null;
      if (a.category_key) {
        const liveKey = a.category_key.startsWith("seed-")
          ? seedIndexToKey.get(a.category_key) ?? null
          : a.category_key;
        if (liveKey) index = keyToIndex.get(liveKey) ?? null;
      }
      return { ...a, category_index: index };
    });

    // Built and sent explicitly (rather than via <form action> + hidden
    // inputs) so the payload is guaranteed to reflect current state at the
    // moment Save is clicked, with no dependency on DOM update timing.
    const formData = new FormData();
    formData.set("course_id", courseId);
    formData.set("syllabus_id", syllabusId);
    formData.set("categories_json", JSON.stringify(categories));
    formData.set("assignments_json", JSON.stringify(resolvedAssignments));
    formData.set("schedule_json", JSON.stringify(scheduleBlocks));

    startTransition(async () => {
      await commitSyllabusReview(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {parsed.course_summary && (
        <p className="rounded-card border border-line bg-paper-raised p-4 text-sm text-ink-soft">
          {parsed.course_summary}
        </p>
      )}

      {/* Grading categories */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Grading breakdown</h2>
          <button type="button" onClick={addCategory} className="text-xs font-medium text-accent hover:underline">
            + Add category
          </button>
        </div>
        {categories.length === 0 && (
          <p className="text-sm text-muted">No grading categories found — add one if your syllabus has one.</p>
        )}
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
              <Input
                aria-label="Category name"
                value={c.name}
                onChange={(e) => updateCategory(c.key, { name: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <Input
                  aria-label="Weight percent"
                  type="number"
                  className="w-20"
                  value={c.weight_pct}
                  onChange={(e) => updateCategory(c.key, { weight_pct: Number(e.target.value) })}
                />
                <span className="text-xs text-muted">%</span>
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap text-xs text-muted">
                <span>drop</span>
                <Input
                  aria-label="Drop lowest N"
                  type="number"
                  className="w-14"
                  value={c.drop_lowest_n}
                  onChange={(e) => updateCategory(c.key, { drop_lowest_n: Number(e.target.value) })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeCategory(c.key)}
                className="text-xs text-muted hover:text-highlight"
                aria-label="Remove category"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Assignments */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Assignments</h2>
          <button type="button" onClick={addAssignment} className="text-xs font-medium text-accent hover:underline">
            + Add assignment
          </button>
        </div>
        {assignments.length === 0 && <p className="text-sm text-muted">No assignments found.</p>}
        <div className="flex flex-col gap-4">
          {assignments.map((a) => (
            <div key={a.key} className="rounded-card border border-line bg-paper-raised p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <Label htmlFor={`title-${a.key}`}>Title</Label>
                  <Input
                    id={`title-${a.key}`}
                    value={a.title}
                    onChange={(e) => updateAssignment(a.key, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`cat-${a.key}`}>Category</Label>
                  <select
                    id={`cat-${a.key}`}
                    value={a.category_key ?? ""}
                    onChange={(e) => updateAssignment(a.key, { category_key: e.target.value || null })}
                    className="w-full rounded-card border border-line-strong bg-paper-raised px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label htmlFor={`date-${a.key}`}>Due date</Label>
                  <Input
                    id={`date-${a.key}`}
                    type="date"
                    value={a.due_date ?? ""}
                    onChange={(e) => updateAssignment(a.key, { due_date: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label htmlFor={`time-${a.key}`}>Due time</Label>
                  <Input
                    id={`time-${a.key}`}
                    type="time"
                    value={a.due_time ?? ""}
                    onChange={(e) => updateAssignment(a.key, { due_time: e.target.value || null })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor={`points-${a.key}`}>Points</Label>
                  <Input
                    id={`points-${a.key}`}
                    type="number"
                    value={a.points_possible ?? ""}
                    onChange={(e) =>
                      updateAssignment(a.key, {
                        points_possible: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeAssignment(a.key)}
                    className="text-xs text-muted hover:text-highlight"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <Label htmlFor={`summary-${a.key}`}>Summary</Label>
                <Input
                  id={`summary-${a.key}`}
                  value={a.ai_summary ?? ""}
                  onChange={(e) => updateAssignment(a.key, { ai_summary: e.target.value || null })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Meeting times</h2>
          <button type="button" onClick={addSchedule} className="text-xs font-medium text-accent hover:underline">
            + Add meeting time
          </button>
        </div>
        {scheduleBlocks.length === 0 && <p className="text-sm text-muted">No recurring meeting times found.</p>}
        <div className="flex flex-col gap-3">
          {scheduleBlocks.map((s) => (
            <div key={s.key} className="rounded-card border border-line bg-paper-raised p-4">
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(s.key, day)}
                    aria-pressed={s.days.includes(day)}
                    className={`h-8 w-11 rounded-card border text-xs font-medium ${
                      s.days.includes(day)
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line-strong text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <Label htmlFor={`start-${s.key}`}>Start</Label>
                  <Input
                    id={`start-${s.key}`}
                    type="time"
                    value={s.start_time}
                    onChange={(e) => updateSchedule(s.key, { start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`end-${s.key}`}>End</Label>
                  <Input
                    id={`end-${s.key}`}
                    type="time"
                    value={s.end_time}
                    onChange={(e) => updateSchedule(s.key, { end_time: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor={`loc-${s.key}`}>Location</Label>
                  <Input
                    id={`loc-${s.key}`}
                    value={s.location ?? ""}
                    onChange={(e) => updateSchedule(s.key, { location: e.target.value || null })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSchedule(s.key)}
                className="mt-2 text-xs text-muted hover:text-highlight"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Key policies (informational, not committed to a table yet) */}
      {parsed.key_policies.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Key policies</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {parsed.key_policies.map((p, i) => (
              <div key={i} className="rounded-card border border-line bg-paper-raised p-4">
                <p className="text-sm font-medium text-ink">{p.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{p.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save to course"}
        </Button>
      </div>
    </form>
  );
}
