"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractSyllabusData, MAX_SYLLABUS_URLS, type SyllabusSource } from "@/lib/claude/syllabus-extraction";
import { ACCEPTED_MIME_TYPES, MAX_SYLLABUS_BYTES, extractPlainText } from "@/lib/file-text";
import type { ParsedAssignment, ParsedGradingCategory, ParsedScheduleBlock } from "@/lib/types";
import { combineDateTime } from "@/lib/format";
import { parseJsonField } from "@/lib/form";

function fail(courseId: string, message: string): never {
  redirect(`/courses/${courseId}?error=${encodeURIComponent(message)}`);
}

export async function uploadSyllabus(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  if (!courseId) redirect("/dashboard");

  const file = formData.get("file");
  const pastedText = String(formData.get("pasted_text") ?? "").trim();
  const urlsRaw = String(formData.get("urls") ?? "").trim();
  const hasFile = file instanceof File && file.size > 0;
  const urls = parseSyllabusUrls(urlsRaw);

  if (urlsRaw && urls.length === 0) {
    fail(courseId, "That doesn't look like a valid link — make sure it starts with http:// or https://.");
  }
  if (!hasFile && !pastedText && urls.length === 0) {
    fail(courseId, "Upload a file, paste the syllabus text, or paste a link to it.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS also enforces this, but we need the course to exist to build the
  // storage path and to give a friendlier error than a raw insert failure.
  const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).single();
  if (!course) fail(courseId, "Course not found.");

  // Validate up front, *outside* the try/catch below — calling fail() (which
  // throws Next.js's internal redirect signal) from inside a try block would
  // otherwise get swallowed by its own catch and turned into a wrong "couldn't
  // read that file" message instead of actually redirecting.
  let uploadedFile: File | null = null;
  if (hasFile) {
    uploadedFile = file as File;
    if (!ACCEPTED_MIME_TYPES.includes(uploadedFile.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
      fail(courseId, "Please upload a PDF, DOCX, or plain text file.");
    }
    if (uploadedFile.size > MAX_SYLLABUS_BYTES) {
      fail(courseId, "That file is larger than 15 MB — try a smaller export.");
    }
  }

  let source: SyllabusSource;
  let fileUrl: string | null = null;

  try {
    if (uploadedFile) {
      const path = `${user.id}/${courseId}/${Date.now()}-${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("syllabi")
        .upload(path, uploadedFile, { contentType: uploadedFile.type, upsert: false });
      if (uploadError) throw new Error(`Couldn't save the file: ${uploadError.message}`);
      fileUrl = path;

      if (uploadedFile.type === "application/pdf") {
        const buffer = Buffer.from(await uploadedFile.arrayBuffer());
        source = { kind: "pdf", base64: buffer.toString("base64") };
      } else {
        const text = await extractPlainText(uploadedFile);
        source = { kind: "text", text };
      }
    } else if (urls.length > 0) {
      source = { kind: "urls", urls };
    } else {
      source = { kind: "text", text: pastedText };
    }
  } catch (err) {
    fail(courseId, err instanceof Error ? err.message : "Couldn't read that file.");
  }

  let extraction: Awaited<ReturnType<typeof extractSyllabusData>>;
  try {
    extraction = await extractSyllabusData(source);
  } catch (err) {
    fail(
      courseId,
      err instanceof Error
        ? `Claude couldn't read that syllabus: ${err.message}`
        : "Claude couldn't read that syllabus. Try again."
    );
  }

  // One syllabus per course for now: replace the existing row (if any)
  // rather than accumulating old uploads.
  const { data: existing } = await supabase
    .from("syllabi")
    .select("id")
    .eq("course_id", courseId)
    .maybeSingle();

  const row = {
    course_id: courseId,
    file_url: fileUrl,
    raw_text: extraction.rawText,
    parsed_json: extraction.parsed,
    review_status: "pending" as const,
  };

  const { error: dbError } = existing
    ? await supabase.from("syllabi").update(row).eq("id", existing.id)
    : await supabase.from("syllabi").insert(row);

  if (dbError) fail(courseId, dbError.message);

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}/syllabus/review`);
}

export async function discardSyllabus(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  const syllabusId = String(formData.get("syllabus_id") ?? "");
  if (!courseId || !syllabusId) redirect("/dashboard");

  const supabase = await createClient();

  const { data: syllabus } = await supabase
    .from("syllabi")
    .select("file_url")
    .eq("id", syllabusId)
    .single();

  if (syllabus?.file_url) {
    await supabase.storage.from("syllabi").remove([syllabus.file_url]);
  }
  await supabase.from("syllabi").delete().eq("id", syllabusId);

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

type SubmittedCategory = ParsedGradingCategory & { include?: boolean };
type SubmittedAssignment = ParsedAssignment & { include?: boolean; category_index: number | null };
type SubmittedScheduleBlock = ParsedScheduleBlock & { include?: boolean };

export async function commitSyllabusReview(formData: FormData) {
  const courseId = String(formData.get("course_id") ?? "");
  const syllabusId = String(formData.get("syllabus_id") ?? "");
  if (!courseId || !syllabusId) redirect("/dashboard");

  const categories = parseJsonField<SubmittedCategory>(formData, "categories_json").filter(
    (c) => c.include !== false
  );
  const assignments = parseJsonField<SubmittedAssignment>(formData, "assignments_json").filter(
    (a) => a.include !== false
  );
  const scheduleBlocks = parseJsonField<SubmittedScheduleBlock>(formData, "schedule_json").filter(
    (s) => s.include !== false
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Re-reviewing replaces whatever was committed last time, so nothing
  // duplicates.
  await supabase.from("assignments").delete().eq("course_id", courseId);
  await supabase.from("grade_categories").delete().eq("course_id", courseId);
  await supabase.from("schedule_blocks").delete().eq("course_id", courseId);

  let categoryIds: (string | null)[] = [];
  if (categories.length > 0) {
    const { data: insertedCategories, error: categoriesError } = await supabase
      .from("grade_categories")
      .insert(
        categories.map((c, index) => ({
          course_id: courseId,
          name: c.name,
          weight_pct: c.weight_pct,
          drop_lowest_n: c.drop_lowest_n,
          sort_order: index,
        }))
      )
      .select("id");

    if (categoriesError) fail(courseId, categoriesError.message);
    categoryIds = (insertedCategories ?? []).map((row) => row.id);
  }

  if (assignments.length > 0) {
    const { error: assignmentsError } = await supabase.from("assignments").insert(
      assignments.map((a) => ({
        course_id: courseId,
        category_id:
          a.category_index !== null && a.category_index >= 0 ? categoryIds[a.category_index] ?? null : null,
        title: a.title,
        due_at: combineDateTime(a.due_date, a.due_time),
        points_possible: a.points_possible,
        description_raw: a.description,
        ai_summary: a.ai_summary,
        status: "todo" as const,
      }))
    );
    if (assignmentsError) fail(courseId, assignmentsError.message);
  }

  if (scheduleBlocks.length > 0) {
    const rows = scheduleBlocks.flatMap((block) =>
      block.days.map((day) => ({
        course_id: courseId,
        user_id: user.id,
        day_of_week: day,
        start_time: block.start_time,
        end_time: block.end_time,
        location: block.location,
      }))
    );
    if (rows.length > 0) {
      const { error: scheduleError } = await supabase.from("schedule_blocks").insert(rows);
      if (scheduleError) fail(courseId, scheduleError.message);
    }
  }

  const { error: syllabusError } = await supabase
    .from("syllabi")
    .update({ review_status: "reviewed" })
    .eq("id", syllabusId);
  if (syllabusError) fail(courseId, syllabusError.message);

  revalidatePath(`/courses/${courseId}`);
  redirect(`/courses/${courseId}`);
}

// Splits the "paste a link" textarea (one URL per line, though any
// whitespace works) into a deduped list of valid http(s) links, dropping
// anything malformed rather than failing the whole submission on one typo.
function parseSyllabusUrls(raw: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of raw.split(/\s+/)) {
    if (!line) continue;
    try {
      const parsed = new URL(line);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      urls.push(normalized);
    } catch {
      // Not a valid URL — skip it rather than failing the whole submission.
    }
  }
  return urls.slice(0, MAX_SYLLABUS_URLS);
}
