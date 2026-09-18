import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button, ErrorMessage, Input, Modal } from "@/components/ui";

export function VoidRefundModal({
  open,
  onClose,
  mode,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  mode: "void" | "refund";
  onConfirm: (input: { reason: string; approverId?: string; approverPassword?: string }) => void;
  busy: boolean;
  error: string | null;
}) {
  const user = useAuthStore((s) => s.user);
  const needsApproval = user?.role === "CASHIER";
  const [reason, setReason] = useState("");
  const [approverId, setApproverId] = useState("");
  const [approverPassword, setApproverPassword] = useState("");

  return (
    <Modal open={open} onClose={onClose} title={mode === "void" ? "Void Transaction" : "Refund Transaction"}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>

        {needsApproval && (
          <>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Manager or admin approval is required. Ask them to enter their user ID and password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approver User ID</label>
              <Input value={approverId} onChange={(e) => setApproverId(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approver Password</label>
              <Input type="password" value={approverPassword} onChange={(e) => setApproverPassword(e.target.value)} />
            </div>
          </>
        )}

        {error && <ErrorMessage message={error} />}

        <Button
          variant="danger"
          className="w-full"
          disabled={!reason || busy}
          onClick={() => onConfirm({ reason, approverId: approverId || undefined, approverPassword: approverPassword || undefined })}
        >
          {busy ? "Processing..." : mode === "void" ? "Void Transaction" : "Refund Transaction"}
        </Button>
      </div>
    </Modal>
  );
}
