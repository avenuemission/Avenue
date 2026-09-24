// Id shapes shared by routes and domain validators. Pure.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A uuid in canonical 8-4-4-4-12 hex form, either case. Checked before a
// value reaches a uuid column, so a bad id is a 400, not a database error.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
