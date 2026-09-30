"use client";

import { createAssignment, updateAssignment } from "@/app/actions/assignments";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { splitDateTime } from "@/lib/format";
import type { Assignment, Course } from "@/lib/types";

type CourseLite = Pick<Course, "id" | "name">;

export function AssignmentForm({
  courses,
  assignment,
  courseId,
  returnTo = "/assignments",
}: {
  // Class picker — only shown (and needed) when adding a brand-new assignment.
  courses?: CourseLite[];
  // Present when editing an existing assignment; absent when adding one.
  assignment?: Assignment;
  courseId?: string;
  returnTo?: string;
}) {
  const isEdit = Boolean(assignment);
  const { date, time } = splitDateTime(assignment?.due_at ?? null);

  return (
    <form action={isEdit ? updateAssignment : createAssignment} className="flex flex-col gap-3">
      <input type="hidden" name="return_to" value={returnTo} />
      {isEdit && <input type="hidden" name="assignment_id" value={assignment!.id} />}
      {isEdit && <input type="hidden" name="course_id" value={courseId ?? assignment!.course_id} />}

      {!isEdit && courses && (
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
      )}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={assignment?.title ?? ""}
          placeholder="Reading response 3"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={date} />
        </div>
        <div>
          <Label htmlFor="due_time">Due time</Label>
          <Input id="due_time" name="due_time" type="time" defaultValue={time} />
        </div>
      </div>

      <div>
        <Label htmlFor="points_possible">Points possible</Label>
        <Input
          id="points_possible"
          name="points_possible"
          type="number"
          min="0"
          step="any"
          defaultValue={assignment?.points_possible ?? ""}
          placeholder="Optional"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={assignment?.description_raw ?? ""}
          placeholder="Optional notes about what this assignment involves"
          className="w-full rounded-card border border-line-strong bg-paper-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <Button type="submit" className="self-start">
        {isEdit ? "Save changes" : "Add assignment"}
      </Button>
    </form>
  );
}
