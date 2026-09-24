import { useEffect, useRef, useState } from "react";
import { ackLocalPrintJob, claimLocalPrintJobs } from "@/api/printJobs";
import { PrinterDriver, reconnectSerialPrinter, reconnectUsbPrinter } from "./localPrinter";

const POLL_MS = 3000;

export type LocalPrinterConnectionState = "disconnected" | "connected" | "error";

// Runs the claim -> print -> ack loop for USB/Bluetooth printers plugged
// into THIS terminal. `driver` is supplied by whoever paired the printer
// (see LocalPrinterCard) — this hook only owns delivery, not pairing, since
// pairing requires a user gesture (a click) and must happen in a component.
export function useLocalPrintAgent(terminalId: number | undefined, printerId: number | undefined, driver: PrinterDriver | null) {
  const [state, setState] = useState<LocalPrinterConnectionState>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const driverRef = useRef(driver);
  driverRef.current = driver;

  useEffect(() => {
    setState(driver ? "connected" : "disconnected");
  }, [driver]);

  useEffect(() => {
    if (!terminalId || !printerId || !driver) return;
    let stopped = false;

    async function tick() {
      try {
        const jobs = await claimLocalPrintJobs(terminalId!);
        for (const job of jobs.filter((j) => j.printerId === printerId)) {
          const activeDriver = driverRef.current;
          if (!activeDriver) break; // disconnected mid-batch
          try {
            const bytes = Uint8Array.from(atob(job.payload), (c) => c.charCodeAt(0));
            await activeDriver.print(bytes);
            await ackLocalPrintJob(job.id, { ok: true });
          } catch (err) {
            await ackLocalPrintJob(job.id, { ok: false, error: (err as Error).message });
            if (!stopped) setLastError((err as Error).message);
          }
        }
        if (!stopped) setState("connected");
      } catch {
        // A claim-request failure (network blip) doesn't mean the printer
        // itself disconnected — leave the driver connected and try again.
      }
    }

    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [terminalId, printerId, driver]);

  return { state, lastError };
}

// Tries to silently re-attach to a printer this browser paired with earlier
// (no permission prompt — only already-granted ports/devices are eligible).
// Returns null if there's nothing to reconnect to.
export async function tryReconnectLocalPrinter(transport: "serial" | "usb"): Promise<PrinterDriver | null> {
  return transport === "serial" ? reconnectSerialPrinter() : reconnectUsbPrinter();
}
