import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createGrnSchema, listQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createGrnSchema }), controller.create);

export default router;
