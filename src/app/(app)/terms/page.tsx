import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTerm } from "@/app/actions/terms";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: terms } = await supabase
    .from("terms")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Terms</h1>
        <p className="mt-1 text-ink-soft">A term groups the courses you&apos;re taking together.</p>
      </div>

      {error && (
        <p className="rounded-card bg-highlight-soft px-3 py-2 text-sm text-highlight">{error}</p>
      )}

      <div className="flex flex-col gap-2">
        {(terms ?? []).map((term) => (
          <Link key={term.id} href={`/terms/${term.id}`}>
            <Card className="flex items-center justify-between hover:shadow-md">
              <span className="font-medium text-ink">{term.name}</span>
              <span className="text-sm text-muted">
                {[term.start_date, term.end_date].filter(Boolean).join(" – ") || "No dates set"}
              </span>
            </Card>
          </Link>
        ))}
        {(terms?.length ?? 0) === 0 && (
          <p className="text-sm text-ink-soft">No terms yet — create your first one below.</p>
        )}
      </div>

      <Card className="max-w-md">
        <h2 className="font-display text-lg font-semibold text-ink">New term</h2>
        <form action={createTerm} className="mt-4 flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Fall 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div>
              <Label htmlFor="end_date">End date</Label>
              <Input id="end_date" name="end_date" type="date" />
            </div>
          </div>
          <Button type="submit" className="mt-2 self-start">
            Create term
          </Button>
        </form>
      </Card>
    </div>
  );
}
