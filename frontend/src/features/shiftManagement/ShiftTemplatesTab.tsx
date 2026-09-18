import { FormEvent, useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useCreateShiftTemplate, useDeleteShiftTemplate, useShiftTemplates, useUpdateShiftTemplate } from "@/api/shiftTemplates";
import { StaffShiftTemplate } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";

export function ShiftTemplatesTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: templates } = useShiftTemplates(outletId ?? undefined);
  const createTemplate = useCreateShiftTemplate();
  const updateTemplate = useUpdateShiftTemplate();
  const deleteTemplate = useDeleteShiftTemplate();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffShiftTemplate | null>(null);

  async function handleDelete(template: StaffShiftTemplate) {
    if (!window.confirm(`Remove shift template "${template.name}"?`)) return;
    await deleteTemplate.mutateAsync(template.id);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ New Shift Template</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2">Break</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates?.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{t.name}</td>
                <td className="px-4 py-2">{t.startTime}</td>
                <td className="px-4 py-2">
                  {t.endTime}
                  {t.endTime <= t.startTime && <span className="text-xs text-gray-400"> (+1 day)</span>}
                </td>
                <td className="px-4 py-2">{t.breakMinutes} min</td>
                <td className="px-4 py-2">{t.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => setEditing(t)} className="text-brand-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {templates?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No shift templates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <ShiftTemplateFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New Shift Template"
        onSubmit={async (input) => {
          await createTemplate.mutateAsync({ outletId, ...input });
          setShowForm(false);
        }}
      />
      <ShiftTemplateFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Shift Template"
        initial={editing ?? undefined}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateTemplate.mutateAsync({ id: editing.id, ...input });
          setEditing(null);
        }}
      />
    </div>
  );
}

function ShiftTemplateFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; startTime: string; endTime: string; breakMinutes: number }) => Promise<void>;
  initial?: StaffShiftTemplate;
  title: string;
}) {
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setStartTime(initial?.startTime ?? "");
      setEndTime(initial?.endTime ?? "");
      setBreakMinutes(initial?.breakMinutes ?? 30);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, startTime, endTime, breakMinutes });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>
          <p className="text-xs text-gray-400">If end time is before start time, the shift is treated as overnight.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Break (minutes)</label>
            <Input
              type="number"
              min={0}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Number(e.target.value))}
            />
          </div>
          {error && <ErrorMessage message={error} />}
          <Button type="submit" className="w-full" disabled={submitting}>
            Save
          </Button>
        </form>
      </div>
    </div>
  );
}
