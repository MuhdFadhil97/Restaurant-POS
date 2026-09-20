import { FormEvent, useState } from "react";
import { useCreateCustomer, useCustomers } from "@/api/customers";
import { getErrorMessage } from "@/api/client";
import { Button, ErrorMessage, Input, Modal, Spinner } from "@/components/ui";

export function CustomerPickerModal({
  open,
  onClose,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const { data: customers, isLoading } = useCustomers(search);

  function close() {
    setSearch("");
    setShowNewForm(false);
    onClose();
  }

  function handleSelect(id: number | null) {
    onSelect(id);
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Select Customer">
      {showNewForm ? (
        <NewCustomerForm onCreated={(id) => handleSelect(id)} onCancel={() => setShowNewForm(false)} />
      ) : (
        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            <button
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedId === null ? "bg-brand-50" : ""}`}
            >
              <p className="text-sm font-medium">Walk-in customer</p>
              <p className="text-xs text-gray-400">No customer attached to this order</p>
            </button>

            {isLoading && <Spinner />}
            {!isLoading &&
              customers?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${c.id === selectedId ? "bg-brand-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{c.pointsBalance ?? 0} pts</span>
                  </div>
                  <p className="text-xs text-gray-400">{c.phone || c.email || "-"}</p>
                </button>
              ))}
            {!isLoading && customers?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No customers found.</p>
            )}
          </div>

          <Button variant="secondary" className="w-full" onClick={() => setShowNewForm(true)}>
            + New Customer
          </Button>
        </div>
      )}
    </Modal>
  );
}

function NewCustomerForm({ onCreated, onCancel }: { onCreated: (id: number) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createCustomer = useCreateCustomer();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await createCustomer.mutateAsync({ name, phone: phone || undefined });
      onCreated(created.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorMessage message={error} />}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit" disabled={createCustomer.isPending}>
          Save &amp; Select
        </Button>
      </div>
    </form>
  );
}
