import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { clockInSchema, correctAttendanceSchema, listAttendanceQuerySchema, listMyAttendanceQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

// Any authenticated user manages their own attendance.
router.get("/current", controller.current);
router.post("/clock-in", validate({ body: clockInSchema }), requireOutletAccess((req) => req.body.outletId), controller.clockIn);
router.post("/break/start", controller.startBreak);
router.post("/break/end", controller.endBreak);
router.post("/clock-out", controller.clockOut);
router.get("/mine", validate({ query: listMyAttendanceQuerySchema }), controller.listMine);

// Admin/manager timesheet + compliance view, and manual correction.
router.get(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate({ query: listAttendanceQuerySchema }),
  requireOutletAccess((req) => req.query.outletId as unknown as number),
  controller.list
);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: correctAttendanceSchema }), controller.correct);

export default router;
