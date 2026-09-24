import { FormEvent, useEffect, useState } from "react";
import { PrinterInput, useCreatePrinter, useDeletePrinter, usePrinters, useTestPrinter, useUpdatePrinter } from "@/api/printers";
import { useTerminals } from "@/api/terminals";
import { usePrintJob } from "@/api/printJobs";
import { getErrorMessage } from "@/api/client";
import { PrinterConnection, PrinterDto } from "@/api/types";
import { Button, Card, ErrorMessage, Input, Modal, Select } from "@/components/ui";
import { PrinterHealthDot, PrintJobStatusBadge } from "./PrintJobStatus";

const connectionLabels: Record<PrinterConnection, string> = {
  NETWORK_DIRECT: "Network (LAN/Wi-Fi)",
  NETWORK_BRIDGE: "Network via print bridge",
  TERMINAL_LOCAL: "USB / Bluetooth on a terminal",
};

function location(p: PrinterDto) {
  if (p.connection === "TERMINAL_LOCAL") return p.hostTerminal ? `On ${p.hostTerminal.name}` : "—";
  const addr = `${p.host}:${p.port}`;
  return p.connection === "NETWORK_BRIDGE" && p.bridge ? `${addr} via ${p.bridge.name}` : addr;
}

export function PrintersSection({ outletId }: { outletId: number }) {
  const { data: printers } = usePrinters(outletId);
  const createPrinter = useCreatePrinter();
  const updatePrinter = useUpdatePrinter();
  const deletePrinter = useDeletePrinter();
  const testPrinter = useTestPrinter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PrinterDto | null>(null);
  const [testJobs, setTestJobs] = useState<Record<number, number>>({});
  const [testError, setTestError] = useState<string | null>(null);

  async function handleTest(p: PrinterDto) {
    setTestError(null);
    try {
      const job = await testPrinter.mutateAsync(p.id);
      setTestJobs((s) => ({ ...s, [p.id]: job.id }));
    } catch (err) {
      setTestError(getErrorMessage(err));
    }
  }

  async function handleDelete(p: PrinterDto) {
    if (!window.confirm(`Remove printer "${p.name}"? Terminals and kitchen stations using it will stop printing.`)) return;
    await deletePrinter.mutateAsync(p.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Printer</Button>
      </div>
      {testError && <ErrorMessage message={testError} />}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Connection</th>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 font-medium">Paper</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {printers?.map((p) => (
              <tr key={p.id} className={`border-t border-gray-100 ${p.isActive ? "" : "opacity-50"}`}>
                <td className="px-4 py-2 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <PrinterHealthDot lastStatus={p.lastStatus} />
                    {p.name}
                  </span>
                </td>
                <td className="px-4 py-2">{connectionLabels[p.connection]}</td>
                <td className="px-4 py-2 font-mono text-xs">{location(p)}</td>
                <td className="px-4 py-2">{p.paperWidth}mm</td>
                <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                  {testJobs[p.id] && <TestResult jobId={testJobs[p.id]} />}
                  <button
                    onClick={() => handleTest(p)}
                    disabled={!p.isActive}
                    className="text-xs text-brand-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                  >
                    Test print
                  </button>
                  <button onClick={() => setEditing(p)} className="text-xs text-brand-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p)} className="text-xs text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {printers?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No printers yet. Add your receipt and kitchen printers here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PrinterFormModal
        open={showForm}
        outletId={outletId}
        title="New Printer"
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          await createPrinter.mutateAsync({ ...input, outletId, name: input.name!, connection: input.connection! });
          setShowForm(false);
        }}
      />
      <PrinterFormModal
        open={!!editing}
        outletId={outletId}
        initial={editing ?? undefined}
        title="Edit Printer"
        onClose={() => setEditing(null)}
        onSubmit={async (input) => {
          if (!editing) return;
          await updatePrinter.mutateAsync({ id: editing.id, input });
          setEditing(null);
        }}
      />
    </div>
  );
}

function TestResult({ jobId }: { jobId: number }) {
  const { data: job } = usePrintJob(jobId);
  if (!job) return null;
  return (
    <span title={job.lastError ?? undefined}>
      <PrintJobStatusBadge status={job.status} />
    </span>
  );
}

function PrinterFormModal({
  open,
  outletId,
  initial,
  title,
  onClose,
  onSubmit,
}: {
  open: boolean;
  outletId: number;
  initial?: PrinterDto;
  title: string;
  onClose: () => void;
  onSubmit: (input: PrinterInput) => Promise<void>;
}) {
  const { data: terminals } = useTerminals(open ? outletId : undefined);
  const [name, setName] = useState("");
  const [connection, setConnection] = useState<PrinterConnection>("NETWORK_DIRECT");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("9100");
  const [terminalId, setTerminalId] = useState("");
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [charsPerLine, setCharsPerLine] = useState("48");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed on open — the edit instance stays mounted between rows (see TablesTab.tsx).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setConnection(initial?.connection ?? "NETWORK_DIRECT");
      setHost(initial?.host ?? "");
      setPort(initial?.port?.toString() ?? "9100");
      setTerminalId(initial?.terminalId?.toString() ?? "");
      setPaperWidth(initial?.paperWidth ?? 80);
      setCharsPerLine(initial?.charsPerLine?.toString() ?? "48");
      setIsActive(initial?.isActive ?? true);
      setError(null);
    }
  }, [open, initial]);

  function handlePaperWidth(value: 58 | 80) {
    setPaperWidth(value);
    // Typical Font A column counts for each paper size.
    setCharsPerLine(value === 58 ? "32" : "48");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name,
        connection,
        host: connection === "TERMINAL_LOCAL" ? null : host.trim(),
        port: Number(port) || 9100,
        terminalId: connection === "TERMINAL_LOCAL" && terminalId ? Number(terminalId) : null,
        paperWidth,
        charsPerLine: Number(charsPerLine),
        ...(initial ? { isActive } : {}),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isNetwork = connection !== "TERMINAL_LOCAL";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-gray-600">Name</span>
          <Input placeholder="e.g. Counter receipt, Kitchen, Bar" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Connection</span>
          <Select value={connection} onChange={(e) => setConnection(e.target.value as PrinterConnection)}>
            <option value="NETWORK_DIRECT">{connectionLabels.NETWORK_DIRECT}</option>
            <option value="NETWORK_BRIDGE" disabled>
              {connectionLabels.NETWORK_BRIDGE} (coming soon)
            </option>
            <option value="TERMINAL_LOCAL" disabled>
              {connectionLabels.TERMINAL_LOCAL} (coming soon)
            </option>
          </Select>
        </label>
        {isNetwork && (
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <label className="block text-sm">
              <span className="text-gray-600">IP address</span>
              <Input placeholder="192.168.1.50" value={host} onChange={(e) => setHost(e.target.value)} required />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Port</span>
              <Input type="number" value={port} onChange={(e) => setPort(e.target.value)} required />
            </label>
          </div>
        )}
        {connection === "TERMINAL_LOCAL" && (
          <label className="block text-sm">
            <span className="text-gray-600">Plugged into</span>
            <Select value={terminalId} onChange={(e) => setTerminalId(e.target.value)} required>
              <option value="">Choose a terminal…</option>
              {terminals?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-gray-600">Paper width</span>
            <Select value={paperWidth} onChange={(e) => handlePaperWidth(Number(e.target.value) as 58 | 80)}>
              <option value={80}>80mm</option>
              <option value={58}>58mm</option>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Characters per line</span>
            <Input type="number" min={24} max={64} value={charsPerLine} onChange={(e) => setCharsPerLine(e.target.value)} required />
          </label>
        </div>
        {initial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        {error && <ErrorMessage message={error} />}
        <Button type="submit" className="w-full" disabled={submitting}>
          Save
        </Button>
      </form>
    </Modal>
  );
}
