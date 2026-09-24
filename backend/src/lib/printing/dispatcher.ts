import { prisma } from "../prisma";
import { ack, claimPending, requeueStale, setEnqueueListener } from "./queue";
import { sendTcp } from "./transports/networkDirect";

const POLL_MS = 3000;

let running = false;
let rerun = false;

// Delivers jobs for NETWORK_DIRECT printers from inside the backend process.
// Bridge and terminal-local jobs are left PENDING for their own claimers; this
// loop only requeues their stale claims.
async function tick() {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    do {
      rerun = false;
      await requeueStale();
      const printers = await prisma.printer.findMany({
        where: { connection: "NETWORK_DIRECT", deletedAt: null, isActive: true, host: { not: null } },
        select: { id: true },
      });
      const jobs = await claimPending(printers.map((p) => p.id), 20);
      for (const job of jobs) {
        try {
          await sendTcp(job.printer.host!, job.printer.port, Buffer.from(job.payload));
          await ack(job.id, { ok: true });
        } catch (err) {
          await ack(job.id, { ok: false, error: (err as Error).message });
        }
      }
    } while (rerun);
  } catch (err) {
    console.error("Print dispatcher error:", err);
  } finally {
    running = false;
  }
}

export function startPrintDispatcher() {
  setEnqueueListener(() => void tick());
  setInterval(() => void tick(), POLL_MS).unref();
  void tick();
}
