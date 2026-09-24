import { config } from "./config";
import { sendToPrinter } from "./printerClient";

interface BridgeJob {
  id: number;
  kind: string;
  printerId: number;
  host: string | null;
  port: number;
  payload: string; // base64
}

const authHeaders = { authorization: `Bearer ${config.bridgeToken}` };

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function claimJobs(): Promise<BridgeJob[]> {
  const res = await fetch(`${config.apiUrl}/print-bridge/jobs`, { headers: authHeaders });
  if (res.status === 401) {
    throw new Error("Bridge token was rejected by the server — check BRIDGE_TOKEN in .env (it may have been regenerated).");
  }
  if (!res.ok) {
    throw new Error(`Server returned ${res.status} claiming jobs`);
  }
  return (await res.json()) as BridgeJob[];
}

async function ackJob(id: number, result: { ok: true } | { ok: false; error: string }) {
  await fetch(`${config.apiUrl}/print-bridge/jobs/${id}/ack`, {
    method: "POST",
    headers: { ...authHeaders, "content-type": "application/json" },
    body: JSON.stringify(result),
  }).catch((err) => log(`Failed to ack job ${id}: ${(err as Error).message} (it will be retried by the server)`));
}

async function processJob(job: BridgeJob) {
  if (!job.host) {
    log(`Job ${job.id} (printer ${job.printerId}) has no address — skipping`);
    await ackJob(job.id, { ok: false, error: "Printer has no host configured" });
    return;
  }
  try {
    await sendToPrinter(job.host, job.port, Buffer.from(job.payload, "base64"));
    log(`Printed job ${job.id} (${job.kind}) -> ${job.host}:${job.port}`);
    await ackJob(job.id, { ok: true });
  } catch (err) {
    const message = (err as Error).message;
    log(`Job ${job.id} (${job.kind}) failed: ${message}`);
    await ackJob(job.id, { ok: false, error: message });
  }
}

let running = false;

async function tick() {
  if (running) return; // still processing the previous batch; the next poll will pick up any leftovers
  running = true;
  try {
    const jobs = await claimJobs();
    for (const job of jobs) {
      await processJob(job);
    }
  } catch (err) {
    log(`Poll failed: ${(err as Error).message}`);
  } finally {
    running = false;
  }
}

log(`Print bridge starting. Server: ${config.apiUrl}, polling every ${config.pollMs}ms.`);
void tick();
setInterval(() => void tick(), config.pollMs);

process.on("SIGINT", () => {
  log("Shutting down.");
  process.exit(0);
});
