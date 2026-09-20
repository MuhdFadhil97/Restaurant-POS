import { getBrowser } from "../reports/export/browserPool";
import { PdfReceiptTransaction, renderReceiptHtml } from "./receiptPdfTemplate";

// Thermal-receipt-shaped PDF: fixed 80mm width, height fit to content (rather
// than a fixed page format) so it reads like the printed slip, just digital.
export async function exportReceiptToPdf(transaction: PdfReceiptTransaction): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(renderReceiptHtml(transaction), { waitUntil: "networkidle0" });
    const heightPx = (await page.evaluate("document.body.scrollHeight")) as number;
    const pdf = await page.pdf({
      width: "80mm",
      height: `${heightPx + 24}px`,
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
