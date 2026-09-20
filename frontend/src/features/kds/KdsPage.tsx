import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useKitchenStations } from "@/api/kitchenStations";
import { KdsQueueItem, useKdsQueue, useUpdatePrepStatus } from "@/api/kds";
import { PrepStatus } from "@/api/types";
import { Badge, Button, Card, Spinner } from "@/components/ui";

const statusColor: Record<PrepStatus, "gray" | "yellow" | "blue" | "green"> = {
  QUEUED: "gray",
  PREPARING: "yellow",
  READY: "blue",
  SERVED: "green",
};

const nextStatus: Record<PrepStatus, PrepStatus | null> = {
  QUEUED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
  SERVED: null,
};

export function KdsPage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [stationId, setStationId] = useState<number | "">("");
  const { data: stations } = useKitchenStations(outletId ?? undefined);
  const { data: queue, isLoading } = useKdsQueue(outletId ?? undefined, stationId || undefined);
  const updateStatus = useUpdatePrepStatus();

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kitchen Display</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setStationId("")}
            className={`px-3 py-1.5 rounded-full text-sm ${!stationId ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            All Stations
          </button>
          {stations?.map((s) => (
            <button
              key={s.id}
              onClick={() => setStationId(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm ${stationId === s.id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {queue?.map((item) => (
            <KdsCard key={item.id} item={item} onAdvance={(status) => updateStatus.mutate({ itemId: item.id, prepStatus: status })} />
          ))}
          {queue?.length === 0 && <p className="text-gray-400 col-span-full text-center py-8">No open orders.</p>}
        </div>
      )}
    </div>
  );
}

function KdsCard({ item, onAdvance }: { item: KdsQueueItem; onAdvance: (status: PrepStatus) => void }) {
  const status = item.prepStatus ?? "QUEUED";
  const next = nextStatus[status];
  const tableName = item.transaction.table?.name;

  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{tableName ?? "Takeaway"}</span>
        <div className="flex items-center gap-1">
          {item.transaction.origin === "QR" && <Badge color="purple">QR</Badge>}
          <Badge color={statusColor[status]}>{status}</Badge>
        </div>
      </div>
      <p className="text-lg font-medium">
        {item.quantity}x {item.product.name}
      </p>
      {item.variant && <p className="text-sm text-gray-500">{item.variant.value}</p>}
      <p className="text-xs text-gray-400">{new Date(item.preparingAt ?? item.readyAt ?? item.servedAt ?? Date.now()).toLocaleTimeString()}</p>
      {next && (
        <Button className="mt-2" onClick={() => onAdvance(next)}>
          Mark {next}
        </Button>
      )}
    </Card>
  );
}
