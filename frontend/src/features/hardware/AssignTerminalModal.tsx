import { FormEvent, useState } from "react";
import { useCreateTerminal, useTerminals } from "@/api/terminals";
import { getErrorMessage } from "@/api/client";
import { useTerminalStore } from "@/store/terminalStore";
import { Badge, Button, ErrorMessage, Input, Modal } from "@/components/ui";
import { isOnline } from "./useCurrentTerminal";

// Registers *this* device as one of the outlet's terminals — pick an existing
// one or create a new one on the spot.
export function AssignTerminalModal({
  open,
  onClose,
  outletId,
}: {
  open: boolean;
  onClose: () => void;
  outletId: number;
}) {
  const { data: terminals } = useTerminals(open ? outletId : undefined);
  const createTerminal = useCreateTerminal();
  const assign = useTerminalStore((s) => s.assign);
  const currentId = useTerminalStore((s) => s.terminalByOutlet[outletId]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function choose(terminalId: number) {
    assign(outletId, terminalId);
    onClose();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const terminal = await createTerminal.mutateAsync({ outletId, name });
      setName("");
      choose(terminal.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const active = terminals?.filter((t) => t.isActive) ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Set up this device">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Choose which terminal this device is. Its receipt printer and cash drawer will be used for sales made here.
        </p>
        <div className="space-y-2">
          {active.map((t) => (
            <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{t.name}</span>
                {t.id === currentId ? (
                  <Badge color="blue">This device</Badge>
                ) : (
                  isOnline(t.lastSeenAt) && <Badge color="yellow">In use elsewhere</Badge>
                )}
                <span className="text-xs text-gray-400">
                  {t.receiptPrinter ? `Printer: ${t.receiptPrinter.name}` : "No receipt printer"}
                </span>
              </div>
              <Button variant="secondary" className="text-sm py-1" onClick={() => choose(t.id)} disabled={t.id === currentId}>
                Use this
              </Button>
            </div>
          ))}
          {terminals && active.length === 0 && <p className="text-sm text-gray-400">No terminals yet — create one below.</p>}
        </div>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input placeholder="New terminal name (e.g. Counter 1)" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" disabled={createTerminal.isPending} className="whitespace-nowrap">
            Create &amp; use
          </Button>
        </form>
        {error && <ErrorMessage message={error} />}
      </div>
    </Modal>
  );
}
