import { useParams } from "react-router-dom";
import { useEInvoiceVerify } from "@/api/einvoice";
import { apiClient, getErrorMessage } from "@/api/client";
import { Badge, ErrorMessage, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

export function EInvoiceVerifyPage() {
  const { uuid = "", longId = "" } = useParams();
  const { data, isLoading, error } = useEInvoiceVerify(uuid, longId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <ErrorMessage message={getErrorMessage(error) || "e-Invoice not found."} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">Malaysia e-Invoice</p>
          <p className="font-semibold text-gray-900">{data.outlet.name}</p>
          {data.outlet.address && <p className="text-xs text-gray-500">{data.outlet.address}</p>}
        </div>

        <div className="flex justify-center">
          <Badge color={data.status === "GENERATED" ? "green" : "gray"}>
            {data.status === "GENERATED" ? "Valid" : "Cancelled"}
          </Badge>
        </div>

        <div className="text-sm space-y-1.5 border-t border-dashed pt-3">
          {data.outlet.tin && (
            <div className="flex justify-between">
              <span className="text-gray-500">TIN</span>
              <span className="font-medium">{data.outlet.tin}</span>
            </div>
          )}
          {data.outlet.brn && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reg No.</span>
              <span className="font-medium">{data.outlet.brn}</span>
            </div>
          )}
          {data.receiptNumber && (
            <div className="flex justify-between">
              <span className="text-gray-500">Receipt #</span>
              <span className="font-medium">{data.receiptNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-medium">{money(Number(data.total))}</span>
          </div>
          {data.generatedAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Issued</span>
              <span className="font-medium">{new Date(data.generatedAt).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">UUID</span>
            <span className="font-mono text-[10px] break-all text-right">{data.uuid}</span>
          </div>
        </div>

        <a
          href={`${apiClient.defaults.baseURL}/einvoice/${uuid}/share/${longId}/receipt.pdf`}
          download={`receipt-${data.receiptNumber ?? uuid}.pdf`}
          className="block w-full text-center px-4 py-2 rounded-lg font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          Download e-Receipt
        </a>
      </div>
    </div>
  );
}
