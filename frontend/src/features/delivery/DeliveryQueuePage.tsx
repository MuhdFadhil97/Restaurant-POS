import { useMemo, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import {
  useAcceptDeliveryOrder,
  useArchiveDeliveryOrder,
  useDeliveryOrders,
  useRejectDeliveryOrder,
  useUpdateDeliveryOrderStatus,
} from "@/api/delivery";
import { DeliveryOrder, DeliveryOrderStatus } from "@/api/types";
import { Badge, Button, Card, ErrorMessage, Spinner } from "@/components/ui";
import { getErrorMessage } from "@/api/client";

function money(n: number | string) {
  return `RM ${Number(n).toFixed(2)}`;
}

function ItemsCell({ items }: { items: DeliveryOrder["items"] }) {
  if (items.length === 0) return <span className="text-xs text-gray-400">-</span>;
  return (
    <span className="text-xs text-gray-600">
      {items.map((i, idx) => (
        <span key={idx}>
          {idx > 0 && ", "}
          <span className={i.mapped ? undefined : "text-red-600 font-medium"}>
            {i.quantity}x {i.name}
          </span>
        </span>
      ))}
    </span>
  );
}

// One status = one section, stacked top to bottom in lifecycle order —
// easier to scan at a glance than either a dropdown filter or side-by-side
// Kanban columns once there's more than a couple of orders in flight.
const SECTIONS: {
  status: DeliveryOrderStatus;
  label: string;
  badge: "gray" | "green" | "red" | "yellow" | "blue" | "purple";
  alwaysShow: boolean;
  cap?: number;
}[] = [
  { status: "PENDING", label: "Incoming", badge: "yellow", alwaysShow: true },
  { status: "ACCEPTED", label: "Preparing", badge: "blue", alwaysShow: true },
  { status: "READY", label: "Ready for Pickup", badge: "purple", alwaysShow: true },
  { status: "PICKED_UP", label: "Picked Up", badge: "green", alwaysShow: false, cap: 10 },
  { status: "REJECTED", label: "Rejected", badge: "red", alwaysShow: false, cap: 10 },
];

export function DeliveryQueuePage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: orders, isLoading, error } = useDeliveryOrders(outletId ?? 0);
  const accept = useAcceptDeliveryOrder();
  const reject = useRejectDeliveryOrder();
  const updateStatus = useUpdateDeliveryOrderStatus();
  const archive = useArchiveDeliveryOrder();
  const [actionError, setActionError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<DeliveryOrderStatus, DeliveryOrder[]>();
    for (const o of orders ?? []) {
      const list = map.get(o.status) ?? [];
      list.push(o);
      map.set(o.status, list);
    }
    return map;
  }, [orders]);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  function handleReject(order: DeliveryOrder) {
    const reason = window.prompt(`Reject order ${order.externalOrderId}? Reason:`);
    if (!reason) return;
    run(() => reject.mutateAsync({ id: order.id, reason }));
  }

  function handleArchive(order: DeliveryOrder) {
    if (!window.confirm(`Archive order ${order.externalOrderId}? It stays on record but drops off this board.`)) return;
    run(() => archive.mutateAsync(order.id));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Delivery Orders</h1>
      {error && <ErrorMessage message={getErrorMessage(error)} />}
      {actionError && <ErrorMessage message={actionError} />}
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const all = grouped.get(section.status) ?? [];
            if (all.length === 0 && !section.alwaysShow) return null;
            const rows = section.cap ? all.slice(0, section.cap) : all;

            return (
              <div key={section.status} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold text-gray-700">{section.label}</h2>
                  <Badge color={section.badge}>{all.length}</Badge>
                  {section.cap && all.length > section.cap && (
                    <span className="text-xs text-gray-400">(showing most recent {section.cap})</span>
                  )}
                </div>
                <Card className="overflow-hidden">
                  {rows.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-400">No orders.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Order</th>
                          <th className="px-4 py-2 font-medium">Platform</th>
                          <th className="px-4 py-2 font-medium">Customer</th>
                          <th className="px-4 py-2 font-medium">Items</th>
                          <th className="px-4 py-2 font-medium">Total</th>
                          <th className="px-4 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 align-top">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="font-medium">{order.externalOrderId}</div>
                              <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString()}</div>
                              {order.transaction?.receiptNumber && (
                                <div className="text-xs text-gray-400">{order.transaction.receiptNumber}</div>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <Badge color="blue">{order.platform.provider}</Badge>
                            </td>
                            <td className="px-4 py-2">
                              <div>{order.customerName ?? "-"}</div>
                              {order.customerPhone && <div className="text-xs text-gray-400">{order.customerPhone}</div>}
                              {order.deliveryAddress && (
                                <div className="text-xs text-gray-400 max-w-[14rem] truncate">{order.deliveryAddress}</div>
                              )}
                            </td>
                            <td className="px-4 py-2 max-w-[18rem]">
                              <ItemsCell items={order.items} />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {order.transaction ? money(order.transaction.total) : "-"}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                              {order.status === "PENDING" && (
                                <>
                                  <Button
                                    variant="secondary"
                                    onClick={() => run(() => accept.mutateAsync(order.id))}
                                    disabled={accept.isPending}
                                  >
                                    Accept
                                  </Button>
                                  <Button variant="danger" onClick={() => handleReject(order)} disabled={reject.isPending}>
                                    Reject
                                  </Button>
                                </>
                              )}
                              {order.status === "ACCEPTED" && (
                                <Button
                                  variant="secondary"
                                  onClick={() => run(() => updateStatus.mutateAsync({ id: order.id, status: "READY" }))}
                                  disabled={updateStatus.isPending}
                                >
                                  Mark Ready
                                </Button>
                              )}
                              {order.status === "READY" && (
                                <Button
                                  variant="secondary"
                                  onClick={() => run(() => updateStatus.mutateAsync({ id: order.id, status: "PICKED_UP" }))}
                                  disabled={updateStatus.isPending}
                                >
                                  Picked Up
                                </Button>
                              )}
                              {(order.status === "PICKED_UP" || order.status === "REJECTED") && (
                                <div className="flex items-center justify-end gap-2">
                                  {order.status === "REJECTED" && order.rejectedReason && (
                                    <span className="text-xs text-gray-400 max-w-[8rem] truncate">
                                      {order.rejectedReason}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleArchive(order)}
                                    disabled={archive.isPending}
                                  >
                                    Archive
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
