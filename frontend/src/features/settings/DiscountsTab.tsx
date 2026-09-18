import { FormEvent, useEffect, useState } from "react";
import { useCreateDiscount, useDeleteDiscount, useDiscounts, useUpdateDiscount } from "@/api/discounts";
import { Discount, DiscountScope, DiscountType } from "@/api/types";
import { Badge, Button, Card, Input, Modal, Select } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

export function DiscountsTab() {
  const { data: discounts } = useDiscounts();
  const createDiscount = useCreateDiscount();
  const updateDiscount = useUpdateDiscount();
  const deleteDiscount = useDeleteDiscount();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  async function handleDelete(discount: Discount) {
    if (!window.confirm(`Remove discount "${discount.name}"?`)) return;
    await deleteDiscount.mutateAsync(discount.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Discount</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Scope</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Rules</th>
              <th className="px-4 py-2">Usage</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {discounts?.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2">
                  <Badge color="blue">{d.type}</Badge>
                </td>
                <td className="px-4 py-2">{d.scope}</td>
                <td className="px-4 py-2">{d.type === "PERCENTAGE" ? `${d.value}%` : `${money(Number(d.value))}`}</td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {d.minSpend ? `Min ${money(Number(d.minSpend))} ` : ""}
                  {d.startDate ? `From ${new Date(d.startDate).toLocaleDateString()} ` : ""}
                  {d.endDate ? `To ${new Date(d.endDate).toLocaleDateString()}` : ""}
                  {!d.minSpend && !d.startDate && !d.endDate ? "-" : ""}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">
                  {d.usageLimit ? `${d.usageCount ?? 0}/${d.usageLimit}` : "Unlimited"}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing(d)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(d)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {discounts?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No discounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <DiscountFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createDiscount.mutateAsync(input);
          setShowForm(false);
        }}
        title="New Discount / Promotion"
      />
      <DiscountFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateDiscount.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
        title="Edit Discount / Promotion"
      />
    </div>
  );
}

function toDateInputValue(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function DiscountFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  initial?: Discount;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<DiscountType>(initial?.type ?? "PERCENTAGE");
  const [scope, setScope] = useState<DiscountScope>(initial?.scope ?? "ORDER");
  const [value, setValue] = useState(initial?.value?.toString() ?? "");
  const [minSpend, setMinSpend] = useState(initial?.minSpend?.toString() ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.endDate));
  const [usageLimit, setUsageLimit] = useState(initial?.usageLimit?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields from `initial` whenever the modal opens — this component
  // stays mounted (both the create and edit instances) while hidden, so a
  // stale `useState` initializer would otherwise show the previous
  // discount's data instead of the one just clicked (same bug fixed across
  // the other Settings tabs' modals).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setType(initial?.type ?? "PERCENTAGE");
      setScope(initial?.scope ?? "ORDER");
      setValue(initial?.value?.toString() ?? "");
      setMinSpend(initial?.minSpend?.toString() ?? "");
      setStartDate(toDateInputValue(initial?.startDate));
      setEndDate(toDateInputValue(initial?.endDate));
      setUsageLimit(initial?.usageLimit?.toString() ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        type,
        scope,
        value: Number(value),
        minSpend: minSpend ? Number(minSpend) : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-2">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </Select>
        <Select value={scope} onChange={(e) => setScope(e.target.value as DiscountScope)}>
          <option value="ORDER">Order-level</option>
          <option value="LINE">Line-level</option>
        </Select>
        <Input placeholder="Value" type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} required />
        <Input placeholder="Min spend (optional)" type="number" step="0.01" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
        <Input placeholder="Usage limit (optional)" type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start date (optional)</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End date (optional)</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting} className="self-end">
          Save
        </Button>
      </form>
    </Modal>
  );
}
