import { useState } from "react";
import { useAdjustStock } from "@/api/inventory";
import { useOutletStore } from "@/store/outletStore";
import { Product } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Button, ErrorMessage, Input, Modal, Select } from "@/components/ui";

export function StockAdjustmentModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const adjustStock = useAdjustStock();
  const [type, setType] = useState<"RESTOCK" | "WASTAGE" | "CORRECTION">("RESTOCK");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  async function handleSubmit() {
    setError(null);
    const qty = Number(quantity);
    if (!qty) return;
    const signedQty = type === "RESTOCK" ? Math.abs(qty) : -Math.abs(qty);
    try {
      await adjustStock.mutateAsync({
        outletId: outletId!,
        productId: product!.id,
        variantId: variantId ? Number(variantId) : undefined,
        type,
        quantityChange: signedQty,
        reason: reason || undefined,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title={`Adjust Stock — ${product.name}`}>
      <div className="space-y-3">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="RESTOCK">Restock (add)</option>
          <option value="WASTAGE">Wastage (remove)</option>
          <option value="CORRECTION">Correction (remove)</option>
        </Select>
        {product.variants.length > 0 && (
          <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            <option value="">No variant</option>
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.value}
              </option>
            ))}
          </Select>
        )}
        <Input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <ErrorMessage message={error} />}
        <Button className="w-full" onClick={handleSubmit} disabled={adjustStock.isPending}>
          {adjustStock.isPending ? "Saving..." : "Apply Adjustment"}
        </Button>
      </div>
    </Modal>
  );
}
