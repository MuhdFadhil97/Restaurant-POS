import { TableDto } from "@/api/types";

export function TableStrip({
  tables,
  selectedTableId,
  onSelect,
}: {
  tables: TableDto[];
  selectedTableId: string | null;
  onSelect: (table: TableDto | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border ${
          selectedTableId === null
            ? "bg-brand-600 text-white border-brand-600"
            : "bg-white text-gray-700 border-gray-200"
        }`}
      >
        Takeaway / Walk-in
      </button>
      {tables.map((table) => {
        const blocked = table.status === "NOT_AVAILABLE";
        return (
          <button
            key={table.id}
            onClick={() => !blocked && onSelect(table)}
            disabled={blocked}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border flex flex-col items-center min-w-[84px] ${
              blocked ? "cursor-not-allowed opacity-60" : ""
            } ${
              selectedTableId === table.id
                ? "bg-brand-600 text-white border-brand-600"
                : table.status === "OCCUPIED"
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : table.status === "RESERVED"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : table.status === "NOT_AVAILABLE"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-white text-gray-700 border-gray-200"
            }`}
          >
            <span>{table.name}</span>
            <span className="text-[10px] opacity-75">
              {table.status === "NOT_AVAILABLE" ? "NOT AVAILABLE" : table.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}
