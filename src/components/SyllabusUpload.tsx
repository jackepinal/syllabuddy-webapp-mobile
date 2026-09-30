"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadSyllabus } from "@/app/actions/syllabus";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { MAX_SYLLABUS_URLS } from "@/lib/claude/syllabus-extraction";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Reading syllabus… this can take up to a minute" : "Upload & extract"}
    </Button>
  );
}

export function SyllabusUpload({ courseId }: { courseId: string }) {
  const [mode, setMode] = useState<"file" | "paste" | "url">("file");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={uploadSyllabus} className="flex flex-col gap-4">
      <input type="hidden" name="course_id" value={courseId} />

      <div className="flex flex-wrap gap-2 font-mono text-xs uppercase tracking-wide text-muted">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={mode === "file" ? "text-accent underline" : "hover:text-ink-soft"}
        >
          Upload a file
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={mode === "paste" ? "text-accent underline" : "hover:text-ink-soft"}
        >
          Paste text instead
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={mode === "url" ? "text-accent underline" : "hover:text-ink-soft"}
        >
          Paste a link
        </button>
      </div>

      {mode === "file" && (
        <div>
          <Label htmlFor="file">Syllabus file (PDF, DOCX, or TXT — up to 15 MB)</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full rounded-card border border-line-strong bg-paper-raised px-3.5 py-2.5 text-sm text-ink file:mr-3 file:rounded-card file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:uppercase file:tracking-wide file:text-accent"
          />
        </div>
      )}

      {mode === "paste" && (
        <div>
          <Label htmlFor="pasted_text">Syllabus text</Label>
          <textarea
            id="pasted_text"
            name="pasted_text"
            rows={8}
            placeholder="Paste the full syllabus text here…"
            className="w-full rounded-card border border-line-strong bg-paper-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {mode === "url" && (
        <div>
          <Label htmlFor="urls">Course website link(s) — up to {MAX_SYLLABUS_URLS}</Label>
          <textarea
            id="urls"
            name="urls"
            rows={4}
            placeholder={"https://example.edu/courses/chem201\nhttps://example.edu/courses/chem201/syllabus.pdf"}
            className="w-full rounded-card border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="mt-1.5 text-xs text-muted">
            One link per line — the course homepage, and the exact syllabus/schedule page too if you
            already know it. Must be public (no login required). Pages that need JavaScript to load
            their content (many single-page apps) won&apos;t work — paste the text instead for those.
          </p>
        </div>
      )}

      <p className="text-xs text-muted">
        Claude reads it and pulls out grading categories, assignments, due dates, meeting times, and key
        policies. You&apos;ll review everything before it&apos;s saved to your course.
      </p>

      <SubmitButton />
    </form>
  );
}
