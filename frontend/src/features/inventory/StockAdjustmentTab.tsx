import { useMemo, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useProducts } from "@/api/products";
import { Product } from "@/api/types";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { StockAdjustmentModal } from "@/features/products/StockAdjustmentModal";
import { BulkAdjustmentModal } from "@/features/products/BulkAdjustmentModal";

export function StockAdjustmentTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: products, isLoading } = useProducts(outletId ?? undefined);
  const [search, setSearch] = useState("");
  const [adjustingStock, setAdjustingStock] = useState<Product | null>(null);
  const [showBulkAdjust, setShowBulkAdjust] = useState(false);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.sku.toLowerCase().includes(term) || p.name.toLowerCase().includes(term));
  }, [products, search]);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;
  if (isLoading || !products) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Search SKU or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="secondary" onClick={() => setShowBulkAdjust(true)}>
          Bulk Adjustment (Import)
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleProducts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{p.sku}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.stocks?.[0]?.quantity ?? 0}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setAdjustingStock(p)} className="text-brand-600 hover:underline">
                    Adjust Stock
                  </button>
                </td>
              </tr>
            ))}
            {visibleProducts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <StockAdjustmentModal product={adjustingStock} onClose={() => setAdjustingStock(null)} />

      <BulkAdjustmentModal
        open={showBulkAdjust}
        outletId={outletId ?? undefined}
        onClose={() => setShowBulkAdjust(false)}
      />
    </div>
  );
}
