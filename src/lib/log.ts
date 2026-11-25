import "server-only";

type Fields = Record<string, string | number | boolean | null | undefined>;

/**
 * One JSON line per failure, readable in Vercel's runtime logs (filter by `"event"`).
 * Users still get friendly messages; this keeps the real cause for operators.
 * Pass only identifiers and codes in `fields` — never API keys, form bodies or emails.
 */
export function logError(event: string, error: unknown, fields: Fields = {}) {
  const cause = error && typeof error === "object"
    ? {
      message: "message" in error ? String(error.message).slice(0, 500) : undefined,
      code: "code" in error ? String(error.code) : undefined,
      details: "details" in error && error.details ? String(error.details).slice(0, 500) : undefined,
    }
    : { message: error === undefined ? undefined : String(error).slice(0, 500) };
  console.error(JSON.stringify({ level: "error", event, ...fields, ...cause, at: new Date().toISOString() }));
}
