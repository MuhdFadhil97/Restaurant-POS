import { useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import { useAttendanceReport, useCorrectAttendance } from "@/api/staffAttendance";
import { StaffAttendance } from "@/api/types";
import { getErrorMessage } from "@/api/client";
import { Badge, Button, Card, ErrorMessage, Input, Select } from "@/components/ui";

// Local calendar-date string (YYYY-MM-DD). Deliberately NOT `.toISOString()`,
// which converts to UTC first and silently shifts the date in a positive-UTC-
// offset timezone like Malaysia (verified bug: see the AttendancePage
// `todayIso()` helper, which uses this same safe pattern).
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayLocalStr() {
  return localDateStr(new Date());
}

function daysAgoLocalStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateStr(d);
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function AttendanceReportTab() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const [from, setFrom] = useState(daysAgoLocalStr(7));
  const [to, setTo] = useState(todayLocalStr());
  const [correcting, setCorrecting] = useState<StaffAttendance | null>(null);

  const { data, isLoading } = useAttendanceReport(outletId ?? undefined, from, to);

  if (!outletId) return <p className="text-gray-500">Select an outlet first.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <span className="text-gray-400">to</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>

      {data && data.weeklyCompliance.length > 0 && (
        <Card className="p-4">
          <p className="font-medium mb-2">Weekly compliance (Malaysia standard: max 45h/week, ≥1 rest day/week)</p>
          <div className="flex flex-wrap gap-2">
            {data.weeklyCompliance
              .filter((w) => w.hasNoRestDay || w.exceedsWeeklyHours)
              .map((w) => (
                <div key={`${w.userId}_${w.weekStart}`} className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  <span className="font-medium">{w.userName}</span> — week of {w.weekStart}: {w.workedHours}h
                  {w.exceedsWeeklyHours && <span className="text-amber-700"> (exceeds 45h)</span>}
                  {w.hasNoRestDay && <span className="text-amber-700"> (no rest day)</span>}
                </div>
              ))}
            {data.weeklyCompliance.every((w) => !w.hasNoRestDay && !w.exceedsWeeklyHours) && (
              <p className="text-sm text-gray-400">No weekly compliance issues in this range.</p>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <p className="p-4 text-gray-400 text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2">Clock In</th>
                <th className="px-4 py-2">Clock Out</th>
                <th className="px-4 py-2">Worked</th>
                <th className="px-4 py-2">Break</th>
                <th className="px-4 py-2">Flags</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r.user?.name}</td>
                  <td className="px-4 py-2">{new Date(r.clockInAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{r.clockOutAt ? new Date(r.clockOutAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2">{formatDuration(r.totalWorkedMinutes)}</td>
                  <td className="px-4 py-2">{formatDuration(r.totalBreakMinutes)}</td>
                  <td className="px-4 py-2 space-x-1">
                    {!r.scheduleId && <Badge color="gray">Unscheduled</Badge>}
                    {r.hasComplianceIssue && <Badge color="yellow">Flagged</Badge>}
                    {r.status !== "CLOCKED_OUT" && <Badge color="blue">{r.status === "ON_BREAK" ? "On Break" : "In Progress"}</Badge>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setCorrecting(r)} className="text-brand-600 hover:underline">
                      Correct
                    </button>
                  </td>
                </tr>
              ))}
              {data?.records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No attendance records in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <CorrectionModal record={correcting} onClose={() => setCorrecting(null)} />
    </div>
  );
}

function CorrectionModal({ record, onClose }: { record: StaffAttendance | null; onClose: () => void }) {
  const correctAttendance = useCorrectAttendance();
  const [clockOutAt, setClockOutAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!record) return null;

  async function handleSave() {
    if (!record) return;
    setError(null);
    try {
      await correctAttendance.mutateAsync({
        id: record.id,
        clockOutAt: clockOutAt ? new Date(clockOutAt).toISOString() : null,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Correct Attendance — {record.user?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500">
            Clock in: {new Date(record.clockInAt).toLocaleString()}
            {record.status !== "CLOCKED_OUT" && " (still open — likely a forgotten shift-out)"}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Clock Out</label>
            <Input type="datetime-local" value={clockOutAt} onChange={(e) => setClockOutAt(e.target.value)} />
          </div>
          {error && <ErrorMessage message={error} />}
          <Button className="w-full" onClick={handleSave} disabled={correctAttendance.isPending}>
            Save Correction
          </Button>
        </div>
      </div>
    </div>
  );
}
