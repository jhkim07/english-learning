import cron from "node-cron";
import { runDailyGeneration } from "@/scripts/cron/generation-runner";

// 2am KST = 5pm UTC
const CRON_SCHEDULE = "0 17 * * *";

export function startDailyGenerationCron(): void {
  console.log(`[DailyGeneration] Cron scheduled: ${CRON_SCHEDULE} (2am KST)`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log(`[DailyGeneration] Cron fired at ${new Date().toISOString()}`);
    await runDailyGeneration();
  });
}
