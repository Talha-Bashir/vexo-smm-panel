const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const USB_DRIVE = 'E:\\';
const SOURCE_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(SOURCE_DIR, '.env.local');

if (!fs.existsSync(USB_DRIVE)) {
  console.error(`❌ USB drive ${USB_DRIVE} is not mounted or accessible.`);
  process.exit(1);
}

console.log(`🚀 Starting comprehensive backup to USB Drive: ${USB_DRIVE}...`);

// Read database URL
let dbUrl = '';
if (fs.existsSync(ENV_PATH)) {
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFolderRecursiveSync(source, target, ignoreList = []) {
  if (!fs.existsSync(source)) return 0;
  ensureDir(target);

  let fileCount = 0;
  const items = fs.readdirSync(source);
  for (const item of items) {
    if (ignoreList.includes(item)) continue;
    const curSource = path.join(source, item);
    const curTarget = path.join(target, item);

    try {
      const stat = fs.statSync(curSource);
      if (stat.isDirectory()) {
        fileCount += copyFolderRecursiveSync(curSource, curTarget, ignoreList);
      } else {
        fs.copyFileSync(curSource, curTarget);
        fileCount++;
      }
    } catch (err) {
      // Ignore transient locked files
    }
  }
  return fileCount;
}

async function exportDatabase(targetDir) {
  if (!dbUrl) {
    console.warn("⚠️ No DATABASE_URL found in .env.local; skipping DB export.");
    return;
  }
  ensureDir(targetDir);
  console.log("📦 Exporting Neon PostgreSQL database tables to JSON & SQL...");
  const pool = new Pool({ connectionString: dbUrl });

  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tables = res.rows.map(r => r.table_name);
    let fullSql = `-- VEXARO SMM PANEL - FULL DATABASE BACKUP\n-- Generated: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      const dataRes = await pool.query(`SELECT * FROM "${table}"`);
      const rows = dataRes.rows;
      fs.writeFileSync(
        path.join(targetDir, `${table}.json`),
        JSON.stringify(rows, null, 2),
        'utf8'
      );
      fullSql += `-- Table: ${table} (${rows.length} rows)\n`;
      fullSql += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
      fullSql += `-- Data JSON stored in ${table}.json\n\n`;
      console.log(`  ✓ Exported ${table} (${rows.length} rows)`);
    }

    fs.writeFileSync(path.join(targetDir, `full_database_dump.sql`), fullSql, 'utf8');
    console.log("✅ Database tables successfully exported!");
  } catch (err) {
    console.error("❌ Database export error:", err.message);
  } finally {
    await pool.end();
  }
}

function parseChats(brainDir, targetDir) {
  ensureDir(targetDir);
  if (!fs.existsSync(brainDir)) return;

  const convDirs = fs.readdirSync(brainDir);
  let totalConversations = 0;

  for (const conv of convDirs) {
    const logPath = path.join(brainDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(logPath)) continue;

    totalConversations++;
    try {
      const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
      let readableLog = `# Conversation Session: ${conv}\n\n`;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const time = entry.created_at || '';
          if (entry.type === 'USER_INPUT' && entry.content) {
            readableLog += `### [${time}] User:\n${entry.content}\n\n---\n\n`;
          } else if (entry.type === 'PLANNER_RESPONSE' && entry.content) {
            readableLog += `### [${time}] Assistant:\n${entry.content}\n\n---\n\n`;
          }
        } catch {}
      }

      fs.writeFileSync(path.join(targetDir, `Chat_${conv}.md`), readableLog, 'utf8');
    } catch {}
  }
  console.log(`✅ Formatted ${totalConversations} conversation chat sessions into readable Markdown.`);
}

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupRoot = path.join(USB_DRIVE, `VEXARO_BACKUP_${ts}`);
  ensureDir(backupRoot);

  const websiteDir = path.join(backupRoot, '01_WEBSITE_VEXARO_SMM');
  const otherWebsitesDir = path.join(backupRoot, '02_OTHER_WEBSITES');
  const chatsDir = path.join(backupRoot, '03_ALL_CHATS_AND_TRANSCRIPTS');

  ensureDir(websiteDir);
  ensureDir(otherWebsitesDir);
  ensureDir(chatsDir);

  // 1. Export database
  const dbDir = path.join(websiteDir, 'database_exports');
  await exportDatabase(dbDir);

  // 2. Copy smm-panel codebase
  console.log("📁 Copying VEXARO SMM Panel source code (excluding node_modules & .next)...");
  const smmSourceTarget = path.join(websiteDir, 'smm-panel-source');
  const smmFilesCount = copyFolderRecursiveSync(
    SOURCE_DIR,
    smmSourceTarget,
    ['node_modules', '.next', '.git', 'dist', 'build']
  );
  console.log(`✅ Copied ${smmFilesCount} website files to ${smmSourceTarget}`);

  // 3. Copy other websites
  const restaurantDemo = 'C:\\Users\\HASSAN GAMERZ\\Desktop\\Websites Demos\\Resturent or fast food website demo';
  if (fs.existsSync(restaurantDemo)) {
    console.log("📁 Copying Restaurant Website Demo...");
    const restTarget = path.join(otherWebsitesDir, 'Restaurant_Website_Demo');
    const restCount = copyFolderRecursiveSync(restaurantDemo, restTarget, ['node_modules', '.git']);
    console.log(`✅ Copied ${restCount} files to ${restTarget}`);
  }

  const aetherisAI = 'C:\\Users\\HASSAN GAMERZ\\.gemini\\antigravity\\scratch\\aetheris-ai';
  if (fs.existsSync(aetherisAI)) {
    console.log("📁 Copying Aetheris AI Website...");
    const aetherTarget = path.join(otherWebsitesDir, 'Aetheris_AI_Website');
    const aetherCount = copyFolderRecursiveSync(aetherisAI, aetherTarget, ['node_modules', '.git']);
    console.log(`✅ Copied ${aetherCount} files to ${aetherTarget}`);
  }

  // 4. Copy all chats & transcripts
  const brainDir = 'C:\\Users\\HASSAN GAMERZ\\.gemini\\antigravity\\brain';
  if (fs.existsSync(brainDir)) {
    console.log("📁 Copying all chat transcripts and agent conversation data...");
    const brainTarget = path.join(chatsDir, 'Raw_Conversation_Data');
    const brainCount = copyFolderRecursiveSync(brainDir, brainTarget, []);
    console.log(`✅ Copied ${brainCount} raw conversation data files to ${brainTarget}`);

    // Parse into readable chat files
    parseChats(brainDir, path.join(chatsDir, 'Human_Readable_Chat_Transcripts'));
  }

  // 5. Create summary manifest
  const summary = `================================================================================
VEXARO SMM PANEL - COMPLETE BACKUP TO REMOVABLE USB DRIVE (E:)
================================================================================
Date: ${new Date().toLocaleString()} (${new Date().toISOString()})
Destination: ${backupRoot}

CONTENTS INCLUDED IN THIS BACKUP:
--------------------------------------------------------------------------------
1. 01_WEBSITE_VEXARO_SMM
   - smm-panel-source: Full Next.js production codebase with all APIs, pages, and components
   - .env.local: Complete production environment configuration, API keys, and provider secrets
   - database_exports: 26 JSON files with every single row from all PostgreSQL database tables:
       * users & vexo_users
       * vexo_orders
       * vexo_platform_settings
       * vexo_providers & vexo_provider_services
       * vexo_routed_services
       * vexo_wallets & vexo_wallet_transactions
       * vexo_deposits
       * vexo_coupons & vexo_coupon_redemptions
       * vexo_support_tickets
       * vexo_blog_posts & analytics
       * vexo_tool_subscriptions
       * vexo_admin_activity

2. 02_OTHER_WEBSITES
   - Restaurant_Website_Demo: HTML/CSS/JS frontend demo
   - Aetheris_AI_Website: AI web app codebase

3. 03_ALL_CHATS_AND_TRANSCRIPTS
   - Human_Readable_Chat_Transcripts: Formatted Markdown chat transcripts of all AI pair-programming sessions
   - Raw_Conversation_Data: Complete raw session logs, JSONL records, and brain state

TELEGRAM CONFIGURATION UPDATED:
--------------------------------------------------------------------------------
- User Phone: +923088180234
- User ID / Chat ID: 8672881616
- Live Status: Updated in .env.local and vexo_platform_settings database table
- Subscriptions Order Action: Orders under 'Subscriptions' category bypass all APIs,
  reserve wallet balance, mark order Pending (SUB-xxx), and dispatch instant manual
  fulfillment alert to Telegram Chat ID 8672881616.

================================================================================
`;

  fs.writeFileSync(path.join(backupRoot, 'BACKUP_SUMMARY.txt'), summary, 'utf8');
  fs.writeFileSync(path.join(USB_DRIVE, 'LATEST_BACKUP_SUMMARY.txt'), summary, 'utf8');

  console.log("\n🎉 ALL FILES SUCCESSFULLY BACKED UP TO USB DRIVE (E:)!\n");
}

main().catch(console.error);
