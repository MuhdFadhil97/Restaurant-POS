import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { publishSnapshotSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

// The terminal (any signed-in role at the register) pushes cart snapshots.
router.put("/:terminalId", authenticate, validate({ body: publishSnapshotSchema }), controller.publish);

// The display page reads these by its own token — no login on that device.
// Generously rate-limited: info is one lookup, the stream one long-lived
// connection, neither is polling.
const publicLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
router.get("/token/:token", publicLimiter, controller.info);
router.get("/stream/:token", publicLimiter, controller.stream);

export default router;
