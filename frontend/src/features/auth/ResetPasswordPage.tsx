import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate("/login", { state: { passwordResetDone: true } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 px-4">
        <Card className="w-full max-w-sm border-orange-100/80 bg-white/90 p-8 shadow-xl backdrop-blur">
          <p className="text-center text-sm text-gray-600">
            This link is missing its reset token. Request a new one below.
          </p>
          <Link to="/forgot-password" className="mt-4 block text-center text-sm text-orange-600 hover:underline">
            Request a new link
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 px-4">
      <Card className="w-full max-w-sm border-orange-100/80 bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="mb-1 text-center font-serif text-2xl text-gray-900">Set a new password</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {error && <ErrorMessage message={error} />}
          <Button type="submit" className="w-full !bg-orange-600 hover:!bg-orange-700" disabled={loading}>
            {loading ? "Saving..." : "Set password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
