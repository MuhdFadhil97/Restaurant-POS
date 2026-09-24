import { FormEvent, useState } from "react";
import {
  PrintBridgeDto,
  PrintBridgeWithToken,
  useCreatePrintBridge,
  useDeletePrintBridge,
  usePrintBridges,
  useRegeneratePrintBridgeToken,
  useUpdatePrintBridge,
} from "@/api/printBridges";
import { apiClient } from "@/api/client";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";

// A bridge polls every few seconds by default; anything quieter than this is
// worth flagging as offline, distinct from a terminal's slower heartbeat.
const BRIDGE_ONLINE_WINDOW_MS = 15_000;
function isBridgeOnline(lastSeenAt: string | null) {
  return !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < BRIDGE_ONLINE_WINDOW_MS;
}

export function PrintBridgesSection({ outletId }: { outletId: number }) {
  const { data: bridges } = usePrintBridges(outletId);
  const createBridge = useCreatePrintBridge();
  const updateBridge = useUpdatePrintBridge();
  const deleteBridge = useDeletePrintBridge();
  const regenerateToken = useRegeneratePrintBridgeToken();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [issued, setIssued] = useState<PrintBridgeWithToken | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const bridge = await createBridge.mutateAsync({ outletId, name: name.trim() });
    setName("");
    setIssued(bridge);
  }

  function startEdit(b: PrintBridgeDto) {
    setEditingId(b.id);
    setEditingName(b.name);
  }

  async function saveEdit(id: number) {
    if (!editingName.trim()) return;
    await updateBridge.mutateAsync({ id, name: editingName.trim() });
    setEditingId(null);
  }

  async function handleRegenerate(b: PrintBridgeDto) {
    if (!window.confirm(`Regenerate the token for "${b.name}"? The old token stops working immediately.`)) return;
    setIssued(await regenerateToken.mutateAsync(b.id));
  }

  async function handleDelete(b: PrintBridgeDto) {
    if (!window.confirm(`Remove bridge "${b.name}"? Printers connected through it will stop working.`)) return;
    await deleteBridge.mutateAsync(b.id);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        A print bridge is a small program run on a PC in the restaurant that forwards print jobs to LAN printers, for
        when the POS backend is hosted remotely rather than on-site.
      </p>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bridges?.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  {editingId === b.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(b.id)}
                      autoFocus
                    />
                  ) : (
                    b.name
                  )}
                </td>
                <td className="px-4 py-2">
                  {isBridgeOnline(b.lastSeenAt) ? (
                    <Badge color="green">Online</Badge>
                  ) : (
                    <span className="text-gray-400">
                      {b.lastSeenAt ? `Last seen ${new Date(b.lastSeenAt).toLocaleString()}` : "Never connected"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                  {editingId === b.id ? (
                    <>
                      <button onClick={() => saveEdit(b.id)} className="text-xs text-brand-600 hover:underline">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(b)} className="text-xs text-brand-600 hover:underline">
                        Rename
                      </button>
                      <button onClick={() => handleRegenerate(b)} className="text-xs text-gray-500 hover:underline">
                        Regenerate token
                      </button>
                      <button onClick={() => handleDelete(b)} className="text-xs text-red-500 hover:underline">
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {bridges?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  No print bridges yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Add Print Bridge</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input placeholder="e.g. Back office PC" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" disabled={createBridge.isPending}>
            Add
          </Button>
        </form>
      </Card>

      <BridgeTokenModal bridge={issued} onClose={() => setIssued(null)} />
    </div>
  );
}

function BridgeTokenModal({ bridge, onClose }: { bridge: PrintBridgeWithToken | null; onClose: () => void }) {
  const [copied, setCopied] = useState<"token" | "env" | null>(null);
  if (!bridge) return null;

  const apiUrl = apiClient.defaults.baseURL ?? "";
  const envSnippet = `API_URL="${apiUrl}"\nBRIDGE_TOKEN="${bridge.token}"\n`;

  async function copy(text: string, which: "token" | "env") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be denied — the value is still shown to copy by hand.
    }
  }

  return (
    <Modal open={!!bridge} onClose={onClose} title={`"${bridge.name}" is ready`}>
      <div className="space-y-4 text-sm">
        <p className="text-red-600 font-medium">
          This token is shown only once. Copy it now — if you lose it, regenerate a new one instead.
        </p>
        <div>
          <p className="text-gray-600 mb-1">Token</p>
          <div className="flex gap-2">
            <code className="flex-1 font-mono text-xs bg-gray-100 rounded-lg px-3 py-2 break-all">{bridge.token}</code>
            <Button variant="secondary" onClick={() => copy(bridge.token, "token")} className="shrink-0">
              {copied === "token" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-gray-600 mb-1">
            Paste this into <code className="text-xs">print-bridge/.env</code> on the PC that will run the bridge:
          </p>
          <div className="flex gap-2">
            <pre className="flex-1 font-mono text-xs bg-gray-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-all">{envSnippet}</pre>
            <Button variant="secondary" onClick={() => copy(envSnippet, "env")} className="shrink-0 self-start">
              {copied === "env" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
