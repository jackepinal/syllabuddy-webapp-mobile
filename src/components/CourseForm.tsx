"use client";

import { useState } from "react";
import { createCourse } from "@/app/actions/courses";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { COURSE_COLORS, COURSE_ICONS } from "@/lib/types";

export function CourseForm({ termId }: { termId: string }) {
  const [color, setColor] = useState<string>(COURSE_COLORS[0]);
  const [icon, setIcon] = useState<string>(COURSE_ICONS[0]);

  return (
    <form action={createCourse} className="flex flex-col gap-4">
      <input type="hidden" name="term_id" value={termId} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Course name</Label>
          <Input id="name" name="name" required placeholder="Organic Chemistry" />
        </div>
        <div>
          <Label htmlFor="code">Course code</Label>
          <Input id="code" name="code" placeholder="CHEM 201" />
        </div>
      </div>

      <div>
        <Label htmlFor="instructor">Instructor</Label>
        <Input id="instructor" name="instructor" placeholder="Prof. Rivera" />
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

      <Button type="submit" className="mt-2 self-start">
        Add course
      </Button>
    </form>
  );
}
