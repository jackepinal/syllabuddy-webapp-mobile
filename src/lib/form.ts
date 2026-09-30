// Shared helper for server actions that receive a JSON-encoded array in a
// hidden form field (e.g. a list of {id, day_of_week} rows to reconcile).
export function parseJsonField<T>(formData: FormData, key: string): T[] {
  const raw = String(formData.get(key) ?? "[]");
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
