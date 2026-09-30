import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || profile?.email || "there";

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised">
        {/* On phones the nav links drop to their own full-width row under the
            logo and log out button; from sm up everything sits on one line. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" className="font-display text-lg font-semibold text-ink">
            🎒 Syllabuddy
          </Link>
          <div className="flex items-center gap-3 text-sm sm:order-last">
            <span className="hidden text-muted sm:inline">Hi, {displayName}</span>
            <form action={signOut}>
              <Button variant="ghost" type="submit" className="!px-2 !py-1">
                Log out
              </Button>
            </form>
          </div>
          <nav className="flex w-full items-center gap-5 overflow-x-auto whitespace-nowrap text-sm sm:ml-auto sm:w-auto sm:gap-6">
            <Link href="/dashboard" className="text-ink-soft hover:text-ink">
              Dashboard
            </Link>
            <Link href="/assignments" className="text-ink-soft hover:text-ink">
              Assignments
            </Link>
            <Link href="/schedule" className="text-ink-soft hover:text-ink">
              Schedule
            </Link>
            <Link href="/terms" className="text-ink-soft hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
