import { FormEvent, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useCreateKitchenStation, useKitchenStations } from "@/api/kitchenStations";
import { Button, Card, Input } from "@/components/ui";

export function KitchenStationsTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: stations } = useKitchenStations(outletId ?? undefined);
  const createStation = useCreateKitchenStation();
  const [name, setName] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!outletId) return;
    await createStation.mutateAsync({ outletId, name });
    setName("");
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {stations?.map((s) => (
            <span key={s.id} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium">
              {s.name}
            </span>
          ))}
          {stations?.length === 0 && <p className="text-sm text-gray-400">No kitchen stations yet.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Add Station</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input placeholder="Station name (e.g. Kitchen, Bar)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" disabled={createStation.isPending}>
            Add
          </Button>
        </form>
      </Card>
    </div>
  );
}
