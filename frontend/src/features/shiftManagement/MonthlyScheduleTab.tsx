import { useMemo, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useOutletStaff, useCreateShiftSchedule, useDeleteShiftSchedule, useShiftSchedulesForMonth } from "@/api/shiftSchedules";
import { useShiftTemplates } from "@/api/shiftTemplates";
import { StaffShiftSchedule } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Button, Card, ErrorMessage, Select } from "@/components/ui";

function parseMonth(month: string): { year: number; month: number } {
  const [year, m] = month.split("-").map(Number);
  return { year, month: m };
}

function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function currentMonthKey(): string {
  const d = new Date();
  return formatMonth(d.getFullYear(), d.getMonth() + 1);
}

const CHIP_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
];

function colorForTemplate(templateId: string): string {
  let hash = 0;
  for (let i = 0; i < templateId.length; i++) hash = (hash * 31 + templateId.charCodeAt(i)) >>> 0;
  return CHIP_COLORS[hash % CHIP_COLORS.length];
}

export function MonthlyScheduleTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const { data: staff } = useOutletStaff(outletId ?? undefined);
  const { data: templates } = useShiftTemplates(outletId ?? undefined);
  const { data: schedules } = useShiftSchedulesForMonth(outletId ?? undefined, monthKey);
  const createSchedule = useCreateShiftSchedule();
  const deleteSchedule = useDeleteShiftSchedule();

  const [assignFor, setAssignFor] = useState<{ userId: string; date: string } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const { year, month } = parseMonth(monthKey);
  const totalDays = daysInMonth(year, month);
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

  const schedulesByUserDay = useMemo(() => {
    const map = new Map<string, StaffShiftSchedule[]>();
    for (const s of schedules ?? []) {
      const day = Number(s.date.slice(8, 10));
      const key = `${s.userId}_${day}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [schedules]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonthKey(formatMonth(next.getFullYear(), next.getMonth() + 1));
  }

  function openAssign(userId: string, day: number) {
    setAssignFor({ userId, date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
    setSelectedTemplateId(templates?.[0]?.id ?? "");
    setError(null);
    setWarning(null);
  }

  async function handleAssign() {
    if (!assignFor || !outletId || !selectedTemplateId) return;
    setError(null);
    try {
      const result = await createSchedule.mutateAsync({
        outletId,
        userId: assignFor.userId,
        shiftTemplateId: selectedTemplateId,
        date: assignFor.date,
      });
      if (result.overlapWarning) {
        setWarning(result.overlapWarning);
      } else {
        setAssignFor(null);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRemove(schedule: StaffShiftSchedule) {
    if (!window.confirm(`Remove ${schedule.shiftTemplate?.name} on ${schedule.date.slice(0, 10)}?`)) return;
    await deleteSchedule.mutateAsync(schedule.id);
  }

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={() => shiftMonth(-1)}>
          ← Prev
        </Button>
        <span className="font-medium">
          {new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <Button variant="secondary" onClick={() => shiftMonth(1)}>
          Next →
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left border-b border-gray-200 min-w-[140px]">
                Staff
              </th>
              {days.map((day) => (
                <th key={day} className="px-2 py-2 border-b border-gray-200 text-center min-w-[64px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff?.map((person) => (
              <tr key={person.id} className="border-b border-gray-100">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium whitespace-nowrap">{person.name}</td>
                {days.map((day) => {
                  const entries = schedulesByUserDay.get(`${person.id}_${day}`) ?? [];
                  return (
                    <td
                      key={day}
                      className="px-1 py-1 text-center align-top cursor-pointer hover:bg-gray-50"
                      onClick={() => openAssign(person.id, day)}
                    >
                      <div className="flex flex-col gap-0.5 items-stretch">
                        {entries.map((entry) => (
                          <span
                            key={entry.id}
                            title="Click to remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(entry);
                            }}
                            className={`text-[10px] rounded px-1 py-0.5 ${colorForTemplate(entry.shiftTemplateId)}`}
                          >
                            {entry.shiftTemplate?.name}
                            {entry.shiftTemplate && entry.shiftTemplate.endTime <= entry.shiftTemplate.startTime && (
                              <> →+1d</>
                            )}
                          </span>
                        ))}
                        {entries.length === 0 && <span className="text-gray-300 text-xs">+</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {staff?.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} className="px-4 py-8 text-center text-gray-400">
                  No staff assigned to this outlet yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {assignFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Assign Shift — {assignFor.date}</h2>
              <button onClick={() => setAssignFor(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                <option value="">Select a shift template</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.startTime}–{t.endTime})
                  </option>
                ))}
              </Select>
              {error && <ErrorMessage message={error} />}
              {warning && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {warning} You can still keep this assignment, or remove it from the grid.
                </div>
              )}
              <Button className="w-full" onClick={handleAssign} disabled={createSchedule.isPending || !selectedTemplateId}>
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
