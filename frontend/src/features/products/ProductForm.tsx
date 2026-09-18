import { FormEvent, useState } from "react";
import { useCategories, useCreateCategory } from "@/api/products";
import { useOutletStore } from "@/store/outletStore";
import { useTaxRates } from "@/api/taxRates";
import { useKitchenStations } from "@/api/kitchenStations";
import { Product } from "@/api/types";
import { Button, ErrorMessage, Input, Select } from "@/components/ui";
import { getErrorMessage } from "@/api/client";

interface VariantDraft {
  id?: number;
  name: string;
  value: string;
  priceAdjustment: number;
}

export function ProductForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Product;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
}) {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: categories } = useCategories();
  const { data: taxRates } = useTaxRates(outletId ?? undefined);
  const { data: stations } = useKitchenStations(outletId ?? undefined);
  const createCategory = useCreateCategory();

  const [sku, setSku] = useState(initial?.sku ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice?.toString() ?? "");
  const [costPrice, setCostPrice] = useState(initial?.costPrice?.toString() ?? "");
  const [taxRateId, setTaxRateId] = useState(initial?.taxRateId ?? "");
  const [stationId, setStationId] = useState(initial?.stationId ?? "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(initial?.unitOfMeasure ?? "unit");
  const [lowStockThreshold, setLowStockThreshold] = useState(initial?.lowStockThreshold?.toString() ?? "5");
  const [variants, setVariants] = useState<VariantDraft[]>(
    initial?.variants.map((v) => ({ id: v.id, name: v.name, value: v.value, priceAdjustment: v.priceAdjustment })) ?? []
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addVariant() {
    setVariants((prev) => [...prev, { name: "Size", value: "", priceAdjustment: 0 }]);
  }
  function updateVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function removeVariant(i: number) {
    setVariants((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const created = await createCategory.mutateAsync(newCategoryName.trim());
    setCategoryId(created.id);
    setNewCategoryName("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        sku,
        name,
        categoryId: categoryId || undefined,
        unitPrice: Number(unitPrice),
        costPrice: Number(costPrice),
        taxRateId: taxRateId || undefined,
        stationId: stationId || undefined,
        unitOfMeasure,
        lowStockThreshold: Number(lowStockThreshold),
        variants: variants.map((v) => ({ ...v, priceAdjustment: Number(v.priceAdjustment) })),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
          <Input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
          <Input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measure</label>
          <Input value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
          <Input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate</label>
          <Select value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}>
            <option value="">None</option>
            {taxRates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.rate}%)
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kitchen Station</label>
          <Select value={stationId} onChange={(e) => setStationId(e.target.value)}>
            <option value="">None</option>
            {stations?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <Button type="button" variant="secondary" onClick={handleAddCategory}>
          Add
        </Button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Variants</label>
          <button type="button" onClick={addVariant} className="text-sm text-brand-600 hover:underline">
            + Add variant
          </button>
        </div>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <Input placeholder="Name" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} />
              <Input placeholder="Value" value={v.value} onChange={(e) => updateVariant(i, { value: e.target.value })} />
              <Input
                type="number"
                step="0.01"
                placeholder="+Price"
                value={v.priceAdjustment}
                onChange={(e) => updateVariant(i, { priceAdjustment: Number(e.target.value) })}
              />
              <button type="button" onClick={() => removeVariant(i)} className="text-gray-300 hover:text-red-500">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving..." : "Save Product"}
      </Button>
    </form>
  );
}
