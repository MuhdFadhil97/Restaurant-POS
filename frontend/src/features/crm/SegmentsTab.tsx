import { FormEvent, useState } from "react";
import { Badge, Button, Card, ErrorMessage, Input, Modal, Select, Spinner } from "@/components/ui";
import { CreateSegmentInput, SegmentRuleType, useCreateSegment, useSegmentPreview, useSegments } from "@/api/segments";

const RULE_LABELS: Record<SegmentRuleType, string> = {
  ALL_CUSTOMERS: "All customers",
  NO_VISIT_SINCE_DAYS: "No visit in the last N days",
  BIRTHDAY_WITHIN_DAYS: "Birthday within N days",
  TOTAL_SPEND_ABOVE: "Total spend above RM N",
};

const RULE_VALUE_LABEL: Partial<Record<SegmentRuleType, string>> = {
  NO_VISIT_SINCE_DAYS: "Days",
  BIRTHDAY_WITHIN_DAYS: "Days",
  TOTAL_SPEND_ABOVE: "Amount (RM)",
};

function ruleDescription(ruleType: SegmentRuleType, ruleValue: number | null): string {
  switch (ruleType) {
    case "ALL_CUSTOMERS":
      return "All customers";
    case "NO_VISIT_SINCE_DAYS":
      return `No visit in the last ${ruleValue} days`;
    case "BIRTHDAY_WITHIN_DAYS":
      return `Birthday within ${ruleValue} days`;
    case "TOTAL_SPEND_ABOVE":
      return `Total spend ≥ RM ${ruleValue}`;
  }
}

export function SegmentsTab() {
  const { data: segments, isLoading } = useSegments();
  const [showForm, setShowForm] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>New Segment</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Rule</th>
              <th className="px-4 py-2">Created By</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <Spinner />
                </td>
              </tr>
            )}
            {segments?.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 text-gray-500">{ruleDescription(s.ruleType, s.ruleValue)}</td>
                <td className="px-4 py-2 text-gray-500">{s.createdBy.name}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setPreviewId(s.id)} className="text-brand-600 hover:underline">
                    Preview
                  </button>
                </td>
              </tr>
            ))}
            {segments?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No segments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <SegmentFormModal open={showForm} onClose={() => setShowForm(false)} />
      <SegmentPreviewModal
        segmentId={previewId}
        segmentName={segments?.find((s) => s.id === previewId)?.name}
        onClose={() => setPreviewId(null)}
      />
    </div>
  );
}

function SegmentPreviewModal({
  segmentId,
  segmentName,
  onClose,
}: {
  segmentId: number | null;
  segmentName?: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useSegmentPreview(segmentId ?? undefined);

  return (
    <Modal open={!!segmentId} onClose={onClose} title={segmentName ? `Preview: ${segmentName}` : "Preview"} maxWidthClassName="max-w-3xl">
      {isLoading || !data ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{data.totalMatched}</span> customers matched,{" "}
            <span className="font-medium text-gray-900">{data.consentedCount}</span> opted in to marketing.
          </p>

          {data.sample.length > 0 ? (
            <>
              <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-left sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Consent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.sample.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-medium text-gray-900">{c.name}</td>
                        <td className="px-3 py-1.5 text-gray-500">{c.phone || "—"}</td>
                        <td className="px-3 py-1.5 text-gray-500">{c.email || "—"}</td>
                        <td className="px-3 py-1.5">
                          <Badge color={c.marketingConsent ? "green" : "gray"}>
                            {c.marketingConsent ? "Opted in" : "Not opted in"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalMatched > data.sample.length && (
                <p className="text-xs text-gray-400">
                  Showing {data.sample.length} of {data.totalMatched} matched customers.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">No customers match this segment.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function SegmentFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createSegment = useCreateSegment();
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState<SegmentRuleType>("ALL_CUSTOMERS");
  const [ruleValue, setRuleValue] = useState("");

  function reset() {
    setName("");
    setRuleType("ALL_CUSTOMERS");
    setRuleValue("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const input: CreateSegmentInput = {
      name,
      ruleType,
      ruleValue: ruleType === "ALL_CUSTOMERS" ? undefined : Number(ruleValue),
    };
    await createSegment.mutateAsync(input);
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Segment">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rule</label>
          <Select value={ruleType} onChange={(e) => setRuleType(e.target.value as SegmentRuleType)}>
            {Object.entries(RULE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {RULE_VALUE_LABEL[ruleType] && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{RULE_VALUE_LABEL[ruleType]}</label>
            <Input type="number" min={1} value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} required />
          </div>
        )}
        {createSegment.isError && <ErrorMessage message="Failed to create segment." />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSegment.isPending}>
            {createSegment.isPending ? "Creating…" : "Create Segment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
