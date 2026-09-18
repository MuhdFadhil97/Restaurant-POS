import { useState } from "react";
import { useAuditLogs } from "@/api/auditLogs";
import { Card, Input, Spinner } from "@/components/ui";

export function AuditLogTab() {
  const [action, setAction] = useState("");
  const { data: logs, isLoading } = useAuditLogs({ action: action || undefined });

  return (
    <div className="space-y-4">
      <Input placeholder="Filter by action (e.g. VOID_TRANSACTION)" value={action} onChange={(e) => setAction(e.target.value)} />
      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs?.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">{l.user?.name ?? "-"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {l.entityType} {l.entityId.slice(0, 8)}
                  </td>
                </tr>
              ))}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No audit log entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
