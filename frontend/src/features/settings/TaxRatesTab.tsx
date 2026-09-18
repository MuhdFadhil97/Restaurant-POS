import { FormEvent, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useCreateTaxRate, useTaxRates } from "@/api/taxRates";
import { Button, Card, Input } from "@/components/ui";

export function TaxRatesTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: taxRates } = useTaxRates(outletId ?? undefined);
  const createTaxRate = useCreateTaxRate();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!outletId) return;
    await createTaxRate.mutateAsync({ outletId, name, rate: Number(rate), isDefault });
    setName("");
    setRate("");
    setIsDefault(false);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Default</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {taxRates?.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2">{t.name}</td>
                <td className="px-4 py-2">{t.rate}%</td>
                <td className="px-4 py-2">{t.isDefault ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Add Tax Rate</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-2 items-end">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="Rate %" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
          <Button type="submit" disabled={createTaxRate.isPending}>
            Add
          </Button>
          <label className="flex items-center gap-2 text-sm col-span-3">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Set as default for this outlet
          </label>
        </form>
      </Card>
    </div>
  );
}
