import { runAutomatedCampaigns } from "../../modules/campaigns/service";

// Hourly is far more often than needed for day-granularity triggers
// (birthday/win-back), but harmless — runAutomatedCampaigns' per-customer
// cooldown makes every tick idempotent, so running it more often than
// strictly necessary just means a newly-matching customer is picked up
// sooner rather than up to a day later.
const TICK_MS = 60 * 60 * 1000;

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const results = await runAutomatedCampaigns();
    const total = results.reduce((sum, r) => sum + r.processed, 0);
    if (total > 0) {
      console.log(`Campaign scheduler: processed ${total} recipient(s) across ${results.length} campaign(s).`);
    }
  } catch (err) {
    console.error("Campaign scheduler error:", err);
  } finally {
    running = false;
  }
}

export function startCampaignScheduler() {
  setInterval(() => void tick(), TICK_MS).unref();
  void tick();
}
