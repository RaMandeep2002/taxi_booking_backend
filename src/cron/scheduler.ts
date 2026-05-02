import cron from "node-cron";
import { runDatabaseBackup } from "./backupJob";
import { generateAndSendReport, stopShiftwhichactivemorethan12hours } from "../controller/adminController";


cron.schedule("0 */12 * * *", () => {
    console.log(`🕙 Running DB backup...`);
    runDatabaseBackup();
});

cron.schedule("0 0 1,8,15,22 * *", async () => {
    console.log("📅 Running scheduled report cron job...");
    await generateAndSendReport();
});

// cron.schedule("0 */12 * * *", async () => {
//     console.log("📅 Checking for active shifts more than 12 hours...");
//     await stopShiftwhichactivemorethan12hours();
// });

// cron.schedule("*/2 * * * *", async () => {
//     console.log("📅 Checking for active shifts more than 12 hours...");
//     await stopShiftwhichactivemorethan12hours();
// });





// cron.schedule("*/5 * * * * *", async () => {
//     console.log("📅 Running monthly report cron job every 5 seconds...");
//     await generateAndSendReport();
// });