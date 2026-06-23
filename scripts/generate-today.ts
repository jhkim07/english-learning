import "dotenv/config";
import { runDailyGeneration } from "./cron/generation-runner";

console.log("[generate-today] Manual trigger started");

runDailyGeneration()
  .then(() => {
    console.log("[generate-today] Completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[generate-today] Failed:", error);
    process.exit(1);
  });
