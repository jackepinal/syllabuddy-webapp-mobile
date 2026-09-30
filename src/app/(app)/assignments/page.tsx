import { createClient } from "@/lib/supabase/server";
import { AssignmentsList } from "@/components/AssignmentsList";
import type { AssignmentWithCourse } from "@/lib/types";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: assignments }, { data: courses }] = await Promise.all([
    supabase
      .from("assignments")
      .select("*, course:courses(id, name, color, icon)")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("courses").select("id, name, color, icon").order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Assignments</h1>
        <p className="mt-1 text-ink-soft">Every assignment across every class, in one scroll.</p>
      </div>

      {error && (
        <p className="rounded-card bg-highlight-soft px-3 py-2 text-sm text-highlight">{error}</p>
      )}

      {(courses?.length ?? 0) === 0 ? (
        <p className="text-sm text-ink-soft">
          Add a course first, then come back here to add or track its assignments.
        </p>
      ) : (
        <AssignmentsList
          assignments={(assignments ?? []) as AssignmentWithCourse[]}
          courses={courses ?? []}
        />
      )}
    </div>
  );
}
