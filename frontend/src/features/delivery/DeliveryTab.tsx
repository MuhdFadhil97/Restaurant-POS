import { FormEvent, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import {
  useCreateDeliveryPlatform,
  useDeleteDeliveryPlatform,
  useDeliveryPlatforms,
  useUpdateDeliveryPlatform,
} from "@/api/delivery";
import { DeliveryPlatform, DeliveryProvider } from "@/api/types";
import { apiClient, getErrorMessage } from "@/api/client";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select } from "@/components/ui";

const PROVIDERS: { value: DeliveryProvider; label: string; adapterReady: boolean }[] = [
  { value: "CUSTOM", label: "Custom / generic webhook", adapterReady: true },
  { value: "GRAB", label: "Grab", adapterReady: false },
  { value: "FOODPANDA", label: "Foodpanda", adapterReady: false },
  { value: "DOORDASH", label: "DoorDash", adapterReady: false },
];

export function DeliveryTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: platforms } = useDeliveryPlatforms(outletId ?? 0);
  const createPlatform = useCreateDeliveryPlatform();
  const updatePlatform = useUpdateDeliveryPlatform();
  const deletePlatform = useDeleteDeliveryPlatform();

  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<DeliveryPlatform | null>(null);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  async function handleToggleActive(platform: DeliveryPlatform) {
    await updatePlatform.mutateAsync({ id: platform.id, isActive: !platform.isActive });
  }

  async function handleDelete(platform: DeliveryPlatform) {
    if (!window.confirm(`Remove "${platform.name}"? Its webhook URL stops accepting orders immediately.`)) return;
    await deletePlatform.mutateAsync(platform.id);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Connect a delivery/online-ordering platform. Incoming orders land on the Delivery Orders Kanban board for
        staff to accept, prepare and hand to the courier — only the <strong>Custom / generic webhook</strong>{" "}
        provider is wired up so far (Grab/Foodpanda/DoorDash need that platform's own sandbox credentials).
      </p>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Provider</th>
              <th className="px-4 py-2 font-medium">Auto-accept</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {platforms?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.provider}</td>
                <td className="px-4 py-2">{p.autoAccept ? "Yes" : "No"}</td>
                <td className="px-4 py-2">
                  <Badge color={p.isActive ? "green" : "gray"}>{p.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap space-x-3">
                  <button onClick={() => handleToggleActive(p)} className="text-xs text-brand-600 hover:underline">
                    {p.isActive ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => handleDelete(p)} className="text-xs text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {platforms?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No delivery platforms connected yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Button onClick={() => setShowForm(true)}>+ Connect Platform</Button>

      <NewPlatformModal
        open={showForm}
        onClose={() => setShowForm(false)}
        outletId={outletId}
        onCreated={(p) => setCreated(p)}
      />
      <WebhookInfoModal platform={created} onClose={() => setCreated(null)} />
    </div>
  );
}

function NewPlatformModal({
  open,
  onClose,
  outletId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  outletId: number;
  onCreated: (platform: DeliveryPlatform) => void;
}) {
  const createPlatform = useCreateDeliveryPlatform();
  const [provider, setProvider] = useState<DeliveryProvider>("CUSTOM");
  const [name, setName] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [autoAccept, setAutoAccept] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setProvider("CUSTOM");
    setName("");
    setWebhookSecret("");
    setApiKey("");
    setAutoAccept(false);
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const platform = await createPlatform.mutateAsync({
        outletId,
        provider,
        name,
        webhookSecret: webhookSecret || undefined,
        apiKey: apiKey || undefined,
        autoAccept,
      });
      reset();
      onClose();
      onCreated(platform);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Connect Delivery Platform"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {formError && <ErrorMessage message={formError} />}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Provider</label>
          <Select value={provider} onChange={(e) => setProvider(e.target.value as DeliveryProvider)}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
                {!p.adapterReady ? " (not wired up yet)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Display name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grab (Main Outlet)" required />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Webhook secret</label>
          <Input
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="Used to verify incoming webhook signatures"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">API key (optional)</label>
          <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="For outbound status pushes" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoAccept} onChange={(e) => setAutoAccept(e.target.checked)} />
          Auto-accept incoming orders (skip the manual accept step)
        </label>
        <Button type="submit" className="w-full" disabled={submitting}>
          Connect
        </Button>
      </form>
    </Modal>
  );
}

function WebhookInfoModal({ platform, onClose }: { platform: DeliveryPlatform | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!platform) return null;

  const webhookUrl = `${(apiClient.defaults.baseURL ?? "").replace(/\/$/, "")}/delivery/webhooks/${platform.id}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — the URL is still shown to copy by hand.
    }
  }

  return (
    <Modal open={!!platform} onClose={onClose} title={`"${platform.name}" is connected`}>
      <div className="space-y-3 text-sm">
        <p className="text-gray-600">
          Give this URL to {platform.provider === "CUSTOM" ? "your ordering site/integration" : platform.provider} as
          its webhook endpoint. It must sign each request with the webhook secret you entered (HMAC-SHA256 of the
          raw body, hex-encoded, in an <code className="text-xs">X-Webhook-Signature</code> header).
        </p>
        <div className="flex gap-2">
          <code className="flex-1 font-mono text-xs bg-gray-100 rounded-lg px-3 py-2 break-all">{webhookUrl}</code>
          <Button variant="secondary" onClick={copy} className="shrink-0">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
