import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useInventoryMovements } from "@/api/inventory";
import { useProducts } from "@/api/products";
import { MovementType } from "@/api/types";
import { Badge, Card, Select, Spinner } from "@/components/ui";

const typeColor: Record<MovementType, "gray" | "yellow" | "blue" | "green" | "red"> = {
  RESTOCK: "green",
  WASTAGE: "red",
  CORRECTION: "yellow",
  SALE: "blue",
  REFUND: "blue",
  TRANSFER_OUT: "gray",
  TRANSFER_IN: "gray",
};

export function MovementLogTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: products } = useProducts(outletId ?? undefined);
  const [productId, setProductId] = useState("");
  const { data: movements, isLoading } = useInventoryMovements(
    outletId ?? undefined,
    productId ? Number(productId) : undefined
  );

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <Select value={productId} onChange={(e) => setProductId(e.target.value)} className="max-w-xs">
        <option value="">All products</option>
        {products?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      <Card className="overflow-hidden">
        {isLoading || !movements ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Qty Change</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {m.product.name}
                    {m.variant ? ` (${m.variant.value})` : ""}
                  </td>
                  <td className="px-4 py-2">
                    <Badge color={typeColor[m.type]}>{m.type.replace("_", " ")}</Badge>
                  </td>
                  <td className={`px-4 py-2 font-medium ${m.quantityChange < 0 ? "text-red-600" : "text-green-700"}`}>
                    {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{m.reason ?? "-"}</td>
                  <td className="px-4 py-2">{m.performedBy.name}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No stock movements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
