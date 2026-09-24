import { useEffect, useState } from "react";
import { PrinterDto } from "@/api/types";
import { Badge, Button, ErrorMessage } from "@/components/ui";
import {
  PrinterDriver,
  isLocalPrintingSupported,
  isWebSerialSupported,
  isWebUsbSupported,
  pairSerialPrinter,
  pairUsbPrinter,
} from "@/lib/hardware/localPrinter";
import { LocalPrinterConnectionState, tryReconnectLocalPrinter, useLocalPrintAgent } from "@/lib/hardware/useLocalPrintAgent";

// Which transport this browser last paired a given printer with, so a page
// reload can silently re-attach instead of asking the user to pick it again.
// Browser-local by design — it's a property of this specific device/browser
// profile, same reasoning as terminalStore.ts.
function storageKey(printerId: number) {
  return `pos-local-printer-transport-${printerId}`;
}
function getStoredTransport(printerId: number): "serial" | "usb" | null {
  try {
    const v = localStorage.getItem(storageKey(printerId));
    return v === "serial" || v === "usb" ? v : null;
  } catch {
    return null;
  }
}
function setStoredTransport(printerId: number, transport: "serial" | "usb" | null) {
  try {
    if (transport) localStorage.setItem(storageKey(printerId), transport);
    else localStorage.removeItem(storageKey(printerId));
  } catch {
    // Private browsing or storage disabled — connect just asks again next time.
  }
}

const stateLabels: Record<LocalPrinterConnectionState, string> = {
  disconnected: "Not connected",
  connected: "Connected",
  error: "Error",
};
const stateColors: Record<LocalPrinterConnectionState, "gray" | "green" | "red"> = {
  disconnected: "gray",
  connected: "green",
  error: "red",
};

export function LocalPrinterCard({ printer, terminalId }: { printer: PrinterDto; terminalId: number }) {
  const [driver, setDriver] = useState<PrinterDriver | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, lastError } = useLocalPrintAgent(terminalId, printer.id, driver);

  // Silently re-attach on load if this browser paired with this printer before.
  useEffect(() => {
    let cancelled = false;
    const transport = getStoredTransport(printer.id);
    if (!transport) return;
    tryReconnectLocalPrinter(transport)
      .then((d) => {
        if (!cancelled && d) setDriver(d);
        else if (!cancelled) setStoredTransport(printer.id, null); // permission was revoked/device gone
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only on mount for this printer — pairing itself updates state directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printer.id]);

  async function connect(transport: "serial" | "usb") {
    setConnecting(true);
    setError(null);
    try {
      const newDriver = transport === "serial" ? await pairSerialPrinter() : await pairUsbPrinter();
      setDriver(newDriver);
      setStoredTransport(printer.id, transport);
    } catch (err) {
      // The user closing the browser's picker without choosing anything also
      // lands here (as a DOMException) — not worth alarming about.
      setError((err as Error).message || "Couldn't connect to the printer");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    await driver?.disconnect();
    setDriver(null);
    setStoredTransport(printer.id, null);
  }

  return (
    <div className="border border-gray-200 rounded-lg px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{printer.name}</span>
        <Badge color={stateColors[state]}>{stateLabels[state]}</Badge>
      </div>
      {driver ? (
        <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
          <span>{driver.label}</span>
          <button onClick={disconnect} className="text-red-500 hover:underline">
            Disconnect
          </button>
        </div>
      ) : isLocalPrintingSupported() ? (
        <div className="flex gap-2">
          {isWebUsbSupported() && (
            <Button variant="secondary" className="text-xs py-1" onClick={() => connect("usb")} disabled={connecting}>
              Connect via USB
            </Button>
          )}
          {isWebSerialSupported() && (
            <Button variant="secondary" className="text-xs py-1" onClick={() => connect("serial")} disabled={connecting}>
              Connect via serial/COM port
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          Not available in this browser or connection — needs Chrome or Edge, over HTTPS or on localhost.
        </p>
      )}
      {(error || lastError) && <ErrorMessage message={error ?? lastError ?? ""} />}
    </div>
  );
}
