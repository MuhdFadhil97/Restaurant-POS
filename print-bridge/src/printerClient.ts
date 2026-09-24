import net from "net";

// Raw TCP to a LAN thermal printer (port 9100 / JetDirect protocol) — the
// same approach the backend uses for NETWORK_DIRECT printers
// (backend/src/lib/printing/transports/networkDirect.ts), duplicated here
// since this agent ships as its own standalone deployable.
export function sendToPrinter(host: string, port: number, payload: Buffer, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    socket.setTimeout(timeoutMs, () => done(new Error(`Printer ${host}:${port} timed out`)));
    socket.once("error", (err) => done(new Error(`Printer ${host}:${port} unreachable (${err.message})`)));
    socket.once("connect", () => {
      socket.end(payload, () => done());
    });
  });
}
