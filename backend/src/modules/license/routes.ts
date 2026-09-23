import { Router } from "express";
import * as controller from "./controller";

const router = Router();

router.get("/status", controller.status);

export default router;
