import { FormEvent, useEffect, useState } from "react";
import { useCreateSupplier, useDeleteSupplier, useSuppliers, useUpdateSupplier } from "@/api/suppliers";
import { Supplier } from "@/api/types";
import { Button, Card, Input, Modal } from "@/components/ui";

export function SuppliersTab() {
  const { data: suppliers } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  async function handleDelete(supplier: Supplier) {
    if (!window.confirm(`Remove supplier "${supplier.name}"?`)) return;
    await deleteSupplier.mutateAsync(supplier.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Supplier</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Payment Terms</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers?.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">{s.contactName ?? "-"}</td>
                <td className="px-4 py-2">{s.email ?? "-"}</td>
                <td className="px-4 py-2">{s.phone ?? "-"}</td>
                <td className="px-4 py-2">{s.paymentTerms ?? "-"}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing(s)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {suppliers?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <SupplierFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createSupplier.mutateAsync(input);
          setShowForm(false);
        }}
        title="New Supplier"
      />
      <SupplierFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateSupplier.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
        title="Edit Supplier"
      />
    </div>
  );
}

function SupplierFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Partial<Supplier>) => Promise<void>;
  initial?: Supplier;
  title: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields from `initial` whenever the modal opens — see the same
  // fix in OutletsTab.tsx / PaymentModal.tsx for why this is needed.
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setContactName(initial?.contactName ?? "");
      setEmail(initial?.email ?? "");
      setPhone(initial?.phone ?? "");
      setPaymentTerms(initial?.paymentTerms ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        paymentTerms: paymentTerms || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          placeholder="Payment terms (e.g. Net 30)"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
