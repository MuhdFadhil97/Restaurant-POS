import { z } from "zod";

export const verifyParamsSchema = z.object({
  uuid: z.string().uuid(),
  longId: z
    .string()
    .regex(/^[0-9A-Fa-f]{48}$/, "Invalid longId format"),
});

export type VerifyParams = z.infer<typeof verifyParamsSchema>;
