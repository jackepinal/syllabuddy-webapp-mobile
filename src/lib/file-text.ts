import mammoth from "mammoth";

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_SYLLABUS_BYTES = 15 * 1024 * 1024; // 15 MB, matches the storage bucket limit

// Turns an uploaded .docx or .txt file into plain text so it can be sent to
// Claude as text. PDFs are handled separately (sent directly as a document,
// since Claude can read them natively).
export async function extractPlainText(file: File): Promise<string> {
  if (file.type === "text/plain") {
    return await file.text();
  }

  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  throw new Error(`Unsupported file type for text extraction: ${file.type}`);
}
