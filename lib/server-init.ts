let cronStarted = false;

export function initializeServerServices(): void {
  if (cronStarted) return;
  cronStarted = true;

  if (process.env.NODE_ENV === "production" || process.env.ENABLE_CRON === "true") {
    // Dynamic import to avoid loading cron in edge runtime
    import("./cron/cron-scheduler").then(({ startDailyGenerationCron }) => {
      startDailyGenerationCron();
    });
  }
}
