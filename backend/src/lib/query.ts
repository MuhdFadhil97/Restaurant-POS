// Query-string values always arrive as strings (or undefined); entity id filters
// need coercing to number before being passed to Prisma.
export function optionalIdQuery(value: unknown): number | undefined {
  return typeof value === "string" ? Number(value) : undefined;
}
