import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { closeSessionSchema, openSessionSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/current", controller.current);
router.get("/", controller.list);
router.post("/", validate({ body: openSessionSchema }), controller.open);
router.post("/:id/close", validate({ body: closeSessionSchema }), controller.close);

export default router;
