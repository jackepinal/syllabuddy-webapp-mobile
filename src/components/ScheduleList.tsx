"use client";

import { ScheduleRow } from "@/components/ScheduleRow";
import { DAY_LABELS_FULL, scheduleSeriesKey } from "@/lib/schedule";
import type { ScheduleBlockWithCourse } from "@/lib/types";

function startOfTodayDayIndex(): number {
  return new Date().getDay();
}

function groupBySeries(blocks: ScheduleBlockWithCourse[]): Map<string, ScheduleBlockWithCourse[]> {
  const groups = new Map<string, ScheduleBlockWithCourse[]>();
  for (const block of blocks) {
    const key = scheduleSeriesKey(block);
    const group = groups.get(key);
    if (group) group.push(block);
    else groups.set(key, [block]);
  }
  return groups;
}

export function ScheduleList({ blocks }: { blocks: ScheduleBlockWithCourse[] }) {
  const today = startOfTodayDayIndex();
  const series = groupBySeries(blocks);

  const byDay = DAY_LABELS_FULL.map((label, day) => ({
    day,
    label,
    blocks: blocks
      .filter((b) => b.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <div className="flex flex-col gap-6">
      {byDay.map(({ day, label, blocks: dayBlocks }) => (
        <section key={day}>
          <h2
            className={`font-mono text-xs uppercase tracking-wide ${
              day === today ? "text-accent" : "text-muted"
            }`}
          >
            {label}
            {day === today ? " · Today" : ""}
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {dayBlocks.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing scheduled.</p>
            ) : (
              dayBlocks.map((block) => (
                <ScheduleRow
                  key={block.id}
                  block={block}
                  seriesBlocks={series.get(scheduleSeriesKey(block)) ?? [block]}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
