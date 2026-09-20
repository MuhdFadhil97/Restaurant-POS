import { prisma } from "../../lib/prisma";
import { ApiError } from "../../lib/apiError";
import { exportReceiptToPdf } from "./receiptPdfExporter";

// Mirrors a real MyInvois share link: the uuid alone isn't enough to look up
// a record, longId acts as the capability secret. Both must match together,
// so this never confirms "uuid exists but longId is wrong" to a caller.
export async function verify(uuid: string, longId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { einvoiceUuid: uuid, einvoiceLongId: longId },
    include: { outlet: true },
  });
  if (!transaction) throw ApiError.notFound("e-Invoice not found");

  return {
    uuid: transaction.einvoiceUuid,
    longId: transaction.einvoiceLongId,
    status: transaction.einvoiceStatus,
    generatedAt: transaction.einvoiceGeneratedAt,
    receiptNumber: transaction.receiptNumber,
    total: transaction.total,
    outlet: {
      name: transaction.outlet.name,
      address: transaction.outlet.address,
      tin: transaction.outlet.einvoiceTin,
      brn: transaction.outlet.einvoiceBrn,
    },
  };
}

// Lets a customer who scanned the receipt QR download their own copy — same
// uuid+longId capability check as verify() above, just returning a PDF of
// the full receipt instead of the validation summary.
export async function getReceiptPdf(uuid: string, longId: string): Promise<{ buffer: Buffer; receiptNumber: string | null }> {
  const transaction = await prisma.transaction.findFirst({
    where: { einvoiceUuid: uuid, einvoiceLongId: longId },
    include: {
      items: { include: { product: true, variant: true } },
      payments: true,
      outlet: true,
      cashier: { select: { id: true, name: true } },
    },
  });
  if (!transaction) throw ApiError.notFound("e-Invoice not found");

  const buffer = await exportReceiptToPdf(transaction);
  return { buffer, receiptNumber: transaction.receiptNumber };
}
