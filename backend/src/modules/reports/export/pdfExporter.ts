import { ReportData } from "../types";
import { renderReportHtml } from "./pdfTemplate";
import { getBrowser } from "./browserPool";

export async function exportToPdf(report: ReportData): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(renderReportHtml(report), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: report.columns.length > 5,
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
