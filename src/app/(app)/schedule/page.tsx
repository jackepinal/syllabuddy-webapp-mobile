import { createClient } from "@/lib/supabase/server";
import { ScheduleView } from "@/components/ScheduleView";
import type { ScheduleBlockWithCourse } from "@/lib/types";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: blocks }, { data: courses }] = await Promise.all([
    supabase
      .from("schedule_blocks")
      .select("*, course:courses(id, name, color, icon)")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase.from("courses").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Schedule</h1>
        <p className="mt-1 text-ink-soft">Your weekly classes and extracurriculars, all in one place.</p>
      </div>

      {error && (
        <p className="rounded-card bg-highlight-soft px-3 py-2 text-sm text-highlight">{error}</p>
      )}

      <ScheduleView blocks={(blocks ?? []) as ScheduleBlockWithCourse[]} courses={courses ?? []} />
    </div>
  );
}
