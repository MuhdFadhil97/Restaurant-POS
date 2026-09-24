import { TransactionDto } from "@/api/types";
import { Modal, Button } from "@/components/ui";
import { Receipt } from "@/features/transactions/Receipt";
import { useReceiptPrinting } from "@/features/hardware/useReceiptPrinting";

export function ReceiptPreviewModal({
  transaction,
  onClose,
}: {
  transaction: TransactionDto | null;
  onClose: () => void;
}) {
  const printing = useReceiptPrinting(transaction);
  if (!transaction) return null;
  return (
    <Modal open={!!transaction} onClose={onClose} title="Payment Successful">
      <div className="space-y-4">
        {printing.status}
        <Receipt transaction={transaction} />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={printing.print} disabled={printing.printing}>
            {printing.printLabel}
          </Button>
          <Button className="flex-1" onClick={onClose}>
            New Sale
          </Button>
        </div>
      </div>
    </Modal>
  );
}
