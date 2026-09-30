"use client";

import { useState } from "react";
import { createScheduleBlock } from "@/app/actions/schedule";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COURSE_COLORS, COURSE_ICONS } from "@/lib/types";
import { DAY_LABELS } from "@/lib/schedule";
import type { Course } from "@/lib/types";

type CourseLite = Pick<Course, "id" | "name">;

export function ScheduleForm({ courses }: { courses: CourseLite[] }) {
  const [kind, setKind] = useState<"class" | "activity">(courses.length > 0 ? "class" : "activity");
  const [color, setColor] = useState<string>(COURSE_COLORS[0]);
  const [icon, setIcon] = useState<string>(COURSE_ICONS[0]);

  return (
    <form action={createScheduleBlock} className="flex flex-col gap-4">
      <input type="hidden" name="kind" value={kind} />
      {kind === "activity" && <input type="hidden" name="color" value={color} />}
      {kind === "activity" && <input type="hidden" name="icon" value={icon} />}

      <div className="inline-flex self-start overflow-hidden rounded-card border border-line-strong text-sm">
        <button
          type="button"
          onClick={() => setKind("class")}
          className={`px-3.5 py-1.5 font-medium transition-colors ${
            kind === "class" ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          Class
        </button>
        <button
          type="button"
          onClick={() => setKind("activity")}
          className={`px-3.5 py-1.5 font-medium transition-colors ${
            kind === "activity" ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          Extracurricular
        </button>
      </div>

      {kind === "class" ? (
        <div>
          <Label htmlFor="course_id">Class</Label>
          <Select id="course_id" name="course_id" required defaultValue="">
            <option value="" disabled>
              Choose a class
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="title">Name</Label>
            <Input id="title" name="title" required placeholder="Club soccer practice" />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Choose color ${c}`}
                  aria-pressed={color === c}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-ink" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {COURSE_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  aria-label={`Choose icon ${i}`}
                  aria-pressed={icon === i}
                  className={`flex h-9 w-9 items-center justify-center rounded-card border text-lg transition-colors ${
                    icon === i ? "border-accent bg-accent-soft" : "border-line-strong bg-paper-raised"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <Label>Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, value) => (
            <label
              key={value}
              className="flex items-center gap-1.5 rounded-card border border-line-strong bg-paper-raised px-2.5 py-1.5 text-xs text-ink-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent"
            >
              <input type="checkbox" name="days" value={value} className="accent-accent" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="start_time">Start time</Label>
          <Input id="start_time" name="start_time" type="time" required />
        </div>
        <div>
          <Label htmlFor="end_time">End time</Label>
          <Input id="end_time" name="end_time" type="time" required />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" placeholder="Room 204" />
      </div>

      <Button type="submit" className="self-start">
        Add to schedule
      </Button>
    </form>
  );
}
