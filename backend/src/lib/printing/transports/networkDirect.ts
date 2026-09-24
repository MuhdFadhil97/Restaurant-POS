import net from "net";

// Raw TCP to a LAN thermal printer (the de-facto "port 9100" / JetDirect
// protocol): open, write the ESC/POS bytes, close. Resolves once the socket
// has flushed and closed cleanly.
export function sendTcp(host: string, port: number, payload: Buffer, timeoutMs = 5000): Promise<void> {
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
