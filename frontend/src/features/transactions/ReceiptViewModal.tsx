import { useTransaction } from "@/api/transactions";
import { Button, Modal, Spinner } from "@/components/ui";
import { Receipt } from "./Receipt";
import { useReceiptPrinting } from "@/features/hardware/useReceiptPrinting";

export function ReceiptViewModal({
  transactionId,
  onClose,
}: {
  transactionId: number | null;
  onClose: () => void;
}) {
  const { data: transaction, isLoading } = useTransaction(transactionId ?? undefined);
  const printing = useReceiptPrinting(transaction);

  if (!transactionId) return null;

  return (
    <>
      <Modal open={!!transactionId} onClose={onClose} title="Receipt">
        {isLoading || !transaction ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            {printing.status}
            <Receipt transaction={transaction} />
            <Button variant="secondary" className="w-full" onClick={printing.print} disabled={printing.printing}>
              {printing.printer ? printing.printLabel : "Print Receipt"}
            </Button>
          </div>
        )}
      </Modal>
      {transaction && (
        <div className="hidden print:block">
          <Receipt transaction={transaction} />
        </div>
      )}
    </>
  );
}
