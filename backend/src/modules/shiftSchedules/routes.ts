import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import {
  createShiftScheduleSchema,
  listMyShiftSchedulesQuerySchema,
  listShiftSchedulesQuerySchema,
  staffQuerySchema,
  updateShiftScheduleSchema,
} from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

// Any authenticated user can see their own roster.
router.get("/mine", validate({ query: listMyShiftSchedulesQuerySchema }), controller.listMine);

router.get(
  "/staff",
  requireRole("ADMIN", "MANAGER"),
  validate({ query: staffQuerySchema }),
  requireOutletAccess((req) => req.query.outletId as unknown as number),
  controller.listStaff
);

router.get(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate({ query: listShiftSchedulesQuerySchema }),
  requireOutletAccess((req) => req.query.outletId as unknown as number),
  controller.listForMonth
);
router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: createShiftScheduleSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: updateShiftScheduleSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);

export default router;
