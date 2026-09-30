import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: terms }, { data: courses }] = await Promise.all([
    supabase.from("terms").select("*").order("created_at", { ascending: false }),
    supabase.from("courses").select("*").order("created_at", { ascending: true }),
  ]);

  const hasTerms = (terms?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-ink-soft">Everything school, in one place.</p>
      </div>

      {!hasTerms ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-ink-soft">
            You haven&apos;t added a term yet. Start by creating one for this semester or quarter.
          </p>
          <Link href="/terms">
            <Button>Create your first term</Button>
          </Link>
        </Card>
      ) : (
        <section>
          <h2 className="font-display text-xl font-semibold text-ink">Your courses</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(courses ?? []).length === 0 && (
              <Card className="text-ink-soft sm:col-span-2 lg:col-span-3">
                No courses yet.{" "}
                <Link href="/terms" className="font-medium text-accent">
                  Add one to a term
                </Link>
                .
              </Card>
            )}
            {(courses ?? []).map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-md">
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-lg text-white"
                    style={{ backgroundColor: course.color }}
                  >
                    {course.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{course.name}</p>
                    {course.code && <p className="truncate text-xs text-muted">{course.code}</p>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Terms</h2>
          <Link href="/terms" className="text-sm font-medium text-accent">
            Manage terms →
          </Link>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {(terms ?? []).map((term) => (
            <Link key={term.id} href={`/terms/${term.id}`}>
              <Card className="flex items-center justify-between hover:shadow-md">
                <span className="font-medium text-ink">{term.name}</span>
                <span className="text-sm text-muted">
                  {(courses ?? []).filter((c) => c.term_id === term.id).length} courses
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
