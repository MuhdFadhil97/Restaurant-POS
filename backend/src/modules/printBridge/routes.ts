import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { authenticateBridge } from "../../middleware/bridgeAuth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { optionalIdQuery } from "../../lib/query";
import { ackJobSchema, createBridgeSchema, updateBridgeSchema } from "./validation";
import * as controller from "./controller";

// Staff-facing CRUD, under the usual JWT auth — a print bridge is a
// credential, so only ADMIN manages it (not MANAGER, unlike terminals/printers).
export const staffRouter = Router();
staffRouter.use(authenticate, requireRole("ADMIN"));
staffRouter.get("/", requireOutletAccess((req) => optionalIdQuery(req.query.outletId)), controller.list);
staffRouter.post(
  "/",
  validate({ body: createBridgeSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
staffRouter.patch("/:id", validate({ body: updateBridgeSchema }), controller.update);
staffRouter.delete("/:id", controller.remove);
staffRouter.post("/:id/regenerate-token", controller.regenerateToken);

// Agent-facing, token auth — the on-site print-bridge process, not a logged-in user.
export const agentRouter = Router();
agentRouter.use(authenticateBridge);
agentRouter.get("/jobs", controller.claimJobs);
agentRouter.post("/jobs/:id/ack", validate({ body: ackJobSchema }), controller.ackJob);
