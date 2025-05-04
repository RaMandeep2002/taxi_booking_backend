import cron from "node-cron";
import { runDatabaseBackup } from "./backupJob";


cron.schedule("0 */12 * * *", () => {
    // console.log(`🕙 Running DB backup...`);
    runDatabaseBackup();
});
