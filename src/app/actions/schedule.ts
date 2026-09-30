"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseJsonField } from "@/lib/form";

type ClassBase = { course_id: string; user_id: string };
type ActivityBase = { title: string; color: string; icon: string; user_id: string };

// A class block borrows its display from the linked course; an activity
// carries its own name/color/icon. Redirects (via the `fail` it calls) if
// the form is missing what that kind needs.
function readSeriesBase(formData: FormData, userId: string, fail: (message: string) => never): ClassBase | ActivityBase {
  const kind = String(formData.get("kind") ?? "class");
  if (kind === "class") {
    const courseId = String(formData.get("course_id") ?? "");
    if (!courseId) fail("Pick a class.");
    return { course_id: courseId, user_id: userId };
  }
  const title = String(formData.get("title") ?? "").trim();
  const color = String(formData.get("color") ?? "#2c4a7c");
  const icon = String(formData.get("icon") ?? "⭐");
  if (!title) fail("Give it a name.");
  return { title, color, icon, user_id: userId };
}

// One weekly time block can repeat on several days at once (e.g. a class
// that meets Mon/Wed/Fri) — one row gets inserted per day checked.
export async function createScheduleBlock(formData: FormData) {
  const days = formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;

  if (days.length === 0) redirect("/schedule?error=Pick at least one day.");
  if (!startTime || !endTime) redirect("/schedule?error=Give it a start and end time.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fail = (message: string): never => redirect(`/schedule?error=${encodeURIComponent(message)}`);
  const base = readSeriesBase(formData, user.id, fail);

  const rows = days.map((day) => ({
    ...base,
    day_of_week: day,
    start_time: startTime,
    end_time: endTime,
    location,
  }));

  const { error } = await supabase.from("schedule_blocks").insert(rows);
  if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/schedule");
  redirect("/schedule");
}

// Edits every day of one class/activity together — not just the single row
// the edit form was opened from. `existing_json` carries every row currently
// in the series ({id, day_of_week}); the submitted `days` is compared
// against it to delete days that got unchecked, insert newly-checked days,
// and update the days that stayed, all with the same time/location (and, for
// an activity, the same name/color/icon).
export async function updateScheduleSeries(formData: FormData) {
  const existing = parseJsonField<{ id: string; day_of_week: number }>(formData, "existing_json");
  const days = formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const startTime = String(formData.get("start_time") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || null;

  if (days.length === 0) redirect("/schedule?error=Pick at least one day.");
  if (!startTime || !endTime) redirect("/schedule?error=Give it a start and end time.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fail = (message: string): never => redirect(`/schedule?error=${encodeURIComponent(message)}`);
  const base = readSeriesBase(formData, user.id, fail);

  const keepDays = new Set(days);
  const existingDays = new Set(existing.map((e) => e.day_of_week));
  const toDelete = existing.filter((e) => !keepDays.has(e.day_of_week)).map((e) => e.id);
  const toUpdate = existing.filter((e) => keepDays.has(e.day_of_week));
  const toInsertDays = days.filter((d) => !existingDays.has(d));

  if (toDelete.length > 0) {
    const { error } = await supabase.from("schedule_blocks").delete().in("id", toDelete);
    if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);
  }

  for (const row of toUpdate) {
    const { error } = await supabase
      .from("schedule_blocks")
      .update({ ...base, start_time: startTime, end_time: endTime, location })
      .eq("id", row.id);
    if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);
  }

  if (toInsertDays.length > 0) {
    const rows = toInsertDays.map((day) => ({
      ...base,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      location,
    }));
    const { error } = await supabase.from("schedule_blocks").insert(rows);
    if (error) redirect(`/schedule?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/schedule");
  redirect("/schedule");
}

export async function deleteScheduleBlock(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/schedule");

  const supabase = await createClient();
  await supabase.from("schedule_blocks").delete().eq("id", id);

  revalidatePath("/schedule");
  redirect("/schedule");
}
