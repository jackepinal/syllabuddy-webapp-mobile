import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SyllabusReviewForm } from "@/components/SyllabusReviewForm";
import type { ParsedSyllabusData } from "@/lib/types";

const EMPTY_PARSED: ParsedSyllabusData = {
  course_summary: null,
  grading_categories: [],
  assignments: [],
  schedule_blocks: [],
  key_policies: [],
};

export default async function SyllabusReviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, name").eq("id", courseId).single();
  if (!course) notFound();

  const { data: syllabus } = await supabase
    .from("syllabi")
    .select("*")
    .eq("course_id", courseId)
    .single();
  if (!syllabus) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/courses/${courseId}`} className="text-sm text-muted hover:text-ink-soft">
          ← {course.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Review your syllabus</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Here&apos;s what Claude found. Edit anything that&apos;s wrong, remove what doesn&apos;t belong, and
          save when it looks right.
        </p>
      </div>

      <SyllabusReviewForm
        courseId={courseId}
        syllabusId={syllabus.id}
        parsed={syllabus.parsed_json ?? EMPTY_PARSED}
      />
    </div>
  );
}
