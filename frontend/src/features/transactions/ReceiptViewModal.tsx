import { useTransaction } from "@/api/transactions";
import { Button, Modal, Spinner } from "@/components/ui";
import { Receipt } from "./Receipt";

export function ReceiptViewModal({
  transactionId,
  onClose,
}: {
  transactionId: number | null;
  onClose: () => void;
}) {
  const { data: transaction, isLoading } = useTransaction(transactionId ?? undefined);

  if (!transactionId) return null;

  return (
    <>
      <Modal open={!!transactionId} onClose={onClose} title="Receipt">
        {isLoading || !transaction ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <Receipt transaction={transaction} />
            <Button variant="secondary" className="w-full" onClick={() => window.print()}>
              Print Receipt
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
