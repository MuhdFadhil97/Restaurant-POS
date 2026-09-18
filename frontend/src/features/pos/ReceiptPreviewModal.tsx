import { TransactionDto } from "@/api/types";
import { Modal, Button } from "@/components/ui";
import { Receipt } from "@/features/transactions/Receipt";

export function ReceiptPreviewModal({
  transaction,
  onClose,
}: {
  transaction: TransactionDto | null;
  onClose: () => void;
}) {
  if (!transaction) return null;
  return (
    <Modal open={!!transaction} onClose={onClose} title="Payment Successful">
      <div className="space-y-4">
        <Receipt transaction={transaction} />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
            Print
          </Button>
          <Button className="flex-1" onClick={onClose}>
            New Sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}
