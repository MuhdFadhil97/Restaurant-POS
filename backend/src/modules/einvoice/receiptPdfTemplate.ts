import { Prisma } from "@prisma/client";

export type PdfReceiptTransaction = Prisma.TransactionGetPayload<{
  include: {
    items: { include: { product: true; variant: true } };
    payments: true;
    outlet: true;
    cashier: { select: { id: true; name: true } };
  };
}>;

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function money(value: unknown): string {
  return `RM ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Mirrors frontend/src/features/transactions/Receipt.tsx so the downloaded
// e-receipt matches what was printed at checkout, minus the QR (the customer
// already scanned it to reach this download).
export function renderReceiptHtml(transaction: PdfReceiptTransaction): string {
  const itemRows = transaction.items
    .map((item, index) => {
      const name = `${item.quantity}x ${escapeHtml(item.product.name)}${item.variant ? ` (${escapeHtml(item.variant.value)})` : ""}`;
      return `<div class="row"><span class="no">${index + 1}.</span><span class="name">${name}</span><span class="amt">${money(item.lineTotal)}</span></div>`;
    })
    .join("");

  const paymentRows = transaction.payments
    .map(
      (p) =>
        `<div class="row"><span class="name">${escapeHtml(p.method)}</span><span class="amt">${money(p.amount)}</span></div>${
          p.method === "CARD" && p.reference ? `<div class="ref">${escapeHtml(p.reference)}</div>` : ""
        }`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: "Courier New", monospace; color: #000; margin: 0; padding: 12px; font-size: 12px; width: 80mm; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .small { font-size: 10px; color: #444; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; margin-bottom: 3px; }
  .row .no { width: 16px; flex-shrink: 0; }
  .row .name { flex: 1; }
  .row .amt { flex-shrink: 0; }
  .head-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 3px; }
  .totals .row { font-size: 11px; }
  .totals .grand { font-weight: 700; font-size: 13px; padding-top: 4px; }
  .ref { text-align: right; font-size: 9px; color: #555; margin: -2px 0 4px; }
  .footer { text-align: center; font-size: 11px; margin-top: 10px; }
  .status { text-align: center; font-size: 10px; margin: 4px 0; }
  .status.cancelled { color: #b91c1c; font-weight: 700; }
</style>
</head>
<body>
  <div class="center">
    <p class="bold">${escapeHtml(transaction.outlet.name)}</p>
    ${transaction.outlet.address ? `<p class="small">${escapeHtml(transaction.outlet.address)}</p>` : ""}
    ${transaction.outlet.einvoiceTin ? `<p class="small">TIN: ${escapeHtml(transaction.outlet.einvoiceTin)}</p>` : ""}
    ${transaction.outlet.einvoiceBrn ? `<p class="small">Reg No: ${escapeHtml(transaction.outlet.einvoiceBrn)}</p>` : ""}
    <p class="small">${new Date(transaction.createdAt).toLocaleString()}</p>
    <p class="small">Receipt #${escapeHtml(transaction.receiptNumber ?? transaction.id)}</p>
    ${transaction.cashier ? `<p class="small">Cashier: ${escapeHtml(transaction.cashier.name)}</p>` : ""}
  </div>
  <hr />
  <div class="head-row"><span class="no">No.</span><span class="name">Products</span><span>Price (RM)</span></div>
  ${itemRows}
  <hr />
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${money(transaction.subtotal)}</span></div>
    <div class="row"><span>Discount</span><span>-${money(transaction.discountTotal)}</span></div>
    ${Number(transaction.serviceChargeTotal) > 0 ? `<div class="row"><span>Service Charge</span><span>${money(transaction.serviceChargeTotal)}</span></div>` : ""}
    <div class="row"><span>Tax</span><span>${money(transaction.taxTotal)}</span></div>
    <div class="row grand"><span>Total</span><span>${money(transaction.total)}</span></div>
  </div>
  <hr />
  ${paymentRows}
  ${
    transaction.einvoiceStatus === "GENERATED"
      ? `<hr /><p class="status">Malaysia e-Invoice &mdash; Verified</p>`
      : transaction.einvoiceStatus === "CANCELLED"
        ? `<hr /><p class="status cancelled">e-Invoice Cancelled</p>`
        : ""
  }
  <p class="footer">${escapeHtml(transaction.outlet.receiptFooter || "Thank you!")}</p>
</body>
</html>`;
}
