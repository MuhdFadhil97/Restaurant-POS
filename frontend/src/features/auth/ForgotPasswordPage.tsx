import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(identifier);
      // Same response whether or not the account exists — never confirm or
      // deny which, that's an account-enumeration leak.
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 px-4">
      <Card className="w-full max-w-sm border-orange-100/80 bg-white/90 p-8 shadow-xl backdrop-blur">
        <h1 className="mb-1 text-center font-serif text-2xl text-gray-900">Reset your password</h1>
        {sent ? (
          <p className="mt-4 text-center text-sm text-gray-600">
            If that account exists, we've sent a password reset link to its email address. It expires in 1 hour.
          </p>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-gray-500">
              Enter your email or username and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@yourrestaurant.my"
                autoFocus
                required
              />
              {error && <ErrorMessage message={error} />}
              <Button type="submit" className="w-full !bg-orange-600 hover:!bg-orange-700" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          </>
        )}
        <Link to="/login" className="mt-4 block text-center text-sm text-orange-600 hover:underline">
          Back to login
        </Link>
      </Card>
    </div>
  );
}
