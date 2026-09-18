import { prisma } from "../../../lib/prisma";
import { ReportMeta } from "../types";

interface MetaInput {
  outletId?: number;
  from?: string;
  to?: string;
  [key: string]: unknown;
}

// Base fields (outletId/from/to) are surfaced as named ReportMeta properties;
// everything else on the query is echoed back as filtersApplied so exports
// stay self-describing without every call site listing its own filters.
export async function buildMeta(query: MetaInput, generatedBy?: string): Promise<ReportMeta> {
  const { outletId, from, to, ...rest } = query;

  let outletName: string | undefined;
  if (outletId) {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { name: true } });
    outletName = outlet?.name;
  }

  const filtersApplied = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined && v !== null)
  ) as Record<string, string | number | undefined>;

  return {
    outletName,
    from,
    to,
    generatedAt: new Date().toISOString(),
    generatedBy,
    filtersApplied: Object.keys(filtersApplied).length ? filtersApplied : undefined,
  };
}
