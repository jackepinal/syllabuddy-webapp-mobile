import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { SyllabusUpload } from "@/components/SyllabusUpload";
import { AssignmentStatusSelect } from "@/components/AssignmentStatusSelect";
import { discardSyllabus } from "@/app/actions/syllabus";
import { formatDueDate } from "@/lib/format";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (!course) notFound();

  const [{ data: term }, { data: syllabus }, { data: categories }, { data: assignments }] = await Promise.all([
    supabase.from("terms").select("id, name").eq("id", course.term_id).single(),
    supabase.from("syllabi").select("*").eq("course_id", courseId).maybeSingle(),
    supabase.from("grade_categories").select("*").eq("course_id", courseId).order("sort_order"),
    supabase
      .from("assignments")
      .select("*")
      .eq("course_id", courseId)
      .order("due_at", { ascending: true, nullsFirst: false }),
  ]);

  const upcoming = (assignments ?? []).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <div>
        {term && (
          <Link href={`/terms/${term.id}`} className="text-sm text-muted hover:text-ink-soft">
            ← {term.name}
          </Link>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-2xl text-white"
            style={{ backgroundColor: course.color }}
          >
            {course.icon}
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">{course.name}</h1>
            <p className="text-sm text-muted">
              {[course.code, course.instructor].filter(Boolean).join(" · ") || "No details yet"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-card bg-highlight-soft px-3 py-2 text-sm text-highlight">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Syllabus</h2>
          {!syllabus && (
            <>
              <p className="mt-2 text-sm text-ink-soft">
                Upload the syllabus and let Claude pull out grading and due dates.
              </p>
              <div className="mt-4">
                <SyllabusUpload courseId={courseId} />
              </div>
            </>
          )}
          {syllabus && syllabus.review_status === "pending" && (
            <>
              <p className="mt-2 text-sm text-ink-soft">
                Claude read your syllabus — take a look before it&apos;s saved.
              </p>
              <Link
                href={`/courses/${courseId}/syllabus/review`}
                className="mt-3 inline-flex rounded-card bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Review now
              </Link>
              <form action={discardSyllabus} className="mt-2">
                <input type="hidden" name="course_id" value={courseId} />
                <input type="hidden" name="syllabus_id" value={syllabus.id} />
                <button type="submit" className="text-xs text-muted hover:text-highlight">
                  Didn&apos;t come out right? Start over
                </button>
              </form>
            </>
          )}
          {syllabus && syllabus.review_status === "reviewed" && (
            <>
              <p className="mt-3 font-mono text-xs uppercase tracking-wide text-muted">
                ✓ Reviewed and saved
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-accent hover:underline">
                  Upload a new version
                </summary>
                <div className="mt-3">
                  <SyllabusUpload courseId={courseId} />
                  <form action={discardSyllabus} className="mt-2">
                    <input type="hidden" name="course_id" value={courseId} />
                    <input type="hidden" name="syllabus_id" value={syllabus.id} />
                    <button type="submit" className="text-xs text-muted hover:text-highlight">
                      Remove syllabus instead
                    </button>
                  </form>
                </div>
              </details>
            </>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Grades</h2>
          {categories && categories.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
              {categories.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="text-muted">{c.weight_pct}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              A live grade calculator built from this course&apos;s own weighting.
            </p>
          )}
          <p className="mt-3 font-mono text-xs uppercase tracking-wide text-muted">
            Calculator coming in Phase 3
          </p>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Assignments</h2>
          {upcoming.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2.5 text-sm">
              {upcoming.map((a) => (
                <li key={a.id} className="flex flex-col gap-1.5 border-b border-line pb-2.5 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-ink-soft">{a.title}</span>
                    <span className="flex-none text-muted">{formatDueDate(a.due_at)}</span>
                  </div>
                  <AssignmentStatusSelect
                    assignmentId={a.id}
                    courseId={courseId}
                    status={a.status}
                    dueAt={a.due_at}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              Every assignment for this course, with due dates and AI summaries.
            </p>
          )}
          <Link
            href="/assignments"
            className="mt-3 inline-block font-mono text-xs uppercase tracking-wide text-accent hover:underline"
          >
            See all assignments →
          </Link>
        </Card>
      </div>

      {upcoming.some((a) => a.ai_summary) && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">What&apos;s next</h2>
          <div className="mt-3 flex flex-col gap-3">
            {upcoming
              .filter((a) => a.ai_summary)
              .map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{a.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{a.ai_summary}</p>
                  </div>
                  <span className="flex-none text-xs text-muted">{formatDueDate(a.due_at)}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
