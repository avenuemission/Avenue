import "server-only";
import { NextResponse } from "next/server";

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function tooMany(): NextResponse {
  return jsonError(429, "Too many attempts. Please wait a few minutes and try again.");
}

// The error's kind only: a mailer message can quote the recipient address,
// so log this, not the error, when a send fails.
export function errorKind(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? `${error.name} ${code}` : error.name;
  }
  return typeof error;
}

// The one place a route handler turns an unexpected failure into a
// response. Logs the real cause server-side (with a context label so it is
// findable) but never puts it in the response body: a raw database or
// driver message can leak table/column names or connection details to
// whoever made the request. Deliberate, user-facing validation errors
// (400s) are not this function's job and should keep returning their own
// specific messages.
export function serverError(context: string, cause: unknown): NextResponse {
  console.error(context, cause);
  return jsonError(500, "Something went wrong. Please try again.");
}
