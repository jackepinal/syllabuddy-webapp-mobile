"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ScheduleEditForm } from "@/components/ScheduleEditForm";
import { deleteScheduleBlock } from "@/app/actions/schedule";
import { scheduleBlockDisplay, formatTime12h } from "@/lib/schedule";
import type { ScheduleBlockWithCourse } from "@/lib/types";

export function ScheduleRow({
  block,
  seriesBlocks,
}: {
  block: ScheduleBlockWithCourse;
  seriesBlocks: ScheduleBlockWithCourse[];
}) {
  const [editing, setEditing] = useState(false);
  const display = scheduleBlockDisplay(block);

  const info = (
    <>
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-lg text-white"
        style={{ backgroundColor: display.color }}
      >
        {display.icon}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{display.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {formatTime12h(block.start_time)}–{formatTime12h(block.end_time)}
          {block.location ? ` · ${block.location}` : ""}
        </p>
      </div>
    </>
  );

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {display.href ? (
          <Link href={display.href} className="flex min-w-0 flex-1 items-center gap-4">
            {info}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-4">{info}</div>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex-none text-xs text-muted hover:text-accent"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
        <form action={deleteScheduleBlock}>
          <input type="hidden" name="id" value={block.id} />
          <button type="submit" className="flex-none text-xs text-muted hover:text-highlight">
            Remove
          </button>
        </form>
      </div>
      {editing && (
        <div className="border-t border-line pt-3">
          <ScheduleEditForm block={block} seriesBlocks={seriesBlocks} />
        </div>
      )}
    </Card>
  );
}
