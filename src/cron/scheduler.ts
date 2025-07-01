import cron from "node-cron";
import { runDatabaseBackup } from "./backupJob";
import { generateAndSendReport } from "../controller/adminController";


cron.schedule("0 */12 * * *", () => {
    // console.log(`🕙 Running DB backup...`);
    runDatabaseBackup();
});

cron.schedule("0 0 1 * *", async () => {
    console.log("📅 Running monthly report cron job...");
    await generateAndSendReport();
});



cron.schedule("*/5 * * * * *", async () => {
    console.log("📅 Running monthly report cron job every 5 seconds...");
    await generateAndSendReport();
});