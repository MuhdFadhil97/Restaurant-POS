import { FormEvent, useEffect, useState } from "react";
import {
  useCreateCustomer,
  useCustomerHistory,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/api/customers";
import { Customer, CustomerSource } from "@/api/types";
import { Button, Card, Input, Modal, Select, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

const sourceLabel: Record<CustomerSource, string> = {
  WALK_IN: "Walk-In",
  SOCIAL_MEDIA: "Social Media",
  REFERRAL: "Referral",
  THIRD_PARTY: "Third Party (Grab & Food Panda)",
  ONLINE: "Online",
};

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useCustomers(search);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [historyFor, setHistoryFor] = useState<Customer | null>(null);

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`Remove customer "${customer.name}"?`)) return;
    await deleteCustomer.mutateAsync(customer.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Customers</h1>
        <Button onClick={() => setShowForm(true)}>+ New Customer</Button>
      </div>

      <Input placeholder="Search by name, phone, or email" value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Points</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.phone ?? "-"}</td>
                  <td className="px-4 py-2">{c.email ?? "-"}</td>
                  <td className="px-4 py-2">{c.source ? sourceLabel[c.source] : "-"}</td>
                  <td className="px-4 py-2">{c.pointsBalance ?? 0}</td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => setHistoryFor(c)} className="text-brand-600 hover:underline">
                      History
                    </button>
                    <button onClick={() => setEditing(c)} className="text-brand-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {customers?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No customers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <CustomerFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Customer"
        onSubmit={async (input) => {
          await createCustomer.mutateAsync(input);
          setShowForm(false);
        }}
      />
      <CustomerFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Customer"
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateCustomer.mutateAsync({ id: editing.id, ...input });
          setEditing(null);
        }}
      />

      <CustomerHistoryModal customer={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}

function CustomerFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: Partial<Customer>) => Promise<void>;
  initial?: Customer;
  title: string;
}) {
  const [name, setName] = useState("");
  const [identificationNo, setIdentificationNo] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState<CustomerSource | "">("");
  const [submitting, setSubmitting] = useState(false);

  // The modal stays mounted while hidden, so re-seed fields from `initial`
  // each time it opens (same fix as OutletsTab.tsx / PaymentModal.tsx).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setIdentificationNo(initial?.identificationNo ?? "");
      setDateOfBirth(initial?.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : "");
      setPhone(initial?.phone ?? "");
      setEmail(initial?.email ?? "");
      setAddress(initial?.address ?? "");
      setSource(initial?.source ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        identificationNo: identificationNo || undefined,
        dateOfBirth: dateOfBirth || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        source: source || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Identification No.</label>
          <Input value={identificationNo} onChange={(e) => setIdentificationNo(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <Select value={source} onChange={(e) => setSource(e.target.value as CustomerSource | "")}>
            <option value="">Select source</option>
            <option value="WALK_IN">Walk-In</option>
            <option value="SOCIAL_MEDIA">Social Media</option>
            <option value="REFERRAL">Referral</option>
            <option value="THIRD_PARTY">Third Party (Grab & Food Panda)</option>
            <option value="ONLINE">Online</option>
          </Select>
        </div>
        {initial?.createdAt && (
          <p className="text-xs text-gray-400">
            Registration Date: {new Date(initial.createdAt).toLocaleDateString()}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}

function CustomerHistoryModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const { data: history, isLoading } = useCustomerHistory(customer?.id);
  return (
    <Modal open={!!customer} onClose={onClose} title={`Purchase History — ${customer?.name ?? ""}`}>
      {isLoading ? (
        <Spinner />
      ) : history && history.length > 0 ? (
        <div className="space-y-2">
          {history.map((t) => (
            <div key={t.id} className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              <span className="font-medium">{money(Number(t.total))}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No purchases yet.</p>
      )}
    </Modal>
  );
}
