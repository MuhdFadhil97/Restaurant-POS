import { FormEvent, useState } from "react";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select, Spinner } from "@/components/ui";
import { useDiscounts } from "@/api/discounts";
import { useSegments } from "@/api/segments";
import {
  CampaignSendStatus,
  CampaignStatus,
  CreateCampaignInput,
  useCampaign,
  useCampaigns,
  useCreateCampaign,
  useSendCampaign,
} from "@/api/campaigns";

const STATUS_COLOR: Record<CampaignStatus, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  SENDING: "blue",
  COMPLETED: "green",
  FAILED: "red",
};

const SEND_STATUS_COLOR: Record<CampaignSendStatus, "green" | "red" | "yellow"> = {
  SENT: "green",
  FAILED: "red",
  SKIPPED_NO_CONSENT: "yellow",
  SKIPPED_NO_CONTACT: "yellow",
};

export function CampaignsTab() {
  const { data: campaigns, isLoading } = useCampaigns();
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>New Campaign</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Segment</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Sent / Failed / Skipped</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Spinner />
                </td>
              </tr>
            )}
            {campaigns?.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2 text-gray-500">{c.segment.name}</td>
                <td className="px-4 py-2">
                  <Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {c.counts.sent} / {c.counts.failed} / {c.counts.skipped}
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailId(c.id)} className="text-brand-600 hover:underline">
                    View
                  </button>
                </td>
              </tr>
            ))}
            {campaigns?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <CampaignFormModal open={showForm} onClose={() => setShowForm(false)} />
      <CampaignDetailModal campaignId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CampaignFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: segments } = useSegments();
  const { data: discounts } = useDiscounts();
  const createCampaign = useCreateCampaign();

  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [discountId, setDiscountId] = useState("");

  function reset() {
    setName("");
    setSegmentId("");
    setSubject("");
    setBody("");
    setDiscountId("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const input: CreateCampaignInput = {
      name,
      segmentId: Number(segmentId),
      subject,
      body,
      discountId: discountId ? Number(discountId) : undefined,
    };
    await createCampaign.mutateAsync(input);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Campaign" maxWidthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Segment</label>
          <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)} required>
            <option value="">Select segment</option>
            {segments?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attach a discount (optional)</label>
          <Select value={discountId} onChange={(e) => setDiscountId(e.target.value)}>
            <option value="">None</option>
            {discounts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email body — use <code>{"{{customerName}}"}</code> to personalize
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {createCampaign.isError && <ErrorMessage message="Failed to create campaign." />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCampaign.isPending}>
            {createCampaign.isPending ? "Creating…" : "Save as Draft"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CampaignDetailModal({ campaignId, onClose }: { campaignId: number | null; onClose: () => void }) {
  const { data: campaign, isLoading } = useCampaign(campaignId ?? undefined);
  const sendCampaign = useSendCampaign();

  async function handleSend() {
    if (!campaignId) return;
    if (!window.confirm("Send this campaign now? This can't be undone.")) return;
    await sendCampaign.mutateAsync(campaignId);
  }

  return (
    <Modal open={!!campaignId} onClose={onClose} title={campaign?.name ?? "Campaign"} maxWidthClassName="max-w-2xl">
      {isLoading || !campaign ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge color={STATUS_COLOR[campaign.status]}>{campaign.status}</Badge>
            <span className="text-sm text-gray-500">Segment: {campaign.segment.name}</span>
          </div>
          <div className="text-sm">
            <p className="font-medium">{campaign.subject}</p>
            <p className="text-gray-500 whitespace-pre-wrap mt-1">{campaign.body}</p>
          </div>

          {campaign.status === "DRAFT" && (
            <Button onClick={handleSend} disabled={sendCampaign.isPending}>
              {sendCampaign.isPending ? "Sending…" : "Send Now"}
            </Button>
          )}
          {sendCampaign.isError && <ErrorMessage message="Failed to send campaign." />}

          {campaign.sends.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-2">Recipients</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-3 py-1.5">Customer</th>
                    <th className="px-3 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaign.sends.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-1.5">{s.customer.name}</td>
                      <td className="px-3 py-1.5">
                        <Badge color={SEND_STATUS_COLOR[s.status]}>{s.status.replace(/_/g, " ")}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
