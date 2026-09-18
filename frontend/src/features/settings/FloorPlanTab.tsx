import { useEffect, useMemo, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useSaveTableLayout, useTables } from "@/api/tables";
import { TableDto } from "@/api/types";
import { Button } from "@/components/ui";
import { FloorPlanCanvas, FloorPlanLegend } from "./FloorPlanCanvas";

const GRID_COLS = 5;
const GRID_CELL = 120;

function withDefaultPositions(tables: TableDto[]): TableDto[] {
  let nextSlot = 0;
  return tables.map((t) => {
    if (t.posX !== null && t.posY !== null) return t;
    const col = nextSlot % GRID_COLS;
    const row = Math.floor(nextSlot / GRID_COLS);
    nextSlot++;
    return { ...t, posX: col * GRID_CELL + 20, posY: row * GRID_CELL + 20 };
  });
}

export function FloorPlanTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: tables } = useTables(outletId ?? undefined);
  const saveLayout = useSaveTableLayout();

  const positioned = useMemo(() => withDefaultPositions(tables ?? []), [tables]);

  const [pending, setPending] = useState<Record<string, { posX: number; posY: number }>>({});

  // Discard any unsaved drag edits when switching outlets — they belong to
  // the previous outlet's tables and would otherwise leave Save/Discard
  // falsely enabled here even though nothing changed in this outlet.
  useEffect(() => {
    setPending({});
  }, [outletId]);

  const dirty = Object.keys(pending).length > 0;

  const merged = positioned.map((t) => ({ ...t, ...(pending[t.id] ?? {}) }));

  function handleDragEnd(id: number, posX: number, posY: number) {
    setPending((prev) => ({ ...prev, [id]: { posX, posY } }));
  }

  function handleDiscard() {
    setPending({});
  }

  async function handleSave() {
    if (!outletId) return;
    await saveLayout.mutateAsync({
      outletId,
      tables: merged.map((t) => ({
        id: t.id,
        posX: t.posX ?? 0,
        posY: t.posY ?? 0,
        width: t.width ?? undefined,
        height: t.height ?? undefined,
      })),
    });
    setPending({});
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Drag tables to match your restaurant's floor layout.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDiscard} disabled={!dirty || saveLayout.isPending}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saveLayout.isPending}>
            {saveLayout.isPending ? "Saving..." : "Save Layout"}
          </Button>
        </div>
      </div>

      <FloorPlanCanvas tables={merged} editable onDragEnd={handleDragEnd} />
      <FloorPlanLegend />
    </div>
  );
}
