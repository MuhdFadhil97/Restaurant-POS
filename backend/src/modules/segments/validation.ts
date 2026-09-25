import { z } from "zod";

// ruleValue is required for every rule type except ALL_CUSTOMERS, checked
// with a refine since its meaning (and whether it's needed at all) depends
// on ruleType.
export const createSegmentSchema = z
  .object({
    name: z.string().min(1),
    ruleType: z.enum(["ALL_CUSTOMERS", "NO_VISIT_SINCE_DAYS", "BIRTHDAY_WITHIN_DAYS", "TOTAL_SPEND_ABOVE"]),
    ruleValue: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.ruleType === "ALL_CUSTOMERS" || data.ruleValue !== undefined, {
    message: "ruleValue is required for this rule type",
    path: ["ruleValue"],
  });
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
