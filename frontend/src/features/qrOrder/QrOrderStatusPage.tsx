import { useParams, useNavigate } from "react-router-dom";
import { useQrOrderStatus } from "@/api/qrOrder";
import { PrepStatus } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Badge, ErrorMessage, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

const statusColor: Record<PrepStatus, "gray" | "yellow" | "blue" | "green"> = {
  QUEUED: "gray",
  PREPARING: "yellow",
  READY: "blue",
  SERVED: "green",
};

export function QrOrderStatusPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQrOrderStatus(token, true);

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
        <ErrorMessage message={getErrorMessage(error) || "This QR code is invalid or has expired."} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <p className="font-semibold text-gray-900">Table {data.table.name}</p>
        <p className="text-sm text-gray-500">Your order</p>
      </header>

      <div className="p-4 space-y-3">
        {!data.order && <p className="text-gray-400 text-sm text-center py-8">No active order yet.</p>}

        {data.order?.items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {item.quantity}x {item.productName}
              </p>
              {item.variantValue && <p className="text-xs text-gray-500">{item.variantValue}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge color={statusColor[item.prepStatus]}>{item.prepStatus}</Badge>
              <span className="text-sm font-medium">{money(Number(item.lineTotal))}</span>
            </div>
          </div>
        ))}

        {data.order && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>{money(Number(data.order.total))}</span>
          </div>
        )}

        <button
          onClick={() => navigate(`/order/${token}`)}
          className="w-full bg-brand-600 text-white font-medium py-3 rounded-lg"
        >
          Add more items
        </button>
      </div>
    </div>
  );
}
