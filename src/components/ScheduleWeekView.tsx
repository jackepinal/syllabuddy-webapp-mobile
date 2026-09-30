"use client";

import Link from "next/link";
import { scheduleBlockDisplay, timeToMinutes, formatTime12h, DAY_LABELS } from "@/lib/schedule";
import type { ScheduleBlockWithCourse } from "@/lib/types";

const PX_PER_MIN = 1;

export function ScheduleWeekView({ blocks }: { blocks: ScheduleBlockWithCourse[] }) {
  const times = blocks.flatMap((b) => [timeToMinutes(b.start_time), timeToMinutes(b.end_time)]);
  const minMinutes = Math.min(7 * 60, ...(times.length ? times : [7 * 60]));
  const maxMinutes = Math.max(21 * 60, ...(times.length ? times : [21 * 60]));
  const startHour = Math.floor(minMinutes / 60);
  const endHour = Math.ceil(maxMinutes / 60);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * 60 * PX_PER_MIN;

  const byDay = Array.from({ length: 7 }, (_, day) => blocks.filter((b) => b.day_of_week === day));

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-paper-raised">
      <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,1fr)]">
        <div className="border-b border-line" />
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b border-l border-line px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted"
          >
            {label}
          </div>
        ))}

        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 -translate-y-1/2 px-1 text-right text-[0.65rem] text-muted"
              style={{ top: (h - startHour) * 60 * PX_PER_MIN }}
            >
              {formatTime12h(`${h}:00`)}
            </div>
          ))}
        </div>

        {byDay.map((dayBlocks, day) => (
          <div key={day} className="relative border-l border-line" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-line"
                style={{ top: (h - startHour) * 60 * PX_PER_MIN }}
              />
            ))}
            {dayBlocks.map((block) => {
              const display = scheduleBlockDisplay(block);
              const top = (timeToMinutes(block.start_time) - startHour * 60) * PX_PER_MIN;
              const height = Math.max(
                20,
                (timeToMinutes(block.end_time) - timeToMinutes(block.start_time)) * PX_PER_MIN
              );
              const label = `${display.name} · ${formatTime12h(block.start_time)}–${formatTime12h(block.end_time)}`;
              const chip = (
                <div
                  className="absolute inset-x-1 overflow-hidden rounded px-1.5 py-1 text-[0.7rem] font-medium leading-tight text-white"
                  style={{ top, height, backgroundColor: display.color }}
                  title={label}
                >
                  <p className="truncate">
                    {display.icon} {display.name}
                  </p>
                </div>
              );
              return display.href ? (
                <Link key={block.id} href={display.href} aria-label={label}>
                  {chip}
                </Link>
              ) : (
                <div key={block.id}>{chip}</div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
