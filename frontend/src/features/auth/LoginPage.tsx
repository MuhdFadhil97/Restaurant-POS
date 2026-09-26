import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/api/client";
import { getHomeRoute } from "@/lib/roleHome";
import { Button, Card, ErrorMessage, Input } from "@/components/ui";

export function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const passwordResetDone = Boolean((location.state as { passwordResetDone?: boolean } | null)?.passwordResetDone);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(identifier, password);
      setSession(result.token, result.user);
      navigate(getHomeRoute(result.user.role, result.user.modules));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 px-4">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full border border-orange-300/40" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full border border-orange-300/30" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full border border-amber-300/40" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[26rem] w-[26rem] rounded-full border border-amber-300/30" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative z-10 flex items-center gap-2 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-serif text-sm font-bold text-white">
          R
        </div>
        <span className="font-serif text-sm tracking-wide text-gray-700">Restaurant POS</span>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Card className="w-full max-w-sm border-orange-100/80 bg-white/90 p-8 shadow-xl backdrop-blur">
          <h1 className="mb-1 text-center font-serif text-3xl text-gray-900">POS Login</h1>
          <p className="mb-6 text-center text-sm text-gray-500">Sign in to continue</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email or Username</label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@yourrestaurant.my"
                className="focus:!border-orange-500 focus:!ring-orange-500"
                autoFocus
                required
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-sm text-orange-600 hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus:!border-orange-500 focus:!ring-orange-500"
                required
              />
            </div>
            {passwordResetDone && (
              <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                Password updated — sign in with your new password.
              </p>
            )}
            {error && <ErrorMessage message={error} />}
            <Button type="submit" className="w-full !bg-orange-600 hover:!bg-orange-700" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
