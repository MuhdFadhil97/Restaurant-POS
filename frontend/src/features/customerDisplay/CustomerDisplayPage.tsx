import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient, getErrorMessage, resolveAssetUrl } from "@/api/client";
import { DisplaySnapshot } from "@/api/customerDisplay";
import { Spinner } from "@/components/ui";
import { money } from "@/features/pos/cartMath";
import { channelName } from "@/features/hardware/customerDisplayChannel";

interface DisplayInfo {
  terminalId: number;
  mode: "NONE" | "SAME_DEVICE" | "REMOTE";
  outlet: { name: string; receiptLogoUrl: string | null };
}

const IDLE_SNAPSHOT: Pick<DisplaySnapshot, "status" | "lines" | "totals"> = {
  status: "IDLE",
  lines: [],
  totals: { subtotal: 0, discountTotal: 0, serviceChargeTotal: 0, taxTotal: 0, total: 0 },
};

// Full-screen, customer-facing screen for one terminal — a second monitor at
// the till (BroadcastChannel, same browser) or a separate tablet (SSE, this
// page is opened on it directly by its display link).
export function CustomerDisplayPage() {
  const { token = "" } = useParams();
  const [info, setInfo] = useState<DisplayInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Pick<DisplaySnapshot, "status" | "lines" | "totals">>(IDLE_SNAPSHOT);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<DisplayInfo>(`/customer-display/token/${token}`)
      .then((res) => !cancelled && setInfo(res.data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!info || info.mode === "NONE") return;

    if (info.mode === "SAME_DEVICE") {
      setConnected(true);
      let channel: BroadcastChannel | null = null;
      try {
        channel = new BroadcastChannel(channelName(info.terminalId));
        channel.onmessage = (e) => setCart(e.data);
      } catch {
        setConnected(false);
      }
      return () => channel?.close();
    }

    // REMOTE: the backend relays PUTs from the terminal over this stream.
    const base = apiClient.defaults.baseURL?.replace(/\/$/, "") ?? "";
    const source = new EventSource(`${base}/customer-display/stream/${token}`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (e) => {
      try {
        setCart(JSON.parse(e.data));
      } catch {
        // Ignore a malformed/keep-alive frame.
      }
    };
    return () => source.close();
  }, [info, token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6 text-center">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (info.mode === "NONE") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400 p-6 text-center">
        <p className="text-lg">Customer display isn't enabled for this terminal.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="flex items-center justify-center gap-3 py-8 border-b border-gray-800">
        {info.outlet.receiptLogoUrl && (
          <img src={resolveAssetUrl(info.outlet.receiptLogoUrl)} alt="" className="h-14 object-contain" />
        )}
        <h1 className="text-3xl font-bold tracking-wide">{info.outlet.name}</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        {!connected ? (
          <p className="text-gray-500 text-xl">Connecting…</p>
        ) : cart.status === "PAID" ? (
          <ThankYou totals={cart.totals} />
        ) : cart.lines.length === 0 ? (
          <p className="text-gray-500 text-3xl font-light">Welcome!</p>
        ) : (
          <Cart cart={cart} />
        )}
      </div>
    </div>
  );
}

function Cart({ cart }: { cart: Pick<DisplaySnapshot, "lines" | "totals"> }) {
  return (
    <div className="w-full max-w-2xl">
      <div className="divide-y divide-gray-800">
        {cart.lines.map((line, i) => (
          <div key={i} className="flex items-center justify-between py-3 text-xl">
            <div className="min-w-0 pr-4">
              <p className="truncate">
                <span className="text-gray-500 mr-2">{line.quantity}×</span>
                {line.name}
              </p>
              {line.variantLabel && <p className="text-sm text-gray-500">{line.variantLabel}</p>}
            </div>
            <span className="shrink-0 font-medium">{money(line.lineTotal)}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-6 border-t-2 border-gray-700 space-y-2 text-lg text-gray-300">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(cart.totals.subtotal)}</span>
        </div>
        {cart.totals.discountTotal > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{money(cart.totals.discountTotal)}</span>
          </div>
        )}
        {cart.totals.serviceChargeTotal > 0 && (
          <div className="flex justify-between">
            <span>Service Charge</span>
            <span>{money(cart.totals.serviceChargeTotal)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{money(cart.totals.taxTotal)}</span>
        </div>
        <div className="flex justify-between text-3xl font-bold text-white pt-2">
          <span>Total</span>
          <span>{money(cart.totals.total)}</span>
        </div>
      </div>
    </div>
  );
}

function ThankYou({ totals }: { totals: DisplaySnapshot["totals"] }) {
  return (
    <div className="text-center space-y-4">
      <p className="text-5xl font-bold">Thank you!</p>
      <p className="text-2xl text-gray-400">Amount paid: {money(totals.total)}</p>
    </div>
  );
}
