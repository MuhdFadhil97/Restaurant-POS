import crypto from "node:crypto";

export const MYINVOIS_BASE_URL = "https://myinvois.hasil.gov.my";

export interface SimulatedEInvoice {
  uuid: string;
  longId: string;
  generatedAt: Date;
}

// Stands in for a real LHDN MyInvois submission response. Swapping in a real
// integration later means replacing this function's body with an API call
// that returns the same { uuid, longId, generatedAt } shape — no caller or
// schema change required.
export function generateSimulatedEInvoice(): SimulatedEInvoice {
  return {
    uuid: crypto.randomUUID(),
    longId: crypto.randomBytes(24).toString("hex").toUpperCase(),
    generatedAt: new Date(),
  };
}

export function buildEInvoiceValidationUrl(uuid: string, longId: string): string {
  return `${MYINVOIS_BASE_URL}/${uuid}/share/${longId}`;
}
