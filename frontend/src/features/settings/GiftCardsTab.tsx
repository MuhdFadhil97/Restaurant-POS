import { FormEvent, useEffect, useState } from "react";
import { useCreateGiftCard, useGiftCards, useUpdateGiftCard } from "@/api/giftCards";
import { GiftCard } from "@/api/types";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

export function GiftCardsTab() {
  const { data: giftCards } = useGiftCards();
  const createGiftCard = useCreateGiftCard();
  const updateGiftCard = useUpdateGiftCard();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GiftCard | null>(null);

  async function handleDelete(giftCard: GiftCard) {
    if (!window.confirm(`Deactivate gift card "${giftCard.code}"? It will no longer be usable at checkout.`)) return;
    await updateGiftCard.mutateAsync({ id: giftCard.id, input: { isActive: false } });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Gift Card</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Balance</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Issued</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {giftCards?.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono">{g.code}</td>
                <td className="px-4 py-2">{money(Number(g.balance))}</td>
                <td className="px-4 py-2">
                  <Badge color={g.isActive ? "green" : "red"}>{g.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-2">{new Date(g.issuedAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => setEditing(g)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                  {g.isActive && (
                    <button onClick={() => handleDelete(g)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {giftCards?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No gift cards issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <GiftCardFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createGiftCard.mutateAsync(input as { code?: string; balance: number });
          setShowForm(false);
        }}
        title="New Gift Card"
      />
      <GiftCardFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateGiftCard.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
        title="Edit Gift Card"
      />
    </div>
  );
}

function GiftCardFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { code?: string; balance?: number; isActive?: boolean }) => Promise<void>;
  initial?: GiftCard;
  title: string;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed fields from `initial` whenever the modal opens — same fix as
  // the other Settings tabs' create/edit modals (see memory.md).
  useEffect(() => {
    if (open) {
      setCode(initial?.code ?? "");
      setBalance(initial?.balance?.toString() ?? "");
      setIsActive(initial?.isActive ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (initial) {
        await onSubmit({ balance: Number(balance), isActive });
      } else {
        await onSubmit({ code: code || undefined, balance: Number(balance) });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Code (optional, auto-generated)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!!initial}
        />
        <Input
          placeholder="Balance"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          required
        />
        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {initial ? "Save" : "Issue"}
        </Button>
      </form>
    </Modal>
  );
}
