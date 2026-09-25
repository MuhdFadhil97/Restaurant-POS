import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { reportQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

// Module access is authoritative here (not stacked with requireRole) so an
// admin's per-user grant can genuinely extend beyond the role default.
router.use(authenticate, requireModule("reports"));

// Legacy routes: fixed query shape, validated up front like before.
router.get("/sales-summary", validate({ query: reportQuerySchema }), controller.summary);
router.get("/top-products", validate({ query: reportQuerySchema }), controller.topProducts);
router.get("/sales-by-cashier", validate({ query: reportQuerySchema }), controller.byCashier);
router.get("/sales-by-payment-method", validate({ query: reportQuerySchema }), controller.byPaymentMethod);

// Generic catalog routes: query shape varies per report, so each report's own
// schema (via the registry) validates inside the controller instead of a
// shared `validate()` middleware. Registered after the literal routes above
// so Express matches those first.
router.get("/:reportKey/export", controller.exportReport);
router.get("/:reportKey", controller.getReport);

export default router;
