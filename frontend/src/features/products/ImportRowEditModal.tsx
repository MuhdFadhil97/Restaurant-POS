import { FormEvent, useState } from "react";
import { useCategories } from "@/api/products";
import { useTaxRates } from "@/api/taxRates";
import { useKitchenStations } from "@/api/kitchenStations";
import { Button, Input, Modal, Select } from "@/components/ui";

export function ImportRowEditModal({
  open,
  outletId,
  data,
  onClose,
  onSave,
}: {
  open: boolean;
  outletId?: number;
  data: Record<string, string>;
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
}) {
  const { data: categories } = useCategories();
  const { data: taxRates } = useTaxRates(outletId);
  const { data: stations } = useKitchenStations(outletId);

  const [sku, setSku] = useState(data.sku ?? "");
  const [name, setName] = useState(data.name ?? "");
  const [unitPrice, setUnitPrice] = useState(data.unitPrice ?? "");
  const [costPrice, setCostPrice] = useState(data.costPrice ?? "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(data.unitOfMeasure ?? "");
  const [lowStockThreshold, setLowStockThreshold] = useState(data.lowStockThreshold ?? "");
  const [category, setCategory] = useState(data.category ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [taxRate, setTaxRate] = useState(data.taxRate ?? "");
  const [station, setStation] = useState(data.station ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({
      ...data,
      sku,
      name,
      unitPrice,
      costPrice,
      unitOfMeasure,
      lowStockThreshold,
      category: newCategoryName.trim() || category,
      taxRate,
      station,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Import Row">
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
            <Input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setNewCategoryName("");
              }}
            >
              <option value="">None</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              className="mt-1"
              placeholder="Or type a new category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate</label>
            <Select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}>
              <option value="">None</option>
              {taxRates?.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.rate}%)
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kitchen Station</label>
            <Select value={station} onChange={(e) => setStation(e.target.value)}>
              <option value="">None</option>
              {stations?.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Row</Button>
        </div>
      </form>
    </Modal>
  );
}
