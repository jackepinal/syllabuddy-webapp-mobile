import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, SYLLABUS_MODEL } from "./client";
import type { ParsedSyllabusData } from "@/lib/types";

const TOOL_NAME = "record_syllabus_data";

// A single tool with a strict-ish JSON schema keeps Claude's answer
// structured and easy to trust into the review form, instead of parsing
// free-form prose.
const EXTRACTION_TOOL: Anthropic.Messages.Tool = {
  name: TOOL_NAME,
  description:
    "Record everything extracted from this course syllabus so a student can review it before it's saved.",
  input_schema: {
    type: "object",
    properties: {
      course_summary: {
        type: ["string", "null"],
        description:
          "A plain-English, 2-3 sentence overview of what this course covers and how it's structured. Null if the document isn't actually a syllabus.",
      },
      grading_categories: {
        type: "array",
        description:
          "The grading breakdown (e.g. Homework 20%, Midterm 30%, Final 30%, Participation 20%). Omit if the syllabus states no weighting scheme.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            weight_pct: {
              type: "number",
              description: "Weight as a percent of the final grade, e.g. 20 for 20%.",
            },
            drop_lowest_n: {
              type: "integer",
              description: "How many of the lowest scores in this category are dropped, if stated. 0 if not mentioned.",
            },
          },
          required: ["name", "weight_pct", "drop_lowest_n"],
        },
      },
      assignments: {
        type: "array",
        description: "Every graded item: homework, quizzes, exams, papers, projects, labs, participation checkpoints, etc.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            category_name: {
              type: ["string", "null"],
              description: "Must exactly match one of the names in grading_categories, or null if it doesn't map to a category.",
            },
            due_date: {
              type: ["string", "null"],
              description:
                "ISO date YYYY-MM-DD if a specific calendar date can be determined (use the syllabus's own stated term/semester dates to resolve relative references like 'Week 3 Friday'). Null if no specific date can be pinned down.",
            },
            due_time: {
              type: ["string", "null"],
              description: "24-hour HH:MM if a specific time is stated, else null.",
            },
            points_possible: { type: ["number", "null"] },
            description: {
              type: ["string", "null"],
              description: "A short excerpt or paraphrase of the syllabus's own description of this item.",
            },
            ai_summary: {
              type: ["string", "null"],
              description: "One plain-English sentence explaining what the student actually needs to do.",
            },
          },
          required: ["title", "category_name", "due_date", "due_time", "points_possible", "description", "ai_summary"],
        },
      },
      schedule_blocks: {
        type: "array",
        description: "Recurring class meeting times (lecture, lab, discussion section).",
        items: {
          type: "object",
          properties: {
            days: {
              type: "array",
              items: { type: "integer", minimum: 0, maximum: 6 },
              description: "0 = Sunday, 1 = Monday, ... 6 = Saturday. List every day this particular block meets.",
            },
            start_time: { type: "string", description: "24-hour HH:MM" },
            end_time: { type: "string", description: "24-hour HH:MM" },
            location: { type: ["string", "null"] },
          },
          required: ["days", "start_time", "end_time", "location"],
        },
      },
      key_policies: {
        type: "array",
        description:
          "Important policies a student should know at a glance: late work, attendance, academic integrity, regrades, AI/collaboration policy, etc. 3-6 items is typical.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string", description: "1-2 plain-English sentences." },
          },
          required: ["title", "summary"],
        },
      },
    },
    required: ["course_summary", "grading_categories", "assignments", "schedule_blocks", "key_policies"],
  },
};

const SYSTEM_PROMPT = `You are helping a student make sense of a course syllabus. You will be shown the \
syllabus (as a document or as raw text). Read it carefully and call the ${TOOL_NAME} tool exactly once \
with everything you can find. Rules:
- Only report what the syllabus actually says. Do not invent assignments, dates, or policies.
- Resolve relative dates ("the Friday of week 4", "one week after the midterm") into real calendar \
dates whenever the syllabus gives you enough information (a term start date, a course calendar, etc). \
If you genuinely can't pin down a date, leave due_date null rather than guessing.
- Today's date is not relevant to this task; work entirely from dates found in the document.
- If the uploaded document is not actually a syllabus, still call the tool, leave the arrays empty, \
and set course_summary to null.`;

export type SyllabusSource =
  | { kind: "pdf"; base64: string }
  | { kind: "text"; text: string }
  | { kind: "urls"; urls: string[] };

export { MAX_SYLLABUS_URLS } from "@/lib/syllabus-limits";

// The web fetch tool the "paste a link" path uses to retrieve a public
// course page (or a PDF it links to) itself, instead of the student
// uploading a file. Basic (non-dynamic-filtering) version, for the widest
// model compatibility — see README for the newer `_2026...` variants if the
// project's model gets upgraded past what those require.
//
// The installed Anthropic SDK predates typed support for this tool, so it's
// built as a plain object and cast where it's used — the request body sent
// over the wire is correct either way; only compile-time typing is affected.
const WEB_FETCH_TOOL = {
  type: "web_fetch_20250910",
  name: "web_fetch",
  max_uses: 6,
  max_content_tokens: 40000,
};

const FETCH_SYSTEM_PROMPT = `A student has pointed you at their course website to find the syllabus. \
Use the web_fetch tool to fetch every URL you're given. If you're only given one general course \
homepage and its fetched content contains a clear link to a syllabus, schedule, or grading-policy page, \
fetch that page too — but only follow a link that literally appears in content you've already fetched; \
never guess or invent a URL. Once you've gathered everything relevant (or confirmed nothing more is \
reachable), stop and briefly describe in a sentence or two what you found. Do not attempt to produce \
structured data yourself — that happens in a separate step.`;

export async function extractSyllabusData(source: SyllabusSource): Promise<{
  parsed: ParsedSyllabusData;
  rawText: string | null;
}> {
  const anthropic = getAnthropicClient();

  if (source.kind === "urls") {
    return extractFromUrls(anthropic, source.urls);
  }

  const content: Anthropic.Messages.MessageParam["content"] =
    source.kind === "pdf"
      ? [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: source.base64 },
          },
          {
            type: "text",
            text: "Here is the syllabus. Extract everything using the tool.",
          },
        ]
      : [
          {
            type: "text",
            text: `Here is the syllabus text:\n\n<syllabus>\n${source.text}\n</syllabus>\n\nExtract everything using the tool.`,
          },
        ];

  console.log(
    `[syllabus-extraction] sending ${source.kind} source to ${SYLLABUS_MODEL}` +
      (source.kind === "pdf"
        ? ` (${Math.round((source.base64.length * 3) / 4 / 1024)} KB decoded)`
        : ` (${source.text.length} chars)`)
  );

  const message = await anthropic.messages.create({
    model: SYLLABUS_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content }],
  });

  console.log(`[syllabus-extraction] stop_reason=${message.stop_reason} blocks=${message.content.map((b) => b.type).join(",")}`);

  const toolUse = message.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME
  );

  if (!toolUse) {
    const textBlock = message.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    console.error("[syllabus-extraction] no tool_use block. Claude said:", textBlock?.text);
    throw new Error("Claude didn't return structured syllabus data. Try uploading again.");
  }

  console.log("[syllabus-extraction] raw tool input:", JSON.stringify(toolUse.input));

  const parsed = normalizeParsedData(toolUse.input as Record<string, unknown>);
  const rawText = source.kind === "text" ? source.text : null;

  if (
    parsed.grading_categories.length === 0 &&
    parsed.assignments.length === 0 &&
    parsed.schedule_blocks.length === 0
  ) {
    console.warn(
      "[syllabus-extraction] extraction came back completely empty — Claude likely couldn't read the " +
        "document's content (corrupt/blank upload) or judged it wasn't a syllabus. course_summary:",
      parsed.course_summary
    );
  }

  return { parsed, rawText };
}

// The "paste a link" path. A forced tool_choice (used for the pdf/text path
// above) can't also let Claude freely call web_fetch, so this runs two
// calls instead of one: the first lets Claude fetch the page(s) with
// tool_choice "auto"; the second replays that same conversation with the
// extraction tool forced, so Claude reads what it already fetched and turns
// it into structured data — same reliability guarantee as every other path.
async function extractFromUrls(
  anthropic: ReturnType<typeof getAnthropicClient>,
  urls: string[]
): Promise<{ parsed: ParsedSyllabusData; rawText: string | null }> {
  console.log(`[syllabus-extraction] fetching ${urls.length} URL(s): ${urls.join(", ")}`);

  const startMessage = `Find and fetch this course's syllabus content. Start with:\n${urls
    .map((u) => `- ${u}`)
    .join("\n")}`;

  const fetchMessage = await anthropic.messages.create({
    model: SYLLABUS_MODEL,
    max_tokens: 4000,
    system: FETCH_SYSTEM_PROMPT,
    tools: [WEB_FETCH_TOOL as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: startMessage }],
  });

  console.log(
    `[syllabus-extraction] fetch stop_reason=${fetchMessage.stop_reason} blocks=${fetchMessage.content
      .map((b) => b.type)
      .join(",")}`
  );

  const fetchedAny = fetchMessage.content.some(
    (b) => (b as unknown as Record<string, unknown>).type === "web_fetch_tool_result"
  );
  if (!fetchedAny) {
    throw new Error("nothing could be fetched from that link — double-check it's public and try again.");
  }

  const extractionMessage = await anthropic.messages.create({
    model: SYLLABUS_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [WEB_FETCH_TOOL as unknown as Anthropic.Messages.Tool, EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      { role: "user", content: startMessage },
      {
        role: "assistant",
        content: fetchMessage.content as unknown as Anthropic.Messages.MessageParam["content"],
      },
      {
        role: "user",
        content: "Extract everything from the syllabus content you just fetched, using the tool.",
      },
    ],
  });

  console.log(
    `[syllabus-extraction] extraction stop_reason=${extractionMessage.stop_reason} blocks=${extractionMessage.content
      .map((b) => b.type)
      .join(",")}`
  );

  const toolUse = extractionMessage.content.find(
    (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use" && block.name === TOOL_NAME
  );

  if (!toolUse) {
    const textBlock = extractionMessage.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    console.error("[syllabus-extraction] no tool_use block after fetch. Claude said:", textBlock?.text);
    throw new Error("Claude fetched the page but couldn't turn it into structured data. Try again, or paste the text directly.");
  }

  const parsed = normalizeParsedData(toolUse.input as Record<string, unknown>);
  const rawText = extractFetchedText(fetchMessage.content);

  if (
    parsed.grading_categories.length === 0 &&
    parsed.assignments.length === 0 &&
    parsed.schedule_blocks.length === 0
  ) {
    console.warn(
      "[syllabus-extraction] extraction from URL(s) came back completely empty. course_summary:",
      parsed.course_summary
    );
  }

  return { parsed, rawText };
}

// Pulls the plain-text document content out of every web_fetch_tool_result
// block, purely so it can be stored in syllabi.raw_text like every other
// upload path — not used for extraction itself (Claude already read it).
function extractFetchedText(blocks: Anthropic.Messages.ContentBlock[]): string | null {
  const chunks: string[] = [];
  for (const raw of blocks) {
    const block = raw as unknown as Record<string, unknown>;
    if (block.type !== "web_fetch_tool_result") continue;
    const result = block.content as Record<string, unknown> | undefined;
    const doc = result?.content as Record<string, unknown> | undefined;
    const docSource = doc?.source as Record<string, unknown> | undefined;
    if (doc?.type === "document" && docSource?.type === "text" && typeof docSource.data === "string") {
      const url = typeof result?.url === "string" ? result.url : "unknown URL";
      chunks.push(`--- ${url} ---\n${docSource.data}`);
    }
  }
  return chunks.length > 0 ? chunks.join("\n\n") : null;
}

// Defensive normalization in case Claude omits an optional array/field
// despite the schema — keeps downstream code from having to null-check
// everywhere.
function normalizeParsedData(input: Record<string, unknown>): ParsedSyllabusData {
  const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  return {
    course_summary: typeof input.course_summary === "string" ? input.course_summary : null,
    grading_categories: asArray(input.grading_categories).map((c) => {
      const cat = c as Record<string, unknown>;
      return {
        name: String(cat.name ?? "Untitled category"),
        weight_pct: Number(cat.weight_pct ?? 0),
        drop_lowest_n: Number(cat.drop_lowest_n ?? 0),
      };
    }),
    assignments: asArray(input.assignments).map((a) => {
      const item = a as Record<string, unknown>;
      return {
        title: String(item.title ?? "Untitled assignment"),
        category_name: typeof item.category_name === "string" ? item.category_name : null,
        due_date: typeof item.due_date === "string" ? item.due_date : null,
        due_time: typeof item.due_time === "string" ? item.due_time : null,
        points_possible: typeof item.points_possible === "number" ? item.points_possible : null,
        description: typeof item.description === "string" ? item.description : null,
        ai_summary: typeof item.ai_summary === "string" ? item.ai_summary : null,
      };
    }),
    schedule_blocks: asArray(input.schedule_blocks).map((s) => {
      const block = s as Record<string, unknown>;
      return {
        days: asArray<number>(block.days).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        start_time: String(block.start_time ?? "00:00"),
        end_time: String(block.end_time ?? "00:00"),
        location: typeof block.location === "string" ? block.location : null,
      };
    }),
    key_policies: asArray(input.key_policies).map((p) => {
      const policy = p as Record<string, unknown>;
      return {
        title: String(policy.title ?? "Policy"),
        summary: String(policy.summary ?? ""),
      };
    }),
  };
}
