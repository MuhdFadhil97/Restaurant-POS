import { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/apiError";
import { ModuleKey } from "../lib/modules";

export function requireModule(moduleKey: ModuleKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!req.user.modules.includes(moduleKey)) {
      throw ApiError.forbidden(`Requires access to module: ${moduleKey}`);
    }
    next();
  };
}
