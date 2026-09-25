import { DeliveryProvider } from "@prisma/client";
import { ApiError } from "../../apiError";
import { DeliveryAdapter } from "../types";
import { customAdapter } from "./custom";

// GRAB/FOODPANDA/DOORDASH exist in the enum (so credentials can be entered
// and platforms configured ahead of time) but have no adapter implementation
// yet — each requires real sandbox credentials/docs from that platform's
// developer program, which this environment doesn't have access to. Only
// CUSTOM (a documented generic webhook, see adapters/custom.ts) is wired
// end-to-end. Adding a real one later means implementing this same
// `DeliveryAdapter` interface and registering it below — nothing else in
// the pipeline (webhook route, orders service, Kanban UI) changes.
const adapters: Partial<Record<DeliveryProvider, DeliveryAdapter>> = {
  CUSTOM: customAdapter,
};

export function getDeliveryAdapter(provider: DeliveryProvider): DeliveryAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw ApiError.badRequest(`No adapter implemented yet for provider ${provider}`);
  }
  return adapter;
}
