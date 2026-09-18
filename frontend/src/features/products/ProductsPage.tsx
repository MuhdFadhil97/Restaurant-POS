import { useMemo, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useCategories, useCreateProduct, useProducts, useUpdateProduct } from "@/api/products";
import { useLowStock } from "@/api/inventory";
import { Product } from "@/api/types";
import { Button, Card, Input, Modal, Select, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { ProductForm } from "./ProductForm";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { ImportProductsModal } from "./ImportProductsModal";
import { BulkAdjustmentModal } from "./BulkAdjustmentModal";

type SortColumn = "sku" | "name" | "category" | "stock";
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sort: { column: SortColumn; direction: SortDirection } | null;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  return (
    <th className="px-4 py-2">
      <button
        onClick={() => onSort(column)}
        className={`flex items-center gap-1 hover:text-gray-700 ${active ? "text-gray-900 font-semibold" : ""}`}
      >
        {label}
        <span className="text-[10px] w-3 inline-block">{active ? (sort!.direction === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}

export function ProductsPage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: products, isLoading } = useProducts(outletId ?? undefined);
  const { data: categories } = useCategories();
  const { data: lowStock } = useLowStock(outletId ?? undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulkAdjust, setShowBulkAdjust] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<Product | null>(null);

  const [skuSearch, setSkuSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection } | null>(null);

  function handleSort(column: SortColumn) {
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      return null;
    });
  }

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    const sku = skuSearch.trim().toLowerCase();
    const name = nameSearch.trim().toLowerCase();
    let result = products.filter((p) => {
      if (sku && !p.sku.toLowerCase().includes(sku)) return false;
      if (name && !p.name.toLowerCase().includes(name)) return false;
      if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
      return true;
    });

    if (sort) {
      const dir = sort.direction === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sort.column) {
          case "sku":
            return a.sku.localeCompare(b.sku) * dir;
          case "name":
            return a.name.localeCompare(b.name) * dir;
          case "category":
            return (a.category?.name ?? "").localeCompare(b.category?.name ?? "") * dir;
          case "stock":
            return ((a.stocks?.[0]?.quantity ?? 0) - (b.stocks?.[0]?.quantity ?? 0)) * dir;
          default:
            return 0;
        }
      });
    }
    return result;
  }, [products, skuSearch, nameSearch, categoryFilter, sort]);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;
  if (isLoading || !products) return <Spinner />;

  async function handleCreate(payload: Record<string, unknown>) {
    await createProduct.mutateAsync(payload);
    setShowForm(false);
  }

  async function handleUpdate(payload: Record<string, unknown>) {
    if (!editing) return;
    await updateProduct.mutateAsync({ id: editing.id, input: payload });
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            Import Products
          </Button>
          <Button variant="secondary" onClick={() => setShowBulkAdjust(true)}>
            Bulk Adjustment (Import)
          </Button>
          <Button onClick={() => setShowForm(true)}>+ New Product</Button>
        </div>
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <p className="font-medium mb-1">Low stock alert</p>
          <ul className="list-disc list-inside">
            {lowStock.map((s) => (
              <li key={s.id}>
                {s.product.name} — {s.quantity} left (threshold {s.product.lowStockThreshold})
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Search SKU..." value={skuSearch} onChange={(e) => setSkuSearch(e.target.value)} />
          <Input placeholder="Search Name..." value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} />
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <SortHeader label="SKU" column="sku" sort={sort} onSort={handleSort} />
              <SortHeader label="Name" column="name" sort={sort} onSort={handleSort} />
              <SortHeader label="Category" column="category" sort={sort} onSort={handleSort} />
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Cost</th>
              <SortHeader label="Stock" column="stock" sort={sort} onSort={handleSort} />
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleProducts.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{p.sku}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.category?.name ?? "-"}</td>
                <td className="px-4 py-2">{money(Number(p.unitPrice))}</td>
                <td className="px-4 py-2">{p.costPrice !== undefined ? `${money(Number(p.costPrice))}` : "-"}</td>
                <td className="px-4 py-2">{p.stocks?.[0]?.quantity ?? 0}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setAdjustingStock(p)} className="text-brand-600 hover:underline">
                    Adjust Stock
                  </button>
                  <button onClick={() => setEditing(p)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {visibleProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Product">
        <ProductForm onSubmit={handleCreate} submitting={createProduct.isPending} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Product">
        {editing && <ProductForm initial={editing} onSubmit={handleUpdate} submitting={updateProduct.isPending} />}
      </Modal>

      <StockAdjustmentModal product={adjustingStock} onClose={() => setAdjustingStock(null)} />

      <ImportProductsModal open={showImport} outletId={outletId ?? undefined} onClose={() => setShowImport(false)} />

      <BulkAdjustmentModal
        open={showBulkAdjust}
        outletId={outletId ?? undefined}
        onClose={() => setShowBulkAdjust(false)}
      />
    </div>
  );
}
