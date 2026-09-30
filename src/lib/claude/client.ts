import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

// Lazily constructed so the app can still boot (e.g. during `next build`)
// without ANTHROPIC_API_KEY set; the error only surfaces when a syllabus is
// actually uploaded.
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.local.example)."
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const SYLLABUS_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
