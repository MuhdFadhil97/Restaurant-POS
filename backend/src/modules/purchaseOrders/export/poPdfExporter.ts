import { Prisma } from "@prisma/client";
import { getBrowser } from "../../reports/export/browserPool";
import { renderPurchaseOrderHtml } from "./poPdfTemplate";

type PdfPurchaseOrder = Prisma.PurchaseOrderGetPayload<{
  include: {
    outlet: true;
    supplier: true;
    createdBy: { select: { id: true; name: true } };
    approvedBy: { select: { id: true; name: true } };
    items: { include: { product: true; variant: true; taxRate: true } };
  };
}>;

export async function exportPurchaseOrderToPdf(po: PdfPurchaseOrder): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(renderPurchaseOrderHtml(po), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
