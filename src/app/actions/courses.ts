"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCourse(formData: FormData) {
  const termId = String(formData.get("term_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const instructor = String(formData.get("instructor") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "#2c4a7c");
  const icon = String(formData.get("icon") ?? "📘");

  if (!termId) {
    redirect("/terms?error=Missing term.");
  }
  if (!name) {
    redirect(`/terms/${termId}?error=Give the course a name.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    term_id: termId,
    name,
    code,
    instructor,
    color,
    icon,
  });

  if (error) {
    redirect(`/terms/${termId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/terms/${termId}`);
  revalidatePath("/dashboard");
  redirect(`/terms/${termId}`);
}
