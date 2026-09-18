import { useOutletStore } from "@/store/outletStore";
import { useLowStock } from "@/api/inventory";
import { Card, Spinner } from "@/components/ui";

export function LowStockTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: lowStock, isLoading } = useLowStock(outletId ?? undefined);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;
  if (isLoading || !lowStock) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Stock on Hand</th>
              <th className="px-4 py-2">Low Stock Threshold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lowStock.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{s.product.name}</td>
                <td className="px-4 py-2 text-red-600 font-medium">{s.quantity}</td>
                <td className="px-4 py-2">{s.product.lowStockThreshold}</td>
              </tr>
            ))}
            {lowStock.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No low stock items for this outlet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
