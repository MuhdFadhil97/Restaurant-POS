import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { listOrdersQuerySchema, platformIdParamsSchema, rejectOrderSchema, updateStatusSchema } from "./validation";
import * as controller from "./controller";

// Staff-facing Kanban: list + accept/reject/status, under the usual JWT auth.
export const staffRouter = Router();
staffRouter.use(authenticate);
staffRouter.get(
  "/",
  validate({ query: listOrdersQuerySchema }),
  requireOutletAccess((req) => Number(req.query.outletId)),
  controller.list
);
staffRouter.get("/:id", controller.get);
staffRouter.post("/:id/accept", controller.accept);
staffRouter.post("/:id/reject", validate({ body: rejectOrderSchema }), controller.reject);
staffRouter.patch("/:id/status", validate({ body: updateStatusSchema }), controller.updateStatus);
staffRouter.post("/:id/archive", controller.archive);

// Public, unauthenticated webhook — the delivery platform calls this
// directly, so trust comes from the per-platform signature (verified in
// service.ingestWebhook), not a session. Same trust model as printBridge's
// token-authenticated agent routes, just signature- instead of token-based.
export const webhookRouter = Router();
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
webhookRouter.post(
  "/:platformId",
  webhookLimiter,
  validate({ params: platformIdParamsSchema }),
  controller.webhook
);

export default staffRouter;
