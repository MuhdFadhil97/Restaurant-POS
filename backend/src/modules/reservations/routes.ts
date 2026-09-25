import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import {
  cancelReservationSchema,
  collectDepositSchema,
  createPublicReservationSchema,
  createReservationSchema,
  listReservationsQuerySchema,
  outletSlugParamsSchema,
  seatReservationSchema,
  updateReservationSchema,
} from "./validation";
import * as controller from "./controller";

// Staff-facing CRUD + status transitions, under the usual JWT auth.
export const staffRouter = Router();
staffRouter.use(authenticate);
staffRouter.get(
  "/",
  validate({ query: listReservationsQuerySchema }),
  requireOutletAccess((req) => Number(req.query.outletId)),
  controller.list
);
staffRouter.get("/:id", controller.get);
staffRouter.post(
  "/",
  validate({ body: createReservationSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
staffRouter.patch("/:id", validate({ body: updateReservationSchema }), controller.update);
staffRouter.post("/:id/confirm", requireRole("ADMIN", "MANAGER", "CASHIER"), controller.confirm);
staffRouter.post("/:id/seat", requireRole("ADMIN", "MANAGER", "CASHIER"), validate({ body: seatReservationSchema }), controller.seat);
staffRouter.post("/:id/complete", requireRole("ADMIN", "MANAGER", "CASHIER"), controller.complete);
staffRouter.post("/:id/cancel", validate({ body: cancelReservationSchema }), controller.cancel);
staffRouter.post("/:id/no-show", requireRole("ADMIN", "MANAGER", "CASHIER"), controller.noShow);
staffRouter.post(
  "/:id/deposit",
  requireRole("ADMIN", "MANAGER", "CASHIER"),
  validate({ body: collectDepositSchema }),
  controller.collectDeposit
);

// Public, unauthenticated router — a guest booking a table online, same
// trust model as qrOrder/routes.ts (no auth; rate-limited; generic errors).
export const publicRouter = Router();
const bookingLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

publicRouter.post(
  "/:outletId",
  bookingLimiter,
  validate({ params: outletSlugParamsSchema, body: createPublicReservationSchema }),
  controller.createPublic
);

export default staffRouter;
