import { FormEvent, useEffect, useState } from "react";
import { useCreateSupplier, useDeleteSupplier, useSuppliers, useUpdateSupplier } from "@/api/suppliers";
import {
  useCreateSupplierProduct,
  useDeleteSupplierProduct,
  useSupplierProducts,
  useUpdateSupplierProduct,
} from "@/api/supplierProducts";
import { useProducts } from "@/api/products";
import { useOutletStore } from "@/store/outletStore";
import { Supplier } from "@/api/types";
import { Button, Card, ErrorMessage, Input, Modal, Select, Spinner } from "@/components/ui";
import { getErrorMessage } from "@/api/client";
import { money } from "@/features/pos/cartMath";

export function SuppliersTab() {
  const { data: suppliers } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [catalogFor, setCatalogFor] = useState<Supplier | null>(null);

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
                  <button onClick={() => setCatalogFor(s)} className="text-brand-600 hover:underline">
                    Products
                  </button>
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

      <SupplierProductsModal supplier={catalogFor} onClose={() => setCatalogFor(null)} />
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
  const [address, setAddress] = useState(initial?.address ?? "");
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(initial?.taxRegistrationNumber ?? "");
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [bankAccountName, setBankAccountName] = useState(initial?.bankAccountName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initial?.bankAccountNumber ?? "");
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
      setAddress(initial?.address ?? "");
      setTaxRegistrationNumber(initial?.taxRegistrationNumber ?? "");
      setBankName(initial?.bankName ?? "");
      setBankAccountName(initial?.bankAccountName ?? "");
      setBankAccountNumber(initial?.bankAccountNumber ?? "");
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
        address: address || undefined,
        taxRegistrationNumber: taxRegistrationNumber || undefined,
        bankName: bankName || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
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
        <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input
          placeholder="Tax registration number"
          value={taxRegistrationNumber}
          onChange={(e) => setTaxRegistrationNumber(e.target.value)}
        />
        <Input
          placeholder="Payment terms (e.g. Net 30)"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <Input
            placeholder="Account name"
            value={bankAccountName}
            onChange={(e) => setBankAccountName(e.target.value)}
          />
          <Input
            placeholder="Account number"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}

function SupplierProductsModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: products } = useProducts(outletId ?? undefined);
  const { data: catalog } = useSupplierProducts(supplier?.id);
  const createEntry = useCreateSupplierProduct();
  const updateEntry = useUpdateSupplierProduct();
  const deleteEntry = useDeleteSupplierProduct();

  const [productId, setProductId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [supplierSku, setSupplierSku] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setProductId("");
      setUnitCost("");
      setLeadTimeDays("");
      setSupplierSku("");
      setError(null);
    }
  }, [supplier]);

  if (!supplier) return null;

  async function handleAdd() {
    if (!supplier || !productId || !unitCost) return;
    setError(null);
    try {
      await createEntry.mutateAsync({
        supplierId: supplier.id,
        productId: Number(productId),
        unitCost: Number(unitCost),
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
        supplierSku: supplierSku || undefined,
      });
      setProductId("");
      setUnitCost("");
      setLeadTimeDays("");
      setSupplierSku("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Modal open={!!supplier} onClose={onClose} title={`${supplier.name} — Product Catalog`} maxWidthClassName="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-2 items-end">
          <Select value={productId} onChange={(e) => setProductId(e.target.value)} className="col-span-4">
            <option value="">Product</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Supplier SKU"
            className="col-span-3"
            value={supplierSku}
            onChange={(e) => setSupplierSku(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Unit cost"
            className="col-span-2"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Lead days"
            className="col-span-2"
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
          />
          <Button className="col-span-1" onClick={handleAdd} disabled={createEntry.isPending || !productId || !unitCost}>
            +
          </Button>
        </div>
        {error && <ErrorMessage message={error} />}

        {!catalog ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 text-left">
              <tr>
                <th className="py-1">Product</th>
                <th className="py-1">SKU</th>
                <th className="py-1 text-right">Unit Cost</th>
                <th className="py-1 text-right">Lead Days</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {catalog.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-1">{entry.product.name}</td>
                  <td className="py-1">{entry.supplierSku ?? "-"}</td>
                  <td className="py-1 text-right">{money(Number(entry.unitCost))}</td>
                  <td className="py-1 text-right">{entry.leadTimeDays ?? "-"}</td>
                  <td className="py-1 text-right space-x-2">
                    <button
                      onClick={() =>
                        updateEntry.mutate({ id: entry.id, input: { isPreferred: !entry.isPreferred } })
                      }
                      className={entry.isPreferred ? "text-brand-600" : "text-gray-400 hover:text-brand-600"}
                    >
                      {entry.isPreferred ? "★ Preferred" : "☆ Prefer"}
                    </button>
                    <button
                      onClick={() => deleteEntry.mutate({ id: entry.id, supplierId: supplier.id })}
                      className="text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {catalog.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No products in this supplier's catalog yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
