import { z } from "zod";

// Staff-facing create — outletId is explicit and the reservation starts
// CONFIRMED (a staff member is taking the booking directly, no review step).
export const createReservationSchema = z.object({
  outletId: z.coerce.number().int(),
  tableId: z.coerce.number().int().optional(),
  customerName: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
  partySize: z.number().int().positive(),
  reservedFor: z.coerce.date(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
  depositAmount: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional(),
});

// Public booking — no auth, so it always lands as PENDING for staff to
// confirm; no tableId (staff assign a table on confirm) and no deposit field
// (deposits are collected/recorded by staff, not entered by the guest).
export const createPublicReservationSchema = z.object({
  customerName: z.string().min(1).max(120),
  phone: z.string().min(3).max(30),
  partySize: z.number().int().positive(),
  reservedFor: z.coerce.date(),
  notes: z.string().max(500).optional(),
});

export const outletSlugParamsSchema = z.object({
  outletId: z.coerce.number().int(),
});

export const updateReservationSchema = z.object({
  tableId: z.coerce.number().int().nullable().optional(),
  customerName: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  partySize: z.number().int().positive().optional(),
  reservedFor: z.coerce.date().optional(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
  depositAmount: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const cancelReservationSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const seatReservationSchema = z.object({
  tableId: z.coerce.number().int().optional(),
});

export const collectDepositSchema = z.object({
  amount: z.number().nonnegative(),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listReservationsQuerySchema = z
  .object({
    outletId: z.coerce.number().int(),
    dateFrom: isoDate.optional(),
    dateTo: isoDate.optional(),
    status: z.enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  })
  .refine((v) => !v.dateFrom || !v.dateTo || v.dateFrom <= v.dateTo, {
    message: "dateFrom must be on or before dateTo",
    path: ["dateFrom"],
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreatePublicReservationInput = z.infer<typeof createPublicReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type SeatReservationInput = z.infer<typeof seatReservationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
