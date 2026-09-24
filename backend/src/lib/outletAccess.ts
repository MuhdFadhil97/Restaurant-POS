import { JwtPayload } from "./jwt";
import { ApiError } from "./apiError";

// Service-level counterpart of the requireOutletAccess middleware, for routes
// addressed by an entity id (e.g. PATCH /printers/:id) where the outlet is
// only known after loading the record.
export function assertOutletAccess(user: JwtPayload | undefined, outletId: number) {
  if (!user) throw ApiError.unauthorized();
  if (user.role === "ADMIN") return;
  if (!user.outletIds.includes(outletId)) throw ApiError.forbidden("No access to this outlet");
}
