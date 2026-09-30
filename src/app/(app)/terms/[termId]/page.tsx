import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "@/components/CourseForm";
import { Card } from "@/components/ui/Card";

export default async function TermDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ termId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { termId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: term } = await supabase.from("terms").select("*").eq("id", termId).single();
  if (!term) notFound();

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("term_id", termId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/terms" className="text-sm text-muted hover:text-ink-soft">
          ← All terms
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{term.name}</h1>
      </div>

      {error && (
        <p className="rounded-card bg-highlight-soft px-3 py-2 text-sm text-highlight">{error}</p>
      )}

      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Courses</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(courses ?? []).map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="flex items-center gap-3 hover:shadow-md">
                <span
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-lg text-white"
                  style={{ backgroundColor: course.color }}
                >
                  {course.icon}
                </span>
                <div>
                  <p className="font-medium text-ink">{course.name}</p>
                  {course.code && <p className="text-xs text-muted">{course.code}</p>}
                </div>
              </Card>
            </Link>
          ))}
          {(courses?.length ?? 0) === 0 && (
            <p className="text-sm text-ink-soft">No courses in this term yet — add one below.</p>
          )}
        </div>
      </section>

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Add a course</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Syllabus upload comes in the next phase — for now, add the basics.
        </p>
        <div className="mt-4">
          <CourseForm termId={termId} />
        </div>
      </Card>
    </div>
  );
}
