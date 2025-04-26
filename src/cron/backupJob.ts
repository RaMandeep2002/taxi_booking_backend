import { exec } from "child_process";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
const mongoUri = process.env.MONGO_URI!;

export const runDatabaseBackup = () => {
    const dbname = "ride-booking";
    const backupRootDir = path.join(__dirname, "../../backup");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(backupRootDir, `backup-${timestamp}`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const command = `mongodump --uri="${mongoUri}/${dbname}" --out="${backupDir}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error while backing up: ${error.message}`);
            return;
        }
        console.log(`✅ Backup completed for '${dbname}' at ${timestamp}`);
    });
};
