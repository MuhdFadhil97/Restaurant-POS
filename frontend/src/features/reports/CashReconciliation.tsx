import { useState } from "react";
import { useCashSessions } from "@/api/cashSessions";
import { Card, Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";

export function CashReconciliation({ outletId }: { outletId: number }) {
  const { data: sessions, isLoading } = useCashSessions(outletId);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? sessions : sessions?.slice(0, 5);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Cash Session Reconciliation</h2>
        {sessions && sessions.length > 5 && (
          <button onClick={() => setShowAll((v) => !v)} className="text-xs text-brand-600 hover:underline">
            {showAll ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="py-1">Opened</th>
              <th className="py-1">Expected</th>
              <th className="py-1">Actual</th>
              <th className="py-1">Diff</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible?.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="py-1">{new Date(s.openedAt).toLocaleString()}</td>
                <td className="py-1">{s.expectedCash != null ? `${money(Number(s.expectedCash))}` : "-"}</td>
                <td className="py-1">{s.actualCash != null ? `${money(Number(s.actualCash))}` : "-"}</td>
                <td className={`py-1 ${Number(s.difference) < 0 ? "text-red-500" : Number(s.difference) > 0 ? "text-green-600" : ""}`}>
                  {s.difference != null ? `${money(Number(s.difference))}` : "-"}
                </td>
                <td className="py-1">{s.status}</td>
              </tr>
            ))}
            {visible?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">
                  No cash sessions recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
}
