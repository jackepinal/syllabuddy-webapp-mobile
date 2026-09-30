"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentStatus } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/status";
import { combineDateTime } from "@/lib/format";

export async function updateAssignmentStatus(
  assignmentId: string,
  status: AssignmentStatus,
  courseId?: string
): Promise<{ error?: string }> {
  if (!STATUS_ORDER.includes(status)) {
    return { error: "Not a valid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ status })
    .eq("id", assignmentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/assignments");
  if (courseId) revalidatePath(`/courses/${courseId}`);

  return {};
}

function readAssignmentFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const dueTime = String(formData.get("due_time") ?? "").trim() || null;
  const pointsRaw = String(formData.get("points_possible") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  return {
    title,
    due_at: combineDateTime(dueDate, dueTime),
    points_possible: pointsRaw ? Number(pointsRaw) : null,
    description_raw: description,
  };
}

// A student adding their own assignment by hand — not from a syllabus
// upload. Always lands with status "todo".
export async function createAssignment(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/assignments") || "/assignments";
  const fields = readAssignmentFields(formData);

  if (!courseId) redirect(`${returnTo}?error=Pick a class for this assignment.`);
  if (!fields.title) redirect(`${returnTo}?error=Give the assignment a title.`);

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    course_id: courseId,
    ...fields,
    status: "todo" as const,
  });

  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/assignments");
  revalidatePath(`/courses/${courseId}`);
  redirect(returnTo);
}

// Edits an existing assignment — title, due date, points, description. Also
// how a student fills in a due date syllabus upload couldn't find.
export async function updateAssignment(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/assignments") || "/assignments";
  const fields = readAssignmentFields(formData);

  if (!assignmentId) redirect(returnTo);
  if (!fields.title) redirect(`${returnTo}?error=Give the assignment a title.`);

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").update(fields).eq("id", assignmentId);

  if (error) redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/assignments");
  if (courseId) revalidatePath(`/courses/${courseId}`);
  redirect(returnTo);
}
