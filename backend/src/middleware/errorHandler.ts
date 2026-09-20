import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { ApiError } from "../lib/apiError";

// Must be registered last. Express recognizes this as an error handler by
// its 4-argument signature.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { message: err.message, code: err.code, details: err.details },
    });
  }

  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller" : err.message;
    return res.status(400).json({ error: { message, code: "BAD_REQUEST" } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: {
          message: "A record with this value already exists",
          code: "CONFLICT",
          details: err.meta,
        },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: { message: "Record not found", code: "NOT_FOUND" },
      });
    }
  }

  console.error(err);
  return res.status(500).json({
    error: { message: "Internal server error", code: "INTERNAL_ERROR" },
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" },
  });
}

// Wraps async route handlers so thrown/rejected errors reach errorHandler.
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
