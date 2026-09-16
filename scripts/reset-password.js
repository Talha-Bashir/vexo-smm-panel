#!/usr/bin/env node

/**
 * VEXO SMM - Admin Password Reset Utility
 *
 * Usage:
 *   node scripts/reset-password.js <email> <new_password>
 *   or
 *   npm run reset-password -- <email> <new_password>
 *
 * Interactive mode:
 *   node scripts/reset-password.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const { Pool } = require("pg");

// 1. Load DATABASE_URL from .env.local
function getDatabaseUrl() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env.local file not found at " + envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      const val = trimmed.slice("DATABASE_URL=".length).trim();
      return val.replace(/^["']|["']$/g, "");
    }
  }

  console.error("❌ Error: DATABASE_URL not found in .env.local");
  process.exit(1);
}

// 2. Hash password using VEXO standard (crypto.scryptSync 64-byte hex)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function promptInput(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  let email = process.argv[2]?.trim();
  let newPassword = process.argv[3]?.trim();

  console.log("\n==================================================");
  console.log("       ⚡ VEXO SMM - ADMIN PASSWORD RESET ⚡       ");
  console.log("==================================================\n");

  if (!email) {
    email = await promptInput("Enter user Email: ");
  }

  if (!email) {
    console.error("❌ Error: Email is required.");
    process.exit(1);
  }

  if (!newPassword) {
    newPassword = await promptInput("Enter New Password (min 6 chars): ");
  }

  if (!newPassword || newPassword.length < 6) {
    console.error("❌ Error: New password must be at least 6 characters long.");
    process.exit(1);
  }

  const connectionString = getDatabaseUrl();
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check if user exists
    const userResult = await pool.query(
      `SELECT id, name, email FROM vexo_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ Error: No user found with email "${email}".\n`);
      
      // Suggest existing users
      const allUsers = await pool.query(
        `SELECT id, name, email FROM vexo_users ORDER BY id ASC LIMIT 10`
      );
      if (allUsers.rows.length > 0) {
        console.log("📋 Here are the users registered in your database:");
        console.table(allUsers.rows);
      }
      process.exit(1);
    }

    const user = userResult.rows[0];

    // Generate hash
    const passwordHash = hashPassword(newPassword);

    // Update password in vexo_users
    await pool.query(
      `UPDATE vexo_users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, user.id]
    );

    // Invalidate any active sessions so user must log in fresh
    const sessionRes = await pool.query(
      `DELETE FROM vexo_sessions WHERE user_id = $1`,
      [user.id]
    );

    // Log admin activity if table exists
    try {
      await pool.query(
        `INSERT INTO vexo_admin_activity (admin_user_id, action, target_type, target_id, details)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          1,
          "admin_password_reset",
          "user",
          String(user.id),
          JSON.stringify({
            email: user.email,
            resetBy: "CLI Admin Command",
            timestamp: new Date().toISOString(),
          }),
        ]
      );
    } catch (_) {
      // If table doesn't exist, proceed silently
    }

    console.log("✅ PASSWORD RESET SUCCESSFUL!");
    console.log("--------------------------------------------------");
    console.log(`👤 User ID     : ${user.id}`);
    console.log(`📛 Name        : ${user.name}`);
    console.log(`📧 Email       : ${user.email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`🚪 Active Sessions Invalidated: ${sessionRes.rowCount || 0}`);
    console.log("--------------------------------------------------");
    console.log("The user can now log in with their new password.\n");
  } catch (err) {
    console.error("❌ Database Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
