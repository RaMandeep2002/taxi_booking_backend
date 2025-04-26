import cron from "node-cron";
import { runDatabaseBackup } from "./backupJob";


cron.schedule("*/1 * * * *", () =>{
    console.log(`🕙 Running DB backup...`);
    // runDatabaseBackup();
})

