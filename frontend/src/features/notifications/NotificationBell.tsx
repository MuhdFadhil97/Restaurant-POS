import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletStore } from "@/store/outletStore";
import { useLowStock } from "@/api/inventory";
import { useKdsQueue } from "@/api/kds";
import { useStockTransfers } from "@/api/stockTransfers";
import { BellIcon } from "@/components/icons";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { activeOutletId } = useOutletStore();
  const { data: lowStock } = useLowStock(activeOutletId ?? undefined);
  const { data: kdsQueue } = useKdsQueue(activeOutletId ?? undefined);
  const { data: transfers } = useStockTransfers(activeOutletId ?? undefined);

  const readyItems = (kdsQueue ?? []).filter((item) => item.prepStatus === "READY");
  const transfersToSend = (transfers ?? []).filter(
    (t) => t.status === "PENDING" && t.fromOutletId === activeOutletId
  );
  const transfersToReceive = (transfers ?? []).filter(
    (t) => t.status === "IN_TRANSIT" && t.toOutletId === activeOutletId
  );
  const count =
    (lowStock?.length ?? 0) + readyItems.length + transfersToSend.length + transfersToReceive.length;

  function goTo(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      >
        <BellIcon className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No alerts right now</div>
            ) : (
              <>
                {lowStock && lowStock.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Low stock</div>
                    {lowStock.map((s) => (
                      <button
                        key={`stock-${s.id}`}
                        onClick={() => goTo("/products")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-900 truncate">{s.product.name}</span>
                        <span className="text-gray-500 shrink-0">{s.quantity} left</span>
                      </button>
                    ))}
                  </div>
                )}

                {readyItems.length > 0 && (
                  <div className="py-2 border-t border-gray-100">
                    <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Ready to serve</div>
                    {readyItems.map((item) => (
                      <button
                        key={`ready-${item.id}`}
                        onClick={() => goTo("/kds")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-900 truncate">{item.product.name}</span>
                        <span className="text-gray-500 shrink-0">
                          {item.transaction.table ? item.transaction.table.name : "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {transfersToSend.length > 0 && (
                  <div className="py-2 border-t border-gray-100">
                    <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Transfers to send</div>
                    {transfersToSend.map((t) => (
                      <button
                        key={`transfer-send-${t.id}`}
                        onClick={() => goTo("/inventory?tab=stock-transfers")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-900 truncate">To {t.toOutlet?.name ?? `outlet #${t.toOutletId}`}</span>
                        <span className="text-gray-500 shrink-0">
                          {t._count?.items ?? t.items.length} item{(t._count?.items ?? t.items.length) === 1 ? "" : "s"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {transfersToReceive.length > 0 && (
                  <div className="py-2 border-t border-gray-100">
                    <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Transfers to receive</div>
                    {transfersToReceive.map((t) => (
                      <button
                        key={`transfer-receive-${t.id}`}
                        onClick={() => goTo("/inventory?tab=stock-transfers")}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                      >
                        <span className="text-gray-900 truncate">From {t.fromOutlet?.name ?? `outlet #${t.fromOutletId}`}</span>
                        <span className="text-gray-500 shrink-0">
                          {t._count?.items ?? t.items.length} item{(t._count?.items ?? t.items.length) === 1 ? "" : "s"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
