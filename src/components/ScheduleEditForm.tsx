"use client";

import { useState } from "react";
import { updateScheduleSeries } from "@/app/actions/schedule";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { COURSE_COLORS, COURSE_ICONS } from "@/lib/types";
import { DAY_LABELS } from "@/lib/schedule";
import type { ScheduleBlockWithCourse } from "@/lib/types";

export function ScheduleEditForm({
  block,
  seriesBlocks,
}: {
  // The specific day's row the edit form was opened from — its time/
  // location/name seed the form's defaults.
  block: ScheduleBlockWithCourse;
  // Every row in the same class/activity, across all its days — what the
  // day checkboxes below start pre-checked from, and what gets reconciled
  // (days added, dropped, or kept) on save.
  seriesBlocks: ScheduleBlockWithCourse[];
}) {
  const isActivity = !block.course;
  const [color, setColor] = useState<string>(block.color ?? COURSE_COLORS[0]);
  const [icon, setIcon] = useState<string>(block.icon ?? COURSE_ICONS[0]);
  const scheduledDays = new Set(seriesBlocks.map((b) => b.day_of_week));
  const existingJson = JSON.stringify(seriesBlocks.map((b) => ({ id: b.id, day_of_week: b.day_of_week })));

  return (
    <form action={updateScheduleSeries} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={isActivity ? "activity" : "class"} />
      <input type="hidden" name="existing_json" value={existingJson} />
      {!isActivity && <input type="hidden" name="course_id" value={block.course_id ?? ""} />}
      {isActivity && <input type="hidden" name="color" value={color} />}
      {isActivity && <input type="hidden" name="icon" value={icon} />}

      {isActivity && (
        <>
          <div>
            <Label htmlFor="title">Name</Label>
            <Input id="title" name="title" required defaultValue={block.title ?? ""} />
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
              <input
                type="checkbox"
                name="days"
                value={value}
                defaultChecked={scheduledDays.has(value)}
                className="accent-accent"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="start_time">Start time</Label>
          <Input
            id="start_time"
            name="start_time"
            type="time"
            required
            defaultValue={block.start_time.slice(0, 5)}
          />
        </div>
        <div>
          <Label htmlFor="end_time">End time</Label>
          <Input id="end_time" name="end_time" type="time" required defaultValue={block.end_time.slice(0, 5)} />
        </div>
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={block.location ?? ""} placeholder="Room 204" />
      </div>

      <Button type="submit" className="self-start">
        Save changes
      </Button>
    </form>
  );
}
