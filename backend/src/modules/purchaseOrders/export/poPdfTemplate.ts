import { Prisma } from "@prisma/client";

type PdfPurchaseOrder = Prisma.PurchaseOrderGetPayload<{
  include: {
    outlet: true;
    supplier: true;
    createdBy: { select: { id: true; name: true } };
    approvedBy: { select: { id: true; name: true } };
    items: { include: { product: true; variant: true; taxRate: true } };
  };
}>;

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function money(value: unknown): string {
  return `RM ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderPurchaseOrderHtml(po: PdfPurchaseOrder): string {
  const rows = po.items
    .map((item) => {
      const productName = escapeHtml(item.product.name) + (item.variant ? ` (${escapeHtml(item.variant.value)})` : "");
      return `<tr>
        <td>${productName}</td>
        <td style="text-align:right">${item.quantityOrdered}</td>
        <td style="text-align:right">${money(item.unitCost)}</td>
        <td style="text-align:right">${item.taxRate ? `${Number(item.taxRate.rate).toFixed(2)}%` : "-"}</td>
        <td style="text-align:right">${money(item.discountAmount)}</td>
        <td style="text-align:right">${money(item.lineTotal)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 32px; font-size: 11px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 10px; }
  .columns { display: flex; justify-content: space-between; margin-top: 20px; }
  .box h2 { font-size: 12px; margin: 0 0 4px; color: #374151; }
  .box p { margin: 0; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  th { background: #f3f4f6; font-weight: 600; text-align: left; border-bottom: 2px solid #d1d5db; }
  .totals { margin-top: 12px; width: 260px; margin-left: auto; }
  .totals tr td { border: none; padding: 3px 8px; }
  .totals tr.grand td { font-weight: 700; border-top: 2px solid #d1d5db; }
  .notes { margin-top: 20px; color: #374151; }
  .footer { margin-top: 24px; color: #9ca3af; font-size: 9px; }
</style>
</head>
<body>
  <h1>Purchase Order ${escapeHtml(po.poNumber)}</h1>
  <div class="meta">Status: ${escapeHtml(po.status.replace("_", " "))}${po.orderedAt ? ` &middot; Ordered ${new Date(po.orderedAt).toLocaleDateString()}` : ""}${po.expectedAt ? ` &middot; Expected ${new Date(po.expectedAt).toLocaleDateString()}` : ""}</div>

  <div class="columns">
    <div class="box">
      <h2>From</h2>
      <p>${escapeHtml(po.outlet.name)}</p>
      ${po.outlet.address ? `<p>${escapeHtml(po.outlet.address)}</p>` : ""}
      ${po.outlet.phone ? `<p>${escapeHtml(po.outlet.phone)}</p>` : ""}
    </div>
    <div class="box">
      <h2>Supplier</h2>
      <p>${escapeHtml(po.supplier.name)}</p>
      ${po.supplier.address ? `<p>${escapeHtml(po.supplier.address)}</p>` : ""}
      ${po.supplier.contactName ? `<p>Attn: ${escapeHtml(po.supplier.contactName)}</p>` : ""}
      ${po.supplier.email ? `<p>${escapeHtml(po.supplier.email)}</p>` : ""}
      ${po.supplier.phone ? `<p>${escapeHtml(po.supplier.phone)}</p>` : ""}
      ${po.supplier.taxRegistrationNumber ? `<p>Tax Reg: ${escapeHtml(po.supplier.taxRegistrationNumber)}</p>` : ""}
    </div>
    <div class="box">
      <h2>Details</h2>
      <p>Created by: ${escapeHtml(po.createdBy.name)}</p>
      ${po.approvedBy ? `<p>Approved by: ${escapeHtml(po.approvedBy.name)}</p>` : ""}
      ${po.supplier.paymentTerms ? `<p>Terms: ${escapeHtml(po.supplier.paymentTerms)}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right">Qty</th>
        <th style="text-align:right">Unit Cost</th>
        <th style="text-align:right">Tax</th>
        <th style="text-align:right">Discount</th>
        <th style="text-align:right">Line Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right">${money(po.subtotal)}</td></tr>
    <tr><td>Discount</td><td style="text-align:right">-${money(po.discountTotal)}</td></tr>
    <tr><td>Tax</td><td style="text-align:right">${money(po.taxTotal)}</td></tr>
    <tr class="grand"><td>Total</td><td style="text-align:right">${money(po.total)}</td></tr>
  </table>

  ${po.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(po.notes)}</div>` : ""}

  <div class="footer">Generated ${new Date().toLocaleString()}</div>
</body>
</html>`;
}
