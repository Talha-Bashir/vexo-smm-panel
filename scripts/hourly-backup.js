const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env.local");
const BACKUP_ROOT = path.join(ROOT_DIR, "database", "backups", "hourly");
const LATEST_EXPORT_DIR = path.join(ROOT_DIR, "database", "database_exports");

function getDatabaseUrl() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`.env.local not found at ${ENV_PATH}`);
  }
  const content = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace("&channel_binding=require", "");
    }
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function runBackup() {
  const startTime = Date.now();
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const targetDir = path.join(BACKUP_ROOT, `backup_${dateStr}`);

  ensureDir(targetDir);
  ensureDir(LATEST_EXPORT_DIR);

  const dbUrl = getDatabaseUrl();
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  console.log(`\n========================================`);
  console.log(`🕒 [${new Date().toISOString()}] Starting Hourly Database Backup...`);

  try {
    const tableRes = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );
    const tables = tableRes.rows.map((r) => r.table_name);
    console.log(`📊 Found ${tables.length} tables to backup.`);

    const summary = {
      timestamp: new Date().toISOString(),
      databaseHost: dbUrl.split("@")[1]?.split("/")[0] || "unknown",
      totalTables: tables.length,
      tables: {},
      durationMs: 0,
    };

    let sqlDump = `-- VEXARO HOURLY BACKUP\n-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      try {
        process.stdout.write(`  ⏳ ${table}... `);
        const dataRes = await pool.query(`SELECT * FROM "${table}"`);
        const rows = dataRes.rows;
        summary.tables[table] = rows.length;
        console.log(`(${rows.length} rows)`);

        const jsonContent = JSON.stringify(rows, null, 2);

        // 1. Save in timestamped hourly folder
        fs.writeFileSync(path.join(targetDir, `${table}.json`), jsonContent, "utf8");

        // 2. Also update latest export directory for instant recovery
        fs.writeFileSync(path.join(LATEST_EXPORT_DIR, `${table}.json`), jsonContent, "utf8");

        sqlDump += `-- Table: "${table}" (${rows.length} rows)\n`;
        sqlDump += `-- Stored in ${table}.json\n\n`;
      } catch (err) {
        console.warn(`  ⚠️ Failed to backup table ${table}: ${err.message}`);
        summary.tables[table] = `ERROR: ${err.message}`;
      }
    }

    summary.durationMs = Date.now() - startTime;

    fs.writeFileSync(path.join(targetDir, "full_database_dump.sql"), sqlDump, "utf8");
    fs.writeFileSync(path.join(targetDir, "backup_summary.json"), JSON.stringify(summary, null, 2), "utf8");

    // Also update root backup_summary.json in latest exports
    fs.writeFileSync(path.join(LATEST_EXPORT_DIR, "backup_summary.json"), JSON.stringify(summary, null, 2), "utf8");

    console.log(`✅ Backup successfully completed in ${summary.durationMs}ms!`);
    console.log(`📁 Saved to: ${targetDir}`);

    // Rotate old backups (keep last 168 hours = 7 full days of hourly backups)
    rotateOldBackups(168);
    return summary;
  } catch (err) {
    console.error(`❌ Backup failed: ${err.message}`);
    throw err;
  } finally {
    await pool.end();
  }
}

function rotateOldBackups(keepCount = 168) {
  try {
    if (!fs.existsSync(BACKUP_ROOT)) return;
    const items = fs
      .readdirSync(BACKUP_ROOT)
      .filter((name) => name.startsWith("backup_"))
      .sort(); // oldest first

    if (items.length > keepCount) {
      const toRemove = items.slice(0, items.length - keepCount);
      console.log(`🧹 Rotating ${toRemove.length} old backups to save disk space...`);
      for (const dir of toRemove) {
        fs.rmSync(path.join(BACKUP_ROOT, dir), { recursive: true, force: true });
      }
    }
  } catch (e) {
    console.warn("⚠️ Error during backup rotation:", e.message);
  }
}

// Daemon mode: --daemon
const isDaemon = process.argv.includes("--daemon");

if (isDaemon) {
  console.log("🚀 Starting VEXARO Hourly Backup Daemon (runs every 60 minutes)...");
  // Run first backup immediately
  runBackup().catch((e) => console.error("Initial backup error:", e.message));

  // Run every 60 minutes
  const INTERVAL_MS = 60 * 60 * 1000;
  setInterval(() => {
    runBackup().catch((e) => console.error("Scheduled backup error:", e.message));
  }, INTERVAL_MS);
} else {
  // Single execution
  runBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
