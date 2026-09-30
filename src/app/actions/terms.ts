"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTerm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "") || null;
  const endDate = String(formData.get("end_date") ?? "") || null;

  if (!name) {
    redirect("/terms?error=Give the term a name.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("terms")
    .insert({ user_id: user.id, name, start_date: startDate, end_date: endDate })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/terms?error=${encodeURIComponent(error?.message ?? "Could not create term.")}`);
  }

  revalidatePath("/terms");
  revalidatePath("/dashboard");
  redirect(`/terms/${data.id}`);
}
