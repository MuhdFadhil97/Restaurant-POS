import { useEffect, useState } from "react";
import { useOutletStore } from "@/store/outletStore";
import {
  useClockIn,
  useClockOut,
  useCurrentAttendance,
  useEndBreak,
  useMyAttendanceHistory,
  useStartBreak,
} from "@/api/staffAttendance";
import { useMyShiftSchedules } from "@/api/shiftSchedules";
import { getErrorMessage } from "@/api/client";
import { Badge, Button, Card, ErrorMessage, Spinner } from "@/components/ui";

const MAX_CONSECUTIVE_HOURS_BEFORE_BREAK = 5;

function todayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function AttendancePage() {
  const outletId = useOutletStore((s) => s.activeOutletId);
  const { data: current, isLoading } = useCurrentAttendance();
  const { data: todaySchedules } = useMyShiftSchedules(todayIso(), todayIso());
  const { data: history } = useMyAttendanceHistory(daysAgoIso(7), todayIso());
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();

  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [lastSummary, setLastSummary] = useState<{ totalWorkedMinutes: number; totalBreakMinutes: number; hasComplianceIssue: boolean; complianceNotes: string | null } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const openBreak = current?.breaks.find((b) => !b.breakEnd);
  const isClockedIn = current?.status === "CLOCKED_IN";
  const isOnBreak = current?.status === "ON_BREAK";

  // Minutes worked continuously since clock-in or since the last break ended.
  const lastBreakEnd = current?.breaks
    .filter((b) => b.breakEnd)
    .map((b) => new Date(b.breakEnd!).getTime())
    .sort((a, b) => b - a)[0];
  const continuousSinceMs = current
    ? Math.max(lastBreakEnd ?? new Date(current.clockInAt).getTime(), new Date(current.clockInAt).getTime())
    : 0;
  const continuousMinutes = current ? Math.floor((now.getTime() - continuousSinceMs) / 60000) : 0;
  const showBreakReminder = isClockedIn && continuousMinutes >= MAX_CONSECUTIVE_HOURS_BEFORE_BREAK * 60;

  async function handleClockIn() {
    if (!outletId) return;
    setError(null);
    setLastSummary(null);
    try {
      await clockIn.mutateAsync({ outletId });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleClockOut() {
    setError(null);
    try {
      const result = await clockOut.mutateAsync();
      setLastSummary({
        totalWorkedMinutes: result.totalWorkedMinutes ?? 0,
        totalBreakMinutes: result.totalBreakMinutes ?? 0,
        hasComplianceIssue: result.hasComplianceIssue,
        complianceNotes: result.complianceNotes ?? null,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleStartBreak() {
    setError(null);
    try {
      await startBreak.mutateAsync();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleEndBreak() {
    setError(null);
    try {
      await endBreak.mutateAsync();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (isLoading) return <Spinner />;

  const todaySchedule = todaySchedules?.[0];

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-semibold">My Shift</h1>

      <Card className="p-5 space-y-4">
        {todaySchedule && (
          <p className="text-sm text-gray-500">
            Today's scheduled shift: <span className="font-medium text-gray-700">{todaySchedule.shiftTemplate?.name}</span>{" "}
            ({todaySchedule.shiftTemplate?.startTime}–{todaySchedule.shiftTemplate?.endTime})
          </p>
        )}

        {!current && (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-3">Not clocked in</p>
            <Button onClick={handleClockIn} disabled={clockIn.isPending || !outletId}>
              Shift In
            </Button>
          </div>
        )}

        {current && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {isOnBreak ? "On break since" : "Clocked in since"}{" "}
                  {new Date(isOnBreak && openBreak ? openBreak.breakStart : current.clockInAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {!current.scheduleId && <Badge color="yellow">Unscheduled</Badge>}
              </div>
              <Badge color={isOnBreak ? "yellow" : "green"}>{isOnBreak ? "On Break" : "Clocked In"}</Badge>
            </div>

            {showBreakReminder && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                You've worked {formatDuration(continuousMinutes)} continuously — Malaysia Employment Act recommends a
                break after {MAX_CONSECUTIVE_HOURS_BEFORE_BREAK} hours.
              </div>
            )}

            <div className="flex gap-2">
              {isClockedIn && (
                <>
                  <Button variant="secondary" onClick={handleStartBreak} disabled={startBreak.isPending}>
                    Start Break
                  </Button>
                  <Button variant="danger" onClick={handleClockOut} disabled={clockOut.isPending}>
                    Shift Out
                  </Button>
                </>
              )}
              {isOnBreak && (
                <Button onClick={handleEndBreak} disabled={endBreak.isPending}>
                  End Break
                </Button>
              )}
            </div>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {lastSummary && (
          <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-1">
            <p className="font-medium text-gray-700">Shift summary</p>
            <p className="text-gray-600">Worked: {formatDuration(lastSummary.totalWorkedMinutes)}</p>
            <p className="text-gray-600">Break: {formatDuration(lastSummary.totalBreakMinutes)}</p>
            {lastSummary.hasComplianceIssue && (
              <p className="text-amber-700">{lastSummary.complianceNotes}</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="font-medium mb-2">Recent history (last 7 days)</p>
        {history && history.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {history.map((h) => (
              <div key={h.id} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <p className="text-gray-700">{new Date(h.clockInAt).toLocaleDateString()}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(h.clockInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {h.clockOutAt ? new Date(h.clockOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-700">{h.totalWorkedMinutes != null ? formatDuration(h.totalWorkedMinutes) : "—"}</p>
                  {h.hasComplianceIssue && <Badge color="yellow">Flagged</Badge>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No attendance history yet.</p>
        )}
      </Card>
    </div>
  );
}
