import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConfirmQrOrder, useQrOrderStatus } from "@/api/qrOrder";
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
  const confirmOrder = useConfirmQrOrder(token);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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

  const pendingCount = data.order?.items.filter((item) => !item.kitchenPrintedAt).length ?? 0;

  async function handleConfirm() {
    setConfirmError(null);
    try {
      await confirmOrder.mutateAsync();
    } catch (err) {
      setConfirmError(getErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <p className="font-semibold text-gray-900">Table {data.table.name}</p>
        <p className="text-sm text-gray-500">Your order</p>
      </header>

      <div className="p-4 space-y-3">
        {!data.order && <p className="text-gray-400 text-sm text-center py-8">No active order yet.</p>}

        {pendingCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {pendingCount} item{pendingCount === 1 ? "" : "s"} not sent to the kitchen yet. Review below, then tap
            "Confirm Order" when you're ready.
          </div>
        )}

        {confirmError && <ErrorMessage message={confirmError} />}

        {data.order?.items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {item.quantity}x {item.productName}
              </p>
              {item.variantValue && <p className="text-xs text-gray-500">{item.variantValue}</p>}
              {item.notes && <p className="text-xs text-gray-500 italic break-words">Note: {item.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.kitchenPrintedAt ? (
                <Badge color={statusColor[item.prepStatus]}>{item.prepStatus}</Badge>
              ) : (
                <Badge color="yellow">Not sent yet</Badge>
              )}
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

        {pendingCount > 0 && (
          <button
            onClick={handleConfirm}
            disabled={confirmOrder.isPending}
            className="w-full bg-brand-600 text-white font-medium py-3 rounded-lg disabled:bg-gray-300"
          >
            {confirmOrder.isPending ? "Confirming..." : "Confirm Order"}
          </button>
        )}

        <button
          onClick={() => navigate(`/order/${token}`)}
          className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-lg"
        >
          Add more items
        </button>
      </div>
    </div>
  );
}
