import { TransactionDto } from "@/api/types";
import { Modal } from "@/components/ui";
import { money } from "./cartMath";

export function HeldTransactionsModal({
  open,
  onClose,
  transactions,
  onResume,
}: {
  open: boolean;
  onClose: () => void;
  transactions: TransactionDto[];
  onResume: (transaction: TransactionDto) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Held Transactions">
      {transactions.length === 0 ? (
        <p className="text-sm text-gray-400">No held transactions.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <button
              key={t.id}
              onClick={() => onResume(t)}
              className="w-full flex justify-between items-center px-3 py-2 border border-gray-200 rounded-lg hover:border-brand-500 text-left"
            >
              <div>
                <p className="text-sm font-medium">{t._count?.items ?? t.items.length} items</p>
                <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleTimeString()}</p>
              </div>
              <span className="font-semibold">{money(Number(t.total))}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
