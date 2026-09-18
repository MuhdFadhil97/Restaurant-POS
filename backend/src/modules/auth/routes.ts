import { Router } from "express";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import { loginSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.post("/login", validate({ body: loginSchema }), controller.login);
router.get("/me", authenticate, controller.me);

export default router;
