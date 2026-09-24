import { app } from "./app";
import { env } from "./config/env";
import { getLicenseStatus } from "./lib/license";
import { startPrintDispatcher } from "./lib/printing/dispatcher";

const license = getLicenseStatus();
switch (license.state) {
  case "RESTRICTED":
    console.warn(`⚠ LICENSE: ${license.message}`);
    break;
  case "GRACE_PERIOD":
  case "EXPIRING_SOON":
    console.warn(`⚠ LICENSE (${license.state}): ${license.message}`);
    break;
  case "DEV_BYPASS":
    console.log(`LICENSE: ${license.message}`);
    break;
  case "OK":
    console.log(
      `LICENSE: ${license.payload?.clientName} — ${license.payload?.planTier} plan, ${license.daysRemaining} day(s) remaining.`
    );
    break;
}

app.listen(env.port, () => {
  console.log(`POS API listening on port ${env.port} (${env.nodeEnv})`);
  startPrintDispatcher();
});
