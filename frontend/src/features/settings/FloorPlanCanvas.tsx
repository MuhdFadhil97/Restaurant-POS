import { useEffect, useRef, useState } from "react";
import { TableDto } from "@/api/types";
import { BanIcon, ClockIcon, UsersIcon } from "@/components/icons";

// All tables render as a rounded rectangle on the floor plan.
const DEFAULT_WIDTH = 96;
const DEFAULT_HEIGHT = 64;
const CORNER_RADIUS = "1rem";

function statusClasses(status: TableDto["status"], selected: boolean) {
  if (selected) return "bg-brand-600 text-white border-brand-600";
  switch (status) {
    case "OCCUPIED":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "RESERVED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "NOT_AVAILABLE":
      return "bg-red-50 text-red-700 border-red-200 opacity-80";
    default:
      return "bg-white text-gray-700 border-gray-200";
  }
}

// Small corner badge so Reserved / Not Available read at a glance, not just
// via background tint (which selection also overrides).
function StatusIndicator({ status }: { status: TableDto["status"] }) {
  if (status === "RESERVED") {
    return (
      <span
        title="Reserved"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow"
      >
        <ClockIcon className="w-3 h-3" />
      </span>
    );
  }
  if (status === "NOT_AVAILABLE") {
    return (
      <span
        title="Not Available"
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
      >
        <BanIcon className="w-3 h-3" />
      </span>
    );
  }
  return null;
}

function TableToken({
  table,
  editable,
  selected,
  onClick,
  onDragEnd,
}: {
  table: TableDto;
  editable: boolean;
  selected: boolean;
  onClick?: () => void;
  onDragEnd?: (id: number, posX: number, posY: number) => void;
}) {
  const [pos, setPos] = useState({ x: table.posX ?? 0, y: table.posY ?? 0 });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(
    null
  );

  // Re-sync from server/props whenever this table's saved position changes
  // (e.g. another save, or a query refetch) — but not mid-drag, where local
  // `pos` is the source of truth until pointer-up.
  useEffect(() => {
    if (dragState.current) return;
    setPos({ x: table.posX ?? 0, y: table.posY ?? 0 });
  }, [table.posX, table.posY]);

  function handlePointerDown(e: React.PointerEvent) {
    if (!editable) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
    setPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
  }

  function handlePointerUp() {
    if (!dragState.current) return;
    const { moved } = dragState.current;
    dragState.current = null;
    if (moved) {
      onDragEnd?.(table.id, Math.round(pos.x), Math.round(pos.y));
    }
  }

  const width = table.width ?? DEFAULT_WIDTH;
  const height = table.height ?? DEFAULT_HEIGHT;
  const blocked = !editable && table.status === "NOT_AVAILABLE";

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => {
        if (!editable && !blocked && !dragState.current?.moved) onClick?.();
      }}
      style={{
        position: "absolute",
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width,
        height,
        borderRadius: CORNER_RADIUS,
        touchAction: "none",
      }}
      className={`flex flex-col items-center justify-center border text-xs font-medium select-none ${
        editable ? "cursor-move" : blocked ? "cursor-not-allowed" : "cursor-pointer"
      } ${statusClasses(table.status, selected)}`}
    >
      <StatusIndicator status={table.status} />
      <span>{table.name}</span>
      <span className="flex items-center gap-0.5 text-[10px] opacity-75">
        <UsersIcon className="w-3 h-3" />
        {table.capacity}
      </span>
    </div>
  );
}

export function FloorPlanCanvas({
  tables,
  editable,
  selectedTableId = null,
  onSelect,
  onDragEnd,
  className = "",
}: {
  tables: TableDto[];
  editable: boolean;
  selectedTableId?: number | null;
  onSelect?: (table: TableDto | null) => void;
  onDragEnd?: (id: number, posX: number, posY: number) => void;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full min-h-[420px] bg-gray-50 border border-gray-200 rounded-xl overflow-auto ${className}`}
    >
      {tables.map((table) => (
        <TableToken
          key={table.id}
          table={table}
          editable={editable}
          selected={table.id === selectedTableId}
          onClick={() => onSelect?.(table)}
          onDragEnd={onDragEnd}
        />
      ))}
      {tables.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          No tables yet — add tables in the list view first.
        </p>
      )}
    </div>
  );
}

const LEGEND: { status: TableDto["status"]; label: string; dot: string }[] = [
  { status: "AVAILABLE", label: "Available", dot: "bg-white border border-gray-300" },
  { status: "OCCUPIED", label: "Occupied", dot: "bg-yellow-100 border border-yellow-300" },
  { status: "RESERVED", label: "Reserved", dot: "bg-blue-100 border border-blue-300" },
  { status: "NOT_AVAILABLE", label: "Not Available", dot: "bg-red-100 border border-red-300" },
];

export function FloorPlanLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
      {LEGEND.map((item) => (
        <span key={item.status} className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-full ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
