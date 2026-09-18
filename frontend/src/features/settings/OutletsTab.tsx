import { FormEvent, useEffect, useState } from "react";
import { useCreateOutlet, useOutlets, useUpdateOutlet } from "@/api/outlets";
import { Outlet } from "@/api/types";
import { Button, Card, Input, Modal } from "@/components/ui";

export function OutletsTab() {
  const { data: outlets } = useOutlets();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Outlet</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {outlets?.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{o.name}</td>
                <td className="px-4 py-2">{o.address ?? "-"}</td>
                <td className="px-4 py-2">{o.phone ?? "-"}</td>
                <td className="px-4 py-2">{o.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setEditing(o)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <OutletFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createOutlet.mutateAsync(input);
          setShowForm(false);
        }}
        title="New Outlet"
      />
      <OutletFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateOutlet.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
        title="Edit Outlet"
      />
    </div>
  );
}

function OutletFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Partial<Outlet>) => Promise<void>;
  initial?: Outlet;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [receiptLogoUrl, setReceiptLogoUrl] = useState(initial?.receiptLogoUrl ?? "");
  const [receiptFooter, setReceiptFooter] = useState(initial?.receiptFooter ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields from `initial` whenever the modal opens — it stays
  // mounted while hidden, so a stale `useState` initializer would otherwise
  // show the previously-edited outlet's data (or a blank form the first
  // time), same bug as PaymentModal earlier in this build.
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setAddress(initial?.address ?? "");
      setPhone(initial?.phone ?? "");
      setReceiptLogoUrl(initial?.receiptLogoUrl ?? "");
      setReceiptFooter(initial?.receiptFooter ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        address: address || undefined,
        phone: phone || undefined,
        receiptLogoUrl: receiptLogoUrl || undefined,
        receiptFooter: receiptFooter || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="Outlet name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="Receipt logo URL" value={receiptLogoUrl} onChange={(e) => setReceiptLogoUrl(e.target.value)} />
        <Input placeholder="Receipt footer text" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
