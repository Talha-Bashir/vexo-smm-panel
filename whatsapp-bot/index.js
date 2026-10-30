import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  ensureCustomerSchema,
  ensureNotificationAndControlTables,
  isPhoneIgnoredOrPaused,
  setPhoneControl,
  getPhoneControlsList,
  fetchPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  getCustomer,
  upsertCustomer,
  saveContactToVcf,
  detectCountryFromPhone,
  parseCountryText,
  detectLanguageSwitch,
  convertPkrToCurrency,
  getCheapestServices,
  getFreeTrialServices,
  searchServices,
  lookupOrder,
  processOrderSpeedUp,
  processOrderRefill,
  sanitizeText,
  getAdminProviderBalances,
  getAdminOrderSummary,
  getAdminScheduledOrders,
  adminRefundOrder,
  getAdminUserDetails,
  adminAddUserBalance,
  getAdminStats,
  getAdminPendingDeposits,
  dispatchOrderFromBot
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const PANEL_NAME = process.env.PANEL_NAME || 'VEXARO SMM Panel';
const PANEL_URL = process.env.PANEL_URL || 'https://vexarosmm.com';
const SADAPAY_NO = process.env.SADAPAY_NO || '03197008275';
const SADAPAY_NAME = process.env.SADAPAY_NAME || 'Saeed Bashir';
const EASYPAISA_NO = process.env.EASYPAISA_NO || '03176437013';
const EASYPAISA_NAME = process.env.EASYPAISA_NAME || 'Baigum Shazia Bashir';
const SUPPORT_PHONE = process.env.SUPPORT_WHATSAPP || process.env.ADMIN_WHATSAPP || '03088180234';
const MIN_BONUS_DEPOSIT = process.env.MIN_BONUS_DEPOSIT || '5000';

const cleanSupportPhone = SUPPORT_PHONE.replace(/\D/g, '').replace(/^0/, '92');

// Deduplication cache
const recentMessages = new Set();

/**
 * Intelligent AI Assistant with Live Context & Strict Security Guardrails
 */
async function askIntelligentGemini(userMessage, contextData = '', customer = null) {
  if (!GEMINI_API_KEY) {
    return `Assalam-o-Alaikum! Welcome to ${PANEL_NAME}. Mazeed maloomat ke liye *menu* likh kar reply karein.`;
  }

  const userCurrency = customer?.currency || 'PKR';
  const userName = customer?.name || 'Customer';
  const userCountry = customer?.country || 'Pakistan';
  const userLanguage = customer?.language || 'en';

  const systemPrompt = `You are the friendly, intelligent official WhatsApp assistant for ${PANEL_NAME} (website: ${PANEL_URL}).

CUSTOMER PROFILE:
- Name: ${userName}
- Country: ${userCountry}
- Preferred Currency: ${userCurrency}
- Primary Language: ${userLanguage}

MAIN MENU REFERENCE:
1 = Payment Methods (SadaPay, Easypaisa, Binance, Cards)
2 = Order Status & Priority Speed Up
3 = Deposit Bonus Offers (5% to 10% extra on Rs 5,000+)
4 = Live Website Services & Rates Catalog
5 = Human Support Helpline (+92 308 8180234)
6 = Free Test Trial Services (1,000 Views / 50 Likes Free)
7 = Language Switcher (English, Urdu, Bengali, Arabic)

COMPREHENSIVE WEBSITE ISSUE RESOLUTION KNOWLEDGE BASE:
1. ORDER DELAYS & QUEUED / SCHEDULED ORDERS:
   - Normal services start within 1-30 minutes; high-retention services can take 1-2 hours.
   - Smart Same-Link Queue: If a user enters multiple orders for the SAME link, subsequent orders automatically enter "Scheduled" status to prevent counter collisions or drops. As soon as the active order finishes, the queued order starts automatically!
   - If user asks to speed up: Tell them to reply "speed up order <order_id>".
2. DROP PROTECTION & REFILL:
   - For services with Refill guarantee (30 to 365 days): User can click the "Refill" button on ${PANEL_URL}/dashboard?tab=orders, or reply "refill order <order_id>" on WhatsApp for instant automated refill.
3. PRIVATE ACCOUNT / PROFILE:
   - Accounts MUST be 100% PUBLIC before and during service delivery.
   - If an order failed because the profile was private, the funds were automatically refunded to their website wallet balance. Tell user to set profile to public and place the order again.
4. DEPOSIT / ADD FUNDS NOT SHOWING:
   - Manual payments (SadaPay: 03197008275 Saeed Bashir, Easypaisa: 03176437013 Baigum Shazia Bashir) are verified in 5-15 minutes.
   - User must submit TID and screenshot at ${PANEL_URL}/dashboard?tab=add-funds. If delayed past 20 minutes, tell them to send TID and screenshot here or reply 5.
5. CANCELLATION & REFUND:
   - Orders in processing upstream cannot be stopped mid-way.
   - If an order fails, cancels, or is partial, 100% of the remaining amount is automatically refunded into their website wallet balance. Wallet balance never expires.
6. 100% FREE TEST TRIAL:
   - Users can test free views (up to 1,000 views) or likes by visiting ${PANEL_URL} -> New Order -> Category: "Free Test Trial" (No deposit required!).
7. FORGOT PASSWORD & LOGIN:
   - Tell user to click "Forgot Password" on ${PANEL_URL}/login, or reply 5 with registered email.
8. LINK FORMAT:
   - Followers: Profile link (e.g. instagram.com/username).
   - Likes/Views: Direct post/video URL (e.g. tiktok.com/@user/video/123456).

CRITICAL MULTILINGUAL & TONE RULES:
1. Detect user's language and ALWAYS reply in their language (clean English for English, natural Roman Urdu for Urdu/Hindi, Bengali for Bengali, Arabic for Arabic).
2. Modern, friendly, helpful tone. Never say "It looks like you just sent a number".
3. Always quote prices in the customer's currency (${userCurrency}).
4. Strictly confidential: NEVER mention upstream providers, supplier names (e.g. SMM Flare, PAK SMM, Smooth SMM, Rizvi SMM, AM SMM), API keys, or URLs. Always brand as VEXARO SMM Panel.
5. Maximum 2-3 sentences. Short, direct, and helpful.`;

  try {
    const inputContent = contextData
      ? `[LIVE WEBSITE DATA IN ${userCurrency}]:\n${contextData}\n\n[USER QUESTION FROM ${userName}]:\n${userMessage}`
      : userMessage;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash-lite',
        input: inputContent,
        system_instruction: systemPrompt
      })
    });

    const data = await res.json();
    const outputStep = data.steps?.find(s => s.type === 'model_output');
    const aiText = outputStep?.content?.[0]?.text;

    if (aiText && aiText.trim()) {
      return sanitizeText(aiText.trim());
    }
  } catch (err) {
    console.error('[Gemini API Error]:', err.message);
  }

  return `Assalam-o-Alaikum ${userName} bhai! Aapka sawal mil gaya hai. Live services aur rates website par check karein: ${PANEL_URL}/services ya human support ke liye *5* bhejien.`;
}

/**
 * Extract potential Order ID from message
 */
function extractOrderId(text) {
  const uuidMatch = text.match(/[a-f0-9]{8}(?:-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?/i);
  if (uuidMatch) return uuidMatch[0];

  const orderNumMatch = text.match(/(?:order|id|#)\s*[:#]?\s*([0-9]{3,10})/i);
  if (orderNumMatch) return orderNumMatch[1];

  const standaloneDigits = text.match(/\b\d{4,8}\b/);
  if (standaloneDigits) return standaloneDigits[0];

  return null;
}

/**
 * Send VEXARO Official Contact Card (vCard)
 */
async function sendOfficialVCard(sock, remoteJid) {
  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    'FN:VEXARO SMM Support\n' +
    'ORG:VEXARO SMM Panel;\n' +
    `TEL;type=CELL;type=VOICE;waid=${cleanSupportPhone}:+${cleanSupportPhone}\n` +
    `URL:${PANEL_URL}\n` +
    'NOTE:Official 24/7 Human Support for VEXARO SMM Panel\n' +
    'END:VCARD';

  await sock.sendMessage(remoteJid, {
    contacts: {
      displayName: 'VEXARO SMM Support',
      contacts: [{ vcard }]
    }
  });
}

const SESSION_DIR = path.join(__dirname, 'auth_session');
let qrCounter = 0;
let notificationWorkerRunning = false;

function startNotificationWorker(sock) {
  if (notificationWorkerRunning) return;
  notificationWorkerRunning = true;

  console.log('🔔 [Notification Dispatcher] Polling queue active for Order Completed, Refunded, and Deposit Approved alerts...');

  setInterval(async () => {
    try {
      const pending = await fetchPendingNotifications(5);
      if (pending.length === 0) return;

      for (const notif of pending) {
        try {
          const rawPhone = String(notif.phone).replace(/\D/g, '');
          const cleanPhone = rawPhone.replace(/^0/, '92');
          const jid = `${cleanPhone}@s.whatsapp.net`;

          console.log(`🔔 [Notification Dispatcher] Sending ${notif.type} alert to +${cleanPhone}...`);
          await sock.sendMessage(jid, { text: notif.message });
          await markNotificationSent(notif.id);
          console.log(`🔔 [Notification Dispatcher] ✓ Delivered successfully (ID: ${notif.id})`);

          await new Promise((r) => setTimeout(r, 1600));
        } catch (sendErr) {
          console.error(`🔔 [Notification Dispatcher Error] Failed ID ${notif.id}:`, sendErr.message);
          await markNotificationFailed(notif.id, sendErr.message);
        }
      }
    } catch (pollErr) {
      console.warn('🔔 [Notification Dispatcher Warning]:', pollErr.message);
    }
  }, 20000);
}

/**
 * Main WhatsApp Connection Handler
 */
async function startBot() {
  await ensureCustomerSchema();
  await ensureNotificationAndControlTables();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n======================================================`);
  console.log(`🚀 Starting ${PANEL_NAME} Intelligent WhatsApp Assistant`);
  console.log(`Using Baileys v${version.join('.')}`);
  console.log(`Multi-Country Currency & Automated Contact Sync Active`);
  console.log(`======================================================\n`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: Browsers.ubuntu('Chrome'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 15000,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // Optional phone pairing code feature (--pair flag or PAIRING_CODE=true)
  const usePairingCode = process.argv.includes('--pair') || process.env.PAIRING_CODE === 'true';
  if (usePairingCode && !sock.authState.creds.registered) {
    const rawTarget = process.env.ADMIN_WHATSAPP || process.env.SUPPORT_WHATSAPP || '923088180234';
    const pairPhone = rawTarget.replace(/\D/g, '');
    setTimeout(async () => {
      try {
        const pairCode = await sock.requestPairingCode(pairPhone);
        console.log('\n======================================================');
        console.log(`🔑 WHATSAPP PAIRING CODE FOR +${pairPhone}:`);
        console.log(`\n           👉  ${pairCode}  👈\n`);
        console.log('Instructions:');
        console.log('1. Open WhatsApp on your phone (+92' + pairPhone.slice(-10) + ')');
        console.log('2. Tap 3 dots (or Settings) -> Linked Devices');
        console.log('3. Tap "Link a Device" -> tap "Link with phone number instead"');
        console.log(`4. Enter the 8-digit code shown above: ${pairCode}`);
        console.log('======================================================\n');
      } catch (err) {
        console.warn('Pairing code request error:', err.message);
      }
    }, 4000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      qrCounter++;
      console.log('\n======================================================');
      console.log(`📲 FRESH QR CODE #${qrCounter} (Scan with WhatsApp):`);
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Tap 3 dots (or Settings) -> Linked Devices');
      console.log('3. Tap "Link a Device" and SCAN the code below:');
      console.log('(Note: WhatsApp QR codes auto-refresh every 25 seconds)');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });

      try {
        await QRCode.toFile(path.join(__dirname, 'whatsapp-qr.png'), qr, { scale: 8, margin: 2 });
        const brainDir = 'C:/Users/User/.gemini/antigravity/brain/7c6f9ceb-757b-4da1-8ed9-4b74a0a3848b';
        if (fs.existsSync(brainDir)) {
          await QRCode.toFile(path.join(brainDir, 'whatsapp-qr.png'), qr, { scale: 8, margin: 2 });
        }
        console.log('📸 QR Image saved to whatsapp-bot/whatsapp-qr.png');
      } catch (e) {
        console.warn('[QR Save Warning]:', e.message);
      }
    }

    if (connection === 'close') {
      notificationWorkerRunning = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

      console.log(
        `\n⚠️ Connection closed (Status: ${statusCode || 'Unknown'}, Reason: ${lastDisconnect?.error?.message || 'Disconnected'})`
      );

      if (isLoggedOut) {
        console.log('🔄 Session was unlinked/logged out from WhatsApp on phone. Auto-clearing old session files...');
        try {
          fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          console.log('✅ Old session wiped cleanly! Generating a BRAND NEW QR code in 2 seconds...');
        } catch (err) {
          console.warn('[Session Cleanup Warning]:', err.message);
        }
        setTimeout(startBot, 2000);
      } else {
        const isRestart = statusCode === DisconnectReason.restartRequired || statusCode === 515;
        if (isRestart) {
          console.log('🔄 Pairing handshake received! Restarting socket with new saved credentials...');
          setTimeout(startBot, 1000);
        } else {
          console.log('🔄 Reconnecting in 3 seconds (keeping session keys intact)...');
          setTimeout(startBot, 3000);
        }
      }
    } else if (connection === 'open') {
      qrCounter = 0;
      console.log('\n======================================================');
      console.log(`✅ [${PANEL_NAME}] WHATSAPP BOT CONNECTED SUCCESSFULLY!`);
      console.log('Bot is now LIVE and listening for customer messages.');
      console.log('======================================================\n');
      startNotificationWorker(sock);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      const isFromMe = Boolean(m.key?.fromMe);
      const remoteJid = m.key?.remoteJid;
      if (!remoteJid) continue;

      if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
        continue;
      }

      const rawText =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        '';

      const text = rawText.trim();
      if (!text) continue;

      const cleanText = text.toLowerCase();

      // If message is from bot host phone itself, ONLY process slash commands (e.g. /pause, /status).
      // Otherwise skip, so bot doesn't reply when you manually chat with customers!
      if (isFromMe && !cleanText.startsWith('/')) {
        continue;
      }

      const msgId = m.key.id;
      if (recentMessages.has(msgId)) continue;
      recentMessages.add(msgId);
      setTimeout(() => recentMessages.delete(msgId), 15000);

      const senderPhone = remoteJid.replace(/:\d+@/, '@').split('@')[0].replace(/\D/g, '');
      console.log(`📩 [${isFromMe ? 'Admin (fromMe)' : 'Incoming'}] Chat: +${senderPhone} -> "${text}"`);

      // ========================================================
      // 0. ADMIN LIVE COMMANDS (/balance, /orders, /scheduled, /dispatch, /refund, /user, /addbalance, /stats, /deposits, /pause, /resume, /status, /help)
      // Works from:
      // A) The Bot's own phone (in any customer chat or "Message yourself" - isFromMe)
      // B) The Admin's registered WhatsApp phone numbers (03176437013, 03088180234, etc.)
      // ========================================================
      const adminTargetPhones = [
        '923176437013',
        '923088180234',
        cleanSupportPhone,
        (process.env.ADMIN_WHATSAPP || '').replace(/\D/g, '').replace(/^0/, '92'),
        (process.env.SUPPORT_WHATSAPP || '').replace(/\D/g, '').replace(/^0/, '92'),
      ].filter(Boolean);

      const isAdminSender =
        isFromMe ||
        adminTargetPhones.some((p) => senderPhone === p || senderPhone.endsWith(p.slice(-10)));

      if (cleanText.startsWith('/')) {
        if (!isAdminSender) {
          console.log(`[Security] Unauthorized slash command attempt from +${senderPhone}: "${text}"`);
          await sock.sendMessage(remoteJid, {
            text: `⚠️ Yeh command sirf VEXARO Admin ke liye makhsoos hai.\n\nAap website ya services ke liye *menu* likh kar reply karein.`
          });
          continue;
        }

        const parts = text.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        
        // Target phone: If typed with a number (e.g. /pause 03001234567), use that number.
        // If typed in a customer's chat without a number, target that customer!
        let targetRaw = parts[1] ? parts[1].replace(/\D/g, '').replace(/^0/, '92') : senderPhone;

        // --- COMMAND: /balance or /balances ---
        if (cmd === '/balance' || cmd === '/balances' || cmd === '/bal') {
          const providers = await getAdminProviderBalances();
          if (providers.length === 0) {
            await sock.sendMessage(remoteJid, { text: `⚠️ Database me koi provider configure nahi mila.` });
          } else {
            let msg = `💰 *VEXARO SMM - Live Provider Balances:*\n\n`;
            for (const p of providers) {
              const bal = Number(p.balance_usd || 0);
              let icon = '🟢';
              if (bal <= 5) icon = '🚨 CRITICAL';
              else if (bal <= 15) icon = '⚠️ LOW';
              else icon = '✅ Normal';

              msg += `🏢 *${p.name || p.id}*\n`;
              msg += `• Balance: *$${bal.toFixed(2)} USD* (${icon})\n`;
              msg += `• Status: ${p.is_active ? 'Active' : 'Disabled'}\n`;
              if (p.last_sync_at) {
                msg += `• Last Sync: ${new Date(p.last_sync_at).toLocaleTimeString()}\n`;
              }
              msg += `\n`;
            }
            msg += `━━━━━━━━━━━━━━━━━━━\n`;
            msg += `👉 Agar kisi provider ka balance low hai, foran recharge karein taake customer orders delay na hon!`;
            await sock.sendMessage(remoteJid, { text: msg });
          }
          continue;
        }

        // --- COMMAND: /orders ---
        if (cmd === '/orders' || cmd === '/orderstats') {
          const summary = await getAdminOrderSummary();
          if (!summary) {
            await sock.sendMessage(remoteJid, { text: `❌ Orders summary load nahi ho saki.` });
          } else {
            const c = summary.counts;
            let msg = `📊 *VEXARO Orders Overview:*\n\n`;
            msg += `📅 *Today's Total:* ${c.today_total} orders\n`;
            msg += `✅ *Completed Today:* ${c.today_completed} orders\n`;
            msg += `⏳ *Pending (Awaiting Provider):* ${c.pending}\n`;
            msg += `🔗 *Scheduled (Queued on Link):* ${c.scheduled}\n`;
            msg += `🚀 *In Progress / Processing:* ${c.in_progress}\n`;
            msg += `❌ *Cancelled / Refunded:* ${c.cancelled}\n`;
            msg += `📦 *Lifetime Total:* ${c.total_orders}\n\n`;

            if (summary.recent.length > 0) {
              msg += `━━━━━━━━━━━━━━━━━━━\n`;
              msg += `🕒 *Recent 5 Orders:*\n`;
              for (const r of summary.recent) {
                const sId = String(r.id).slice(0, 8);
                msg += `• *#${sId}* | ${r.status} | Qty: ${r.quantity} | Rs ${Number(r.charge_pkr).toFixed(0)}\n  _${r.service_name}_\n`;
              }
            }
            await sock.sendMessage(remoteJid, { text: msg });
          }
          continue;
        }

        // --- COMMAND: /scheduled ---
        if (cmd === '/scheduled' || cmd === '/queue') {
          const list = await getAdminScheduledOrders();
          if (list.length === 0) {
            await sock.sendMessage(remoteJid, {
              text: `✅ *Scheduled Orders Queue Empty!*\n\nKoi bhi order queue me Scheduled nahi hai. Tamam orders live dispatch ho chuke hain.`
            });
          } else {
            let msg = `🔗 *Active Scheduled Orders Queue (${list.length}):*\n`;
            msg += `_Same link par pehla order complete hote hi yeh automatically start honge._\n\n`;
            for (const o of list) {
              const sId = String(o.id).slice(0, 8);
              msg += `📦 *#${sId}* (${o.user_name || o.email || `User ${o.user_id}`})\n`;
              msg += `• Service: *${o.service_name}*\n`;
              msg += `• Qty: *${o.quantity}*\n`;
              msg += `• Link: ${o.link}\n`;
              msg += `• Dispatch Now: */dispatch ${sId}*\n\n`;
            }
            await sock.sendMessage(remoteJid, { text: msg });
          }
          continue;
        }

        // --- COMMAND: /dispatch <order_id> ---
        if (cmd === '/dispatch') {
          const targetOrderId = parts[1];
          if (!targetOrderId) {
            await sock.sendMessage(remoteJid, { text: `❌ Format: */dispatch <order_id>*\nMisaal: */dispatch 2843c01*` });
            continue;
          }
          await sock.sendMessage(remoteJid, { text: `⏳ Dispatching order #${targetOrderId} to upstream provider...` });
          const res = await dispatchOrderFromBot(targetOrderId);
          if (res.success) {
            await sock.sendMessage(remoteJid, {
              text: `🚀 *Order Dispatched Successfully!*\n\n• Order ID: *#${res.orderId}*\n• Provider Order ID: *${res.providerOrderId}*\n• Provider: *${res.providerId}*\n• Status: *Pending / In Progress*`
            });
          } else {
            await sock.sendMessage(remoteJid, {
              text: `❌ *Dispatch Failed:*\n${res.error}\n\nAgar provider ka balance low hai toh pehle provider account top-up karein.`
            });
          }
          continue;
        }

        // --- COMMAND: /refund <order_id> ---
        if (cmd === '/refund') {
          const targetOrderId = parts[1];
          if (!targetOrderId) {
            await sock.sendMessage(remoteJid, { text: `❌ Format: */refund <order_id>*\nMisaal: */refund 2843c01*` });
            continue;
          }
          const res = await adminRefundOrder(targetOrderId, 'Admin Refund via WhatsApp');
          if (res.success) {
            await sock.sendMessage(remoteJid, {
              text: `💰 *Order Refunded Successfully!*\n\n• Order ID: *#${res.orderId}*\n• Service: ${res.serviceName}\n• Refunded Amount: *Rs ${res.refundAmount.toFixed(2)} PKR*\n• Customer User ID: *${res.userId}*\n• Customer New Balance: *Rs ${res.newBalance.toFixed(2)} PKR*\n• Order Status: *Cancelled*`
            });
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ Refund Error: ${res.error}` });
          }
          continue;
        }

        // --- COMMAND: /user <email / phone / id> ---
        if (cmd === '/user' || cmd === '/customer') {
          const query = parts[1];
          if (!query) {
            await sock.sendMessage(remoteJid, { text: `❌ Format: */user <email or phone or id>*\nMisaal: */user test@gmail.com* ya */user 03176437013*` });
            continue;
          }
          const u = await getAdminUserDetails(query);
          if (u) {
            await sock.sendMessage(remoteJid, {
              text: `👤 *Customer Account Details:*\n\n• ID: *${u.id}*\n• Name: *${u.name}*\n• Email: *${u.email}*\n• WhatsApp: *+${u.whatsapp || 'N/A'}*\n• Role: *${u.role}*\n• Real Balance: *Rs ${Number(u.balance_pkr).toFixed(2)} PKR*\n• Bonus Balance: *Rs ${Number(u.bonus_balance_pkr).toFixed(2)} PKR*\n• Total Orders: *${u.total_orders}*\n• Joined: ${new Date(u.created_at).toLocaleDateString()}`
            });
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ User "${query}" database me nahi mila.` });
          }
          continue;
        }

        // --- COMMAND: /addbalance <email or phone or id> <amount> ---
        if (cmd === '/addbalance' || cmd === '/addfunds') {
          const targetUser = parts[1];
          const amount = parts[2];
          if (!targetUser || !amount || isNaN(Number(amount))) {
            await sock.sendMessage(remoteJid, { text: `❌ Format: */addbalance <email/phone/id> <amount>*\nMisaal: */addbalance 03176437013 500* ya */addbalance user@gmail.com 1000*` });
            continue;
          }
          const res = await adminAddUserBalance(targetUser, Number(amount), 'Admin Credit via WhatsApp Bot');
          if (res.success) {
            await sock.sendMessage(remoteJid, {
              text: `✅ *Funds Added Successfully!*\n\n• User: *${res.user.name}* (${res.user.email})\n• Amount Added: *Rs ${res.addedAmount.toFixed(2)} PKR*\n• New Wallet Balance: *Rs ${res.newBalance.toFixed(2)} PKR*\n• Transaction: Recorded in audit log.`
            });
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ Add Balance Error: ${res.error}` });
          }
          continue;
        }

        // --- COMMAND: /stats ---
        if (cmd === '/stats' || cmd === '/metrics') {
          const s = await getAdminStats();
          if (s) {
            await sock.sendMessage(remoteJid, {
              text: `📈 *VEXARO Panel Live Statistics:*\n\n👥 *Total Users:* ${s.totalUsers.toLocaleString()}\n📦 *Total Orders:* ${s.totalOrders.toLocaleString()}\n💎 *Lifetime Volume:* Rs ${s.totalVolumePkr.toLocaleString()} PKR\n\n📅 *Today's Orders:* ${s.todayOrders.toLocaleString()}\n💰 *Today's Revenue:* Rs ${s.todayVolumePkr.toLocaleString()} PKR\n\n💳 *Pending Deposits:* ${s.pendingDepositsCount} requests (Rs ${s.pendingDepositsAmount.toLocaleString()} PKR)\n_Check pending deposits: */deposits*_`
            });
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ Statistics load nahi ho saki.` });
          }
          continue;
        }

        // --- COMMAND: /deposits ---
        if (cmd === '/deposits') {
          const list = await getAdminPendingDeposits();
          if (list.length === 0) {
            await sock.sendMessage(remoteJid, { text: `✅ Koi bhi pending deposit verification ke liye nahi hai. Sabhi approve ho chuke hain!` });
          } else {
            let msg = `💳 *Pending Deposit Requests (${list.length}):*\n\n`;
            for (const d of list) {
              msg += `• *Rs ${Number(d.amount_pkr).toFixed(0)} PKR* via *${d.method}*\n`;
              msg += `  User: ${d.name} (${d.email})\n`;
              msg += `  TID: \`${d.transaction_id}\`\n`;
              msg += `  Date: ${new Date(d.created_at).toLocaleTimeString()}\n\n`;
            }
            msg += `👉 Website Admin Panel par jaa kar ek click se approve karein:\nhttps://vexarosmm.com/admin`;
            await sock.sendMessage(remoteJid, { text: msg });
          }
          continue;
        }

        if (cmd === '/pause') {
          // If typed without a number in self-chat
          if (!parts[1] && (senderPhone === cleanSupportPhone || senderPhone === '923088180234' || senderPhone === '923176437013')) {
            await sock.sendMessage(remoteJid, { text: `❌ Barah-e-meherbani number likhein, jaise: */pause 03001234567*` });
            continue;
          }
          await setPhoneControl(targetRaw, { isPaused: true, pauseHours: 24, reason: 'Admin manual pause' });
          await sock.sendMessage(remoteJid, {
            text: `⏸️ *Bot Paused Successfully!*\n\n• Target: *+${targetRaw}*\n• Duration: *24 Hours*\n• Mode: Human Takeover (Bot will NOT reply to this number).\n\n_Dobara bot active karne ke liye */resume ${targetRaw}* likhein._`
          });
          continue;
        }

        if (cmd === '/unpause' || cmd === '/resume') {
          if (!parts[1] && (senderPhone === cleanSupportPhone || senderPhone === '923088180234' || senderPhone === '923176437013')) {
            await sock.sendMessage(remoteJid, { text: `❌ Barah-e-meherbani number likhein, jaise: */resume 03001234567*` });
            continue;
          }
          await setPhoneControl(targetRaw, { isPaused: false, reason: 'Admin resumed' });
          await sock.sendMessage(remoteJid, {
            text: `▶️ *Bot Resumed!*\n\n• Target: *+${targetRaw}*\n• Mode: AI Assistant Active (Bot will reply normally).`
          });
          continue;
        }

        if (cmd === '/ignore' || cmd === '/block') {
          if (!parts[1] && (senderPhone === cleanSupportPhone || senderPhone === '923088180234' || senderPhone === '923176437013')) {
            await sock.sendMessage(remoteJid, { text: `❌ Barah-e-meherbani number likhein, jaise: */ignore 03001234567*` });
            continue;
          }
          await setPhoneControl(targetRaw, { isIgnored: true, reason: 'Admin blacklist' });
          await sock.sendMessage(remoteJid, {
            text: `🚫 *Number Permanently Ignored!*\n\n• Target: *+${targetRaw}*\n• Status: Blacklisted (Bot will permanently ignore all messages from this number).\n\n_Unblock karne ke liye */unignore ${targetRaw}* likhein._`
          });
          continue;
        }

        if (cmd === '/unignore' || cmd === '/unblock') {
          if (!parts[1] && (senderPhone === cleanSupportPhone || senderPhone === '923088180234' || senderPhone === '923176437013')) {
            await sock.sendMessage(remoteJid, { text: `❌ Barah-e-meherbani number likhein, jaise: */unignore 03001234567*` });
            continue;
          }
          await setPhoneControl(targetRaw, { isIgnored: false, reason: 'Admin unblacklist' });
          await sock.sendMessage(remoteJid, {
            text: `✅ *Number Unblocked!*\n\n• Target: *+${targetRaw}*\n• Status: Bot can now reply normally.`
          });
          continue;
        }

        if (cmd === '/status') {
          const queryId = parts[1] || '';
          if (!queryId) {
            await sock.sendMessage(remoteJid, { text: `❌ Format: */status <order_id>*\nMisaal: */status 125* ya */status 2785c101*` });
            continue;
          }
          const ord = await lookupOrder(queryId);
          if (ord) {
            await sock.sendMessage(remoteJid, {
              text: `📦 *Order #${ord.shortId} Details*\n\n• Service: *${ord.serviceName}*\n• Quantity: *${ord.quantity}*\n• Status: *${ord.status}*\n• Link: ${ord.link}\n• Charge: *Rs ${ord.chargePkr}*\n• Provider Order ID: ${ord.providerOrderId || 'N/A'}\n• Created: ${ord.createdAt}`
            });
          } else {
            await sock.sendMessage(remoteJid, { text: `❌ Order "${queryId}" database me nahi mila.` });
          }
          continue;
        }

        if (cmd === '/list') {
          const list = await getPhoneControlsList();
          if (list.length === 0) {
            await sock.sendMessage(remoteJid, { text: `📋 *Bot Controls Status:*\n\nKoi number paused ya ignored nahi hai. Sabhi customers ke liye bot active hai!` });
          } else {
            let msg = `📋 *Active Bot Controls (${list.length}):*\n\n`;
            for (const item of list) {
              const statusStr = item.is_ignored ? '🚫 IGNORED (Permanent)' : `⏸️ PAUSED (until ${new Date(item.paused_until).toLocaleTimeString()})`;
              msg += `• *+${item.phone}*: ${statusStr}\n`;
            }
            await sock.sendMessage(remoteJid, { text: msg });
          }
          continue;
        }

        if (cmd === '/help' || cmd === '/commands') {
          await sock.sendMessage(remoteJid, {
            text: `👑 *VEXARO Admin WhatsApp Commands Suite:*

💰 *PROVIDER & BALANCES:*
• */balance* - Tamam providers (Pak SMM, Smooth, AM, SMMFlare, Rizvi) ka live balance check karein.

📦 *ORDERS & QUEUE MANAGEMENT:*
• */orders* - Aaj ke orders, completed, pending aur queue statistics.
• */scheduled* - Same link par queued scheduled orders ki list.
• */dispatch <order_id>* - Scheduled ya pending order ko provider par foran bhejein.
• */status <order_id>* - Kisi bhi order ki live details check karein.
• */refund <order_id>* - Order cancel karke customer wallet me 100% paise refund karein.

👤 *USER & WALLET MANAGEMENT:*
• */user <email/phone/id>* - Customer profile, balance aur orders check karein.
• */addbalance <email/phone> <amount>* - Direct customer wallet me balance add karein.
• */deposits* - Pending manual deposit requests (SadaPay/Easypaisa).
• */stats* - Panel total revenue, users aur lifetime statistics.

🛠️ *BOT CHAT CONTROLS:*
• */pause <number>* - Bot ko 24 ghante ke liye pause karein (human takeover).
• */resume <number>* - Bot ko dobara active karein.
• */ignore <number>* - Kisi number ko permanently block karein.
• */unignore <number>* - Number unblock karein.
• */list* - Currently paused numbers ki list.`
          });
          continue;
        }

        await sock.sendMessage(remoteJid, { text: `❓ Unknown command "${cmd}". Tamam admin commands dekhne ke liye */help* likhein.` });
        continue;
      }

      // Human delay & typing status for customer replies
      await sock.sendPresenceUpdate('composing', remoteJid);
      await new Promise((r) => setTimeout(r, 2200));

      // Check if this sender is permanently ignored or temporarily paused (human takeover)
      const controlStatus = await isPhoneIgnoredOrPaused(senderPhone);
      if (controlStatus.ignored) {
        console.log(`[Bot Control] Ignored message from blacklisted number: +${senderPhone}`);
        continue;
      }
      if (controlStatus.paused) {
        console.log(`[Bot Control] Bot is paused for +${senderPhone} until ${controlStatus.pausedUntil} (Human Takeover Active)`);
        continue;
      }

      // Fetch customer profile from DB / memory
      let customer = await getCustomer(senderPhone);

      // Check if user requested an explicit language switch
      const langSwitch = detectLanguageSwitch(text);
      if (langSwitch) {
        customer = await upsertCustomer(senderPhone, { language: langSwitch });
        const langNames = { en: 'English', ur: 'Urdu / Hindi', bn: 'বাংলা (Bengali)', ar: 'العربية (Arabic)' };
        const switchConfirm = langSwitch === 'ur'
          ? `Zabardast! Ab hum Urdu me baat karenge. Main aapki kya madad kar sakta hoon?`
          : langSwitch === 'bn'
          ? `দারুণ! এখন থেকে আমরা বাংলায় কথা বলব। আমি আপনাকে কিভাবে সাহায্য করতে পারি?`
          : langSwitch === 'ar'
          ? `ممتاز! سنتحدث باللغة العربية الآن. كيف يمكنني مساعدتك؟`
          : `Great! Language switched to English. How can I help you today?`;
        await sock.sendMessage(remoteJid, { text: switchConfirm });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 1. ONBOARDING & CONTACT SAVE FLOW FOR FIRST-TIME USERS
      // ========================================================
      // --- STEP 1: First time message from new phone ---
      if (!customer) {
        const defaultGeo = detectCountryFromPhone(senderPhone);
        await sendOfficialVCard(sock, remoteJid);

        customer = await upsertCustomer(senderPhone, {
          stage: 'ask_name',
          country: defaultGeo.country,
          currency: defaultGeo.currency,
          language: defaultGeo.language,
          vcard_sent: true,
        });

        let welcomeAskName = '';
        if (defaultGeo.language === 'bn') {
          welcomeAskName =
`👋 *Welcome to ${PANEL_NAME}!*

আপনার নাম কি? (What is your name?)
_You can chat in English or বাংলা_

━━━━━━━━━━━━━━━━━━
📌 *Please save our contact card above so your account and chat stay safe!*`;
        } else if (defaultGeo.language === 'ar') {
          welcomeAskName =
`👋 *Welcome to ${PANEL_NAME}!*

ما هو اسمك؟ (What is your name?)
_You can chat in English or العربية_

━━━━━━━━━━━━━━━━━━
📌 *يرجى حفظ جهة الاتصال أعلاه للحفاظ على أمان حسابك ورسائلك!*`;
        } else if (defaultGeo.language === 'ur') {
          welcomeAskName =
`👋 *Welcome to ${PANEL_NAME}!*

Aapka naam kya hai? (What is your name?)

━━━━━━━━━━━━━━━━━━
📌 *Upar diye gaye contact card par click karke number SAVE kar lein taake aapka account aur chat safe rahe!*`;
        } else {
          // English / International
          welcomeAskName =
`👋 *Welcome to ${PANEL_NAME}!*

What is your name?
_Feel free to chat in English or your native language_

━━━━━━━━━━━━━━━━━━
📌 *Please click and SAVE our contact card above so your account and chat stay safe!*`;
        }

        await sock.sendMessage(remoteJid, { text: welcomeAskName });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      const userLang = customer.language || 'en';

      // --- INTENT FIRST: a real request must never be swallowed as a name/country answer ---
            // While onboarding is unfinished, intents are checked before the stage handlers.
            // If an intent matches, the stage blocks below are skipped and the message
            // falls through to the intent sections (speed up, refill, status, cancel, menu, AI).
            const INTENT_WORDS = [
              'speed up', 'speedup', 'fast karo', 'tez karo', 'jaldi karo', 'push order', 'order late', 'stuck', 'atki hui',
              'refill', 'drop hua', 'kam ho gaye', 'gir gaye', 'cancel', 'status', 'private', 'public', 'deposit', 'paisa',
              'add funds', 'balance nahi aya', 'scheduled', 'queue', 'link format', 'password', 'login', 'trial', 'free'
            ];
            const QUESTION_WORDS = ['?', 'kya', 'kaise', 'kab', 'kahan', 'kitne', 'kyun', 'kyon', 'can ', 'how ', 'what ', 'why ', 'ho sakta', 'hoga'];
            const isMenuDigit = ['1', '2', '3', '4', '5', '6', '7'].includes(cleanText);
            const isGreetingWord = ['hi', 'hello', 'salam', 'aoa', 'assalam', 'hey', 'start', 'menu', 'help', 'info', 'hy', 'bot'].some((g) => cleanText === g || cleanText.startsWith(g + ' '));
            const hasDirectIntent =
                      !!extractOrderId(text) ||
                      INTENT_WORDS.some((w) => cleanText.includes(w)) ||
                      QUESTION_WORDS.some((w) => cleanText.includes(w)) ||
                      isMenuDigit ||
                      isGreetingWord;
      
      // --- STEP 2: Customer responds with their Name ---
      if (customer.stage === 'ask_name' && !hasDirectIntent) {
        if (cleanText === 'saved' || cleanText === 'save' || cleanText === 'done' || cleanText === 'ho gaya' || cleanText === 'ok') {
          const reminderMsg = userLang === 'ur'
            ? `Number save karne ka shukriya! 😊\n\nAapka naam kya hai? (What is your name?)`
            : userLang === 'bn'
            ? `নাম্বারটি সেভ করার জন্য ধন্যবাদ! 😊\n\nআপনার নাম কি? (What is your name?)`
            : `Thank you for saving our contact! 😊\n\nWhat is your name?`;
          await sock.sendMessage(remoteJid, { text: reminderMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }

        const customerName = text.replace(/^(my name is|mera naam|naam|name)\s*[:=]?\s*/i, '').trim();
        customer = await upsertCustomer(senderPhone, {
          name: customerName,
          stage: 'ask_country',
        });

        saveContactToVcf(senderPhone, customerName, customer.country || 'Global');

        let askCountryMsg = '';
        if (userLang === 'ur') {
          askCountryMsg =
`Welcome, *${customerName}*! 😊

Aap kis country se hain?
(Pakistan, Bangladesh, USA, UAE wagera - taake aapko aapki local currency me rates mil sakein)`;
        } else if (userLang === 'bn') {
          askCountryMsg =
`Welcome, *${customerName}*! 😊

আপনি কোন দেশ থেকে বলছেন? (Which country are you from?)
(Bangladesh, USA, UAE, etc. - so we can show rates in your local currency)`;
        } else if (userLang === 'ar') {
          askCountryMsg =
`أهلاً بك يا *${customerName}*! 😊

من أي دولة أنت؟ (Which country are you from?)
(UAE, Saudi Arabia, USA, etc. - to show rates in your local currency)`;
        } else {
          askCountryMsg =
`Welcome, *${customerName}*! 😊

Which country are you from?
(USA, Bangladesh, UAE, etc. - so we can show rates in your local currency)`;
        }

        await sock.sendMessage(remoteJid, { text: askCountryMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // --- STEP 3: Customer responds with Country ---
      if (customer.stage === 'ask_country' && !hasDirectIntent) {
        if (cleanText === 'saved' || cleanText === 'save' || cleanText === 'done' || cleanText === 'ok') {
          const reminderMsg = userLang === 'ur'
            ? `Aap kis country se hain? (Pakistan, Bangladesh, USA, UAE wagera)`
            : `Which country are you from? (USA, Bangladesh, UAE, etc.)`;
          await sock.sendMessage(remoteJid, { text: reminderMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }

        const parsedGeo = parseCountryText(text) || detectCountryFromPhone(senderPhone);
        customer = await upsertCustomer(senderPhone, {
          country: parsedGeo.country,
          currency: parsedGeo.currency,
          language: parsedGeo.language,
          stage: 'ask_interest',
        });

        saveContactToVcf(senderPhone, customer.name, parsedGeo.country);

        const currentLang = parsedGeo.language;
        let askInterestMsg = '';
        if (currentLang === 'ur') {
          askInterestMsg =
`Country *${parsedGeo.country}* aur Currency *${parsedGeo.currency}* set ho gayi hai! ✅

Aapko kis platform ki services chahiye?
*A* - Instagram (Followers, Likes, Views)
*B* - TikTok (Views, Followers, Likes)
*C* - YouTube (Watch Time, Subscribers)
*D* - All Services & Reseller Panel

_Aap letter (A, B, C, D) ya platform ka naam likh kar bhej sakte hain!_`;
        } else if (currentLang === 'bn') {
          askInterestMsg =
`Country *${parsedGeo.country}* এবং Currency *${parsedGeo.currency} (${parsedGeo.symbol})* সেট করা হয়েছে! ✅

আপনার কোন প্ল্যাটফর্মের সার্ভিস প্রয়োজন?
*A* - Instagram (Followers, Likes, Views)
*B* - TikTok (Views, Followers, Likes)
*C* - YouTube (Watch Time, Subscribers)
*D* - All Services & Reseller Panel

_আপনি letter (A, B, C, D) অথবা প্ল্যাটফর্মের নাম লিখে পাঠাতে পারেন!_`;
        } else {
          askInterestMsg =
`Country *${parsedGeo.country}* and Currency *${parsedGeo.currency} (${parsedGeo.symbol})* configured! ✅

Which platform services do you need?
*A* - Instagram (Followers, Likes, Views)
*B* - TikTok (Views, Followers, Likes)
*C* - YouTube (Watch Time, Subscribers)
*D* - All Services & Reseller Panel

_Reply with A, B, C, D or your platform name!_`;
        }

        await sock.sendMessage(remoteJid, { text: askInterestMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // --- STEP 4: Customer selects Platform / Interest -> Onboarding Complete! ---
      if (customer.stage === 'ask_interest' && !hasDirectIntent) {
        let chosen = text.trim();
        if (cleanText === 'a') chosen = 'Instagram Services';
        else if (cleanText === 'b') chosen = 'TikTok Services';
        else if (cleanText === 'c') chosen = 'YouTube Services';
        else if (cleanText === 'd') chosen = 'All Services & Reseller';

        customer = await upsertCustomer(senderPhone, {
          interest: chosen,
          stage: 'completed',
        });

        // Fetch cheapest services in customer's local currency
        const cheapInCurr = await getCheapestServices(null, 4, customer.currency);
        const cheapText = cheapInCurr
          .map((s) => `• *${s.name}*: ${s.rateConverted} per 1,000`)
          .join('\n');

        const isUrdu = customer.language === 'ur';
        const completedMsg = isUrdu
          ? `🎉 *Welcome to ${PANEL_NAME}, ${customer.name}!*

Aapka profile set ho gaya hai!
🌍 Country: *${customer.country}*
💰 Currency: *${customer.currency}*
🎯 Platform: *${chosen}*

━━━━━━━━━━━━━━━━━━
🔥 *Live Cheapest Rates in ${customer.currency}:*
${cheapText}
━━━━━━━━━━━━━━━━━━

*Aap koi bhi sawal apni zuban me seedha pooch sakte hain!*

*Quick Menu:*
*1* 💳 - Payment Methods
*2* 📦 - Order Status & Speed Up
*3* 🎁 - Deposit Bonus Offers
*4* 🌐 - Website Services & Rates
*5* 👤 - Human Support
*6* ✨ - Free Test Trial Services
*7* 🌐 - Change Language / Zaban`
          : `🎉 *Welcome to ${PANEL_NAME}, ${customer.name}!*

Your profile is ready!
🌍 Country: *${customer.country}*
💰 Currency: *${customer.currency}*
🎯 Platform: *${chosen}*

━━━━━━━━━━━━━━━━━━
🔥 *Live Cheapest Rates in ${customer.currency}:*
${cheapText}
━━━━━━━━━━━━━━━━━━

*Feel free to chat and ask any questions in your own language!*

*Quick Menu:*
*1* 💳 - Payment Methods (${customer.currency})
*2* 📦 - Order Status & Speed Up
*3* 🎁 - Deposit Bonus Offers
*4* 🌐 - Website Services & Rates
*5* 👤 - Human Support
*6* ✨ - Free Test Trial Services
*7* 🌐 - Change Language / Zaban`;

        await sock.sendMessage(remoteJid, { text: completedMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
            // 1.5 CANCEL REQUEST (check the real order status first)
            // ========================================================
            const isCancelRequest = cleanText.includes('cancel') || cleanText.includes('mansookh');
            if (isCancelRequest) {
                      const cancelOrderId = extractOrderId(text);
                      if (!cancelOrderId) {
                                  await sock.sendMessage(remoteJid, { text: `❌ *Order cancel karne ke liye apna Order ID likhein:*\n👉 Maslan: *cancel order 125* ya *cancel #2843090*` });
                                  await sock.sendPresenceUpdate('paused', remoteJid);
                                  continue;
                      }
                      const cancelOrd = await lookupOrder(cancelOrderId);
                      if (!cancelOrd) {
                                  await sock.sendMessage(remoteJid, { text: `❌ Order "${cancelOrderId}" database me nahi mila. Order ID dobara check karke bhejein.` });
                                  await sock.sendPresenceUpdate('paused', remoteJid);
                                  continue;
                      }
                      const cancelSt = String(cancelOrd.status || '').toLowerCase();
                      if (cancelSt.includes('cancel')) {
                                  await sock.sendMessage(remoteJid, { text: `✅ *Order #${cancelOrd.shortId} pehle se Cancelled hai aur iska balance refund ho chuka hai.*` });
                      } else if (cancelSt.includes('complet')) {
                                  await sock.sendMessage(remoteJid, { text: `📦 *Order #${cancelOrd.shortId} already complete ho chuka hai, isliye isay cancel nahi kiya ja sakta.*\n\nUrgent madad ke liye *5* likh kar Human Support se rabta karein.` });
                      } else {
                                  await sock.sendMessage(remoteJid, { text: `📦 *Order #${cancelOrd.shortId}*\n• Status: *${cancelOrd.status}*\n\nAapki cancel request note kar li gayi hai, hamari team jald confirm karegi. Urgent ho to *5* likh kar Human Support se rabta karein.` });
                      }
                      await sock.sendPresenceUpdate('paused', remoteJid);
                      continue;
            }
      
      // ========================================================
      // 2. SPEED UP REQUEST (Automated Upstream Ticket & Push)
      // ========================================================
      const isSpeedUpRequest =
        cleanText.includes('speed up') ||
        cleanText.includes('speedup') ||
        cleanText.includes('fast karo') ||
        cleanText.includes('tez karo') ||
        cleanText.includes('jaldi karo') ||
        cleanText.includes('push order') ||
        cleanText.includes('order late') ||
        cleanText.includes('stuck') ||
        cleanText.includes('atki hui');

      if (isSpeedUpRequest) {
        const orderId = extractOrderId(text);
        if (orderId) {
          const speedUpResult = await processOrderSpeedUp(orderId, senderPhone);
          await sock.sendMessage(remoteJid, { text: speedUpResult.message });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        } else {
          const promptMsg =
`⚡ *VEXARO Automated Speed-Up Service*

${customer.name ? `${customer.name} bhai, ` : ''}Order ko priority speed par push karne ke liye apna *Order ID* likhein:
👉 Maslan: *speed up order 125* ya *speed up #26684bd1*

Jaise hi aap Order ID bhejenge, hamara bot foran upstream server ko *Priority Speed-Up Ticket* bhej kar order ko fast karwa dega!`;

          await sock.sendMessage(remoteJid, { text: promptMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }
      }

      // ========================================================
      // 2.5 REFILL REQUEST (Instant Refill & Drop Protection)
      // ========================================================
      const isRefillRequest =
        cleanText.startsWith('refill') ||
        cleanText.includes('drop hua') ||
        cleanText.includes('kam ho gaye') ||
        cleanText.includes('refill order');

      if (isRefillRequest) {
        const orderId = extractOrderId(text);
        if (orderId) {
          const refillRes = await processOrderRefill(orderId, senderPhone);
          await sock.sendMessage(remoteJid, { text: refillRes.message });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        } else {
          const promptRefill =
`♻️ *VEXARO Automated Refill Service*

${customer.name ? `${customer.name} bhai, ` : ''}Drop refill karne ke liye apna *Order ID* likhein:
👉 Maslan: *refill order 125* ya *refill #2785c101*

Aapka Order ID milte hi bot foran server check karke drop replenish/refill karna start kar dega!`;

          await sock.sendMessage(remoteJid, { text: promptRefill });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }
      }

      // ========================================================
      // 2.6 WEBSITE ISSUE RESOLUTION: PRIVATE ACCOUNT / PROFILE
      // ========================================================
      const isPrivateIssue =
        cleanText.includes('private') ||
        cleanText.includes('profile private') ||
        cleanText.includes('account private') ||
        cleanText.includes('private tha');

      if (isPrivateIssue && !isGreeting) {
        const privateMsg =
`🔒 *VEXARO Solution: Private Account Issue*

• *Rule:* Social media algorithms aur hamare high-speed delivery servers sirf *PUBLIC* accounts aur posts par deliver karte hain.
• *Refund:* Agar aapka account private tha aur order fail hua, toh uska 100% balance automatically aapke website wallet me wapas *Refund* ho chuka hai!
• *Solution:*
1. Apne Instagram / TikTok / Facebook account settings me jaa kar profile ko *Public* karein.
2. Website par login karein: ${PANEL_URL}/dashboard
3. Dobara New Order submit karein, delivery foran start ho jayegi!`;

        await sock.sendMessage(remoteJid, { text: privateMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 2.7 WEBSITE ISSUE RESOLUTION: DEPOSIT / ADD FUNDS NOT CREDITED
      // ========================================================
      const isDepositIssue =
        cleanText.includes('balance nahi aya') ||
        cleanText.includes('paisa nahi aya') ||
        cleanText.includes('paise nahi aye') ||
        cleanText.includes('deposit pending') ||
        cleanText.includes('balance add nahi hua') ||
        cleanText.includes('funds nahi aye') ||
        cleanText.includes('tid check');

      if (isDepositIssue && !isGreeting) {
        const depositMsg =
`💳 *VEXARO Solution: Deposit Verification & Add Funds*

• *Official Accounts:*
📱 *SadaPay:* ${SADAPAY_NO} (${SADAPAY_NAME})
📱 *Easypaisa:* ${EASYPAISA_NO} (${EASYPAISA_NAME})

⏱️ *Verification Time:*
Manual deposits hamari finance team 5 se 15 minute ke andar verify karke approve kar deti hai.

👉 *Agar 15 minute se zyada ho gaye hain:*
1. Make sure aapne sahi TID aur receipt screenshot submit kiya hai yahan: ${PANEL_URL}/dashboard?tab=add-funds
2. Aap apna Transaction ID (TID) aur payment screenshot direct yahan WhatsApp par send karein, ya *5* likhein taake live agent foran credit kar sake!`;

        await sock.sendMessage(remoteJid, { text: depositMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 2.8 WEBSITE ISSUE RESOLUTION: SCHEDULED / SAME-LINK QUEUE
      // ========================================================
      const isQueueIssue =
        cleanText.includes('scheduled') ||
        cleanText.includes('queue') ||
        cleanText.includes('same link') ||
        cleanText.includes('atki hui hai') ||
        cleanText.includes('pehle wala order');

      if (isQueueIssue && !isGreeting && !cleanText.startsWith('/')) {
        const queueMsg =
`🔗 *VEXARO Solution: Scheduled Order Queue System*

🎯 *Scheduled Status Kya Hai?*
Jab aap ek hi link ya video par ek order chalte waqt doosra naya order lagate hain, toh hamara smart queue system doosre order ko *Scheduled* me hold kar deta hai!

✨ *Fayda:*
Is se dono orders apas me clash nahi hote, koi drop nahi aata aur counter 100% accurate deliver hota hai.

✅ *Action:*
Pehla order complete hote hi queued order automatically *In Progress* me chala jata hai! Aapko kuch karne ki zaroorat nahi hai. Real-time track karein: ${PANEL_URL}/dashboard?tab=orders`;

        await sock.sendMessage(remoteJid, { text: queueMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 2.9 WEBSITE ISSUE RESOLUTION: LINK FORMAT HELP
      // ========================================================
      const isLinkIssue =
        cleanText.includes('link format') ||
        cleanText.includes('galat link') ||
        cleanText.includes('link kaisa') ||
        cleanText.includes('link error') ||
        cleanText.includes('invalid link');

      if (isLinkIssue && !isGreeting) {
        const linkMsg =
`🔗 *VEXARO Guide: Durust Link Enter Karne Ka Tareeqa*

1. 👥 *Followers / Subscribers ke liye:*
   Hamesha direct profile link enter karein:
   • Instagram: https://instagram.com/username
   • TikTok: https://tiktok.com/@username
   • YouTube: Channel link

2. ❤️ *Likes / Views / Comments / Shares ke liye:*
   Hamesha post ya video ka direct link enter karein:
   • Instagram Post: https://instagram.com/p/CODE/
   • Instagram Reel: https://instagram.com/reel/CODE/
   • TikTok Video: https://tiktok.com/@user/video/123456
   • YouTube Video: https://youtube.com/watch?v=VIDEO_ID

⚠️ *Important:* 24-hour Story link ya private account link use na karein!`;

        await sock.sendMessage(remoteJid, { text: linkMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 2.10 WEBSITE ISSUE RESOLUTION: PASSWORD / LOGIN RECOVERY
      // ========================================================
      const isLoginIssue =
        cleanText.includes('password bhool') ||
        cleanText.includes('login nahi ho raha') ||
        cleanText.includes('login issue') ||
        cleanText.includes('reset password') ||
        cleanText.includes('account login');

      if (isLoginIssue && !isGreeting) {
        const loginMsg =
`🔑 *VEXARO Guide: Password & Login Recovery*

1. Website login page par jayein: ${PANEL_URL}/login
2. *Forgot Password* par click karke apna registered email enter karein. Reset link aapke inbox/spam folder me aa jayega.
3. Agar email par link na mile, toh *5* likh kar reply karein aur apna registered email/username batayein. Hamara admin foran aapka password reset kar dega!`;

        await sock.sendMessage(remoteJid, { text: loginMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 3. OPTION 2 & DIRECT ORDER STATUS CHECK
      // ========================================================
      const extractedId = extractOrderId(text);
      const isOption2 =
        cleanText === '2' ||
        cleanText === '2.' ||
        cleanText === '#2' ||
        cleanText === 'option 2' ||
        cleanText === 'order status' ||
        cleanText === 'order check' ||
        cleanText === 'track order' ||
        cleanText === 'status check';

      const isOrderQuery =
        isOption2 ||
        cleanText.startsWith('order') ||
        cleanText.startsWith('#') ||
        cleanText.includes('order status') ||
        cleanText.includes('kahan pohancha') ||
        (extractedId && !['1', '2', '3', '4', '5', '6', '7'].includes(cleanText));

      if (isOrderQuery) {
        if (extractedId) {
          const order = await lookupOrder(extractedId);
          if (order) {
            const convertedCharge = convertPkrToCurrency(order.chargePkr, customer.currency);
            const statusMsg =
`📦 *VEXARO Live Order Details:*

🔢 *Order ID:* #${order.shortId}
🚀 *Service:* ${order.serviceName}
👥 *Quantity:* ${order.quantity}
📊 *Current Status:* *${order.status}*
💳 *Charge:* ${convertedCharge.formatted}
${order.remains ? `⏳ *Remains:* ${order.remains}` : ''}

━━━━━━━━━━━━━━━━━━
⚡ *Tip:* Agar aapka order slow hai, toh *speed up order ${order.shortId}* likh kar reply karein! Hamara bot foran server ko priority speed-up ticket send kar dega.`;

            await sock.sendMessage(remoteJid, { text: statusMsg });
            await sock.sendPresenceUpdate('paused', remoteJid);
            continue;
          } else {
            const notFoundMsg = customer.language === 'ur'
              ? `❌ Order ID *#${extractedId}* hamare record me nahi mila. Barah-e-meherbani apna sahi Order ID dobara bhejien ya Website par check karein: ${PANEL_URL}/dashboard?tab=orders`
              : `❌ Order ID *#${extractedId}* was not found. Please double-check your Order ID on our website: ${PANEL_URL}/dashboard?tab=orders`;
            await sock.sendMessage(remoteJid, { text: notFoundMsg });
            await sock.sendPresenceUpdate('paused', remoteJid);
            continue;
          }
        } else {
          // User sent '2' without an Order ID
          const isUrdu = customer.language === 'ur';
          const isBn = customer.language === 'bn';
          const isAr = customer.language === 'ar';

          const promptMsg = isUrdu
            ? `📦 *VEXARO Order Status & Speed Up Service*\n\nApna *Order ID* number bhejien (maslan: *125* ya *#2785c101*).\n\nHamara bot live status check karega aur agar order atka ya slow hua, toh foran upstream server ko *Priority Speed-Up Ticket* bhej kar fast karwa dega!`
            : isBn
            ? `📦 *VEXARO Order Status & Speed Up*\n\nআপনার *Order ID* নাম্বারটি লিখে পাঠান (যেমন: *125* বা *#2785c101*)।\n\nআমরা সরাসরি লাইভ স্ট্যাটাস চেক করব এবং অর্ডার স্লো থাকলে স্পিড আপ করে দেব!`
            : isAr
            ? `📦 *VEXARO حالة الطلب وتسريع الخدمة*\n\nيرجى إرسال *رقم الطلب (Order ID)* (مثال: *125* أو *#2785c101*).\n\nسنتحقق من الحالة فوراً وتسريع الطلب إن كان بطيئاً!`
            : `📦 *VEXARO Order Tracking & Speed Up Service*\n\nPlease reply with your *Order ID* (for example: *125* or *#2785c101*).\n\nOur system will check live database status and dispatch a priority speed-up ticket if your order is pending or slow!`;

          await sock.sendMessage(remoteJid, { text: promptMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }
      }

      // ========================================================
      // 4. MENU & GREETINGS
      // ========================================================
      const greetings = ['hi', 'hello', 'salam', 'aoa', 'assalam', 'hey', 'start', 'menu', 'help', 'info', 'hy', 'bot'];
      const isGreeting = greetings.some((g) => cleanText === g || cleanText.startsWith(g + ' '));

      if (isGreeting) {
        const menuMsg =
`👋 *Assalam-o-Alaikum ${customer.name || ''}! Welcome to ${PANEL_NAME}.*

Main aapki kya madad kar sakta hoon?

*Reply karein number ke sath:*
*1* 💳 - Payment Methods (${customer.currency || 'PKR'})
*2* 📦 - Order Status & Speed Up
*3* 🎁 - Special Bonus Offers
*4* 🌐 - Website Services & Rates (${customer.currency || 'PKR'})
*5* 👤 - Admin / Human Support se Baat Karein
*6* ✨ - Free Test Trial Services (1,000 Views / 50 Likes Free)
*7* 🌐 - Change Language / Zaban (English, اردو, বাংলা, العربية)

_Aap apna koi bhi sawal apni zuban me seedha pooch sakte hain!_`;

        await sock.sendMessage(remoteJid, { text: menuMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 5. OPTION 1: PAYMENT DETAILS (LOCALIZED BY COUNTRY)
      // ========================================================
      if (
        cleanText === '1' ||
        cleanText === '1.' ||
        cleanText === '#1' ||
        cleanText === 'option 1' ||
        cleanText.includes('payment') ||
        cleanText.includes('sadapay') ||
        cleanText.includes('easypaisa') ||
        cleanText.includes('jazzcash') ||
        cleanText.includes('paisa kaise') ||
        cleanText.includes('deposit') ||
        cleanText.includes('add funds')
      ) {
        let paymentMsg = '';

        if (customer.currency === 'PKR' || customer.country === 'Pakistan') {
          paymentMsg =
`💳 *${PANEL_NAME} - Official Payment Accounts (Pakistan)*

*SadaPay:*
📱 Number: *${SADAPAY_NO}*
👤 Title: *${SADAPAY_NAME}*

*Easypaisa:*
📱 Number: *${EASYPAISA_NO}*
👤 Title: *${EASYPAISA_NAME}*

━━━━━━━━━━━━━━━━━━
📝 *Paisa Add Karne Ka Tareeqa:*
1. SadaPay ya Easypaisa se amount send karein.
2. Screenshot le lein.
3. Website par login karke *Add Funds* page par jayein:
👉 ${PANEL_URL}/dashboard?tab=add-funds
4. TID aur screenshot submit kar dein, 5 se 10 minute me balance add ho jayega!

_Note: Rs 5,000 ya us se zyada deposit par free extra bonus milta hai!_`;
        } else {
          // Bangladesh, USA, UAE, International
          paymentMsg =
`💳 *${PANEL_NAME} - International Payment Methods*

For *${customer.country}* & Worldwide users:

1. 🟡 *Binance Pay (Zero Fee - Instant):*
   • Pay with USDT / BUSD directly on website.
2. 💳 *Credit / Debit Card (Visa & Mastercard):*
   • Instant wallet deposit on website.
3. 🌐 *Crypto / Payeer / Perfect Money:*
   • Available in the Add Funds section.
4. 📱 *Local Bank / Mobile Wallet:*
   • Contact our Admin by replying *5* for direct manual deposit options for ${customer.country}.

👉 Website Deposit Page: ${PANEL_URL}/dashboard?tab=add-funds`;
        }

        await sock.sendMessage(remoteJid, { text: paymentMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 6. OPTION 3: DEPOSIT BONUS
      // ========================================================
      if (
        cleanText === '3' ||
        cleanText === '3.' ||
        cleanText === '#3' ||
        cleanText === 'option 3' ||
        cleanText.includes('bonus') ||
        cleanText.includes('offer')
      ) {
        const bonusMsg =
`🎁 *${PANEL_NAME} Deposit Bonus Rewards:*

Agar aap Rs 5,000 (ya equivalent in ${customer.currency}) add karte hain toh aapko extra free bonus balance milta hai:

✨ *Tier 1:* 5% Extra Bonus Balance!
👑 *Tier 2:* 10% VIP Bonus Balance!

_Note: Minimum deposit bonus starts at Rs 5,000+._
Abhi login karein aur extra balance hasil karein:
👉 ${PANEL_URL}/dashboard?tab=add-funds`;

        await sock.sendMessage(remoteJid, { text: bonusMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 7. OPTION 4: WEBSITE SERVICES & LIVE RATES
      // ========================================================
      if (
        cleanText === '4' ||
        cleanText === '4.' ||
        cleanText === '#4' ||
        cleanText === 'option 4' ||
        cleanText === 'services' ||
        cleanText === 'rates' ||
        cleanText === 'rate list' ||
        cleanText === 'prices'
      ) {
        const cheapServices = await getCheapestServices(null, 6, customer.currency);
        const cheapList = cheapServices
          .map((s) => `• *${s.name}*\n  Rate: *${s.rateConverted}* per 1,000 (Min: ${s.min})`)
          .join('\n\n');

        const isUrdu = customer.language === 'ur';
        const isBn = customer.language === 'bn';
        const isAr = customer.language === 'ar';

        const servicesMsg = isUrdu
          ? `🌐 *${PANEL_NAME} - Sab Se Sasti Services & Live Rates (${customer.currency}):*

${cheapList}

━━━━━━━━━━━━━━━━━━
📊 *Full Catalog & Instant Orders:*
👉 ${PANEL_URL}/services`
          : isBn
          ? `🌐 *${PANEL_NAME} - লাইভ সার্ভিস এবং রেট তালিকা (${customer.currency}):*

${cheapList}

━━━━━━━━━━━━━━━━━━
📊 *সম্পূর্ণ সার্ভিস তালিকা দেখুন:*
👉 ${PANEL_URL}/services`
          : isAr
          ? `🌐 *${PANEL_NAME} - قائمة الخدمات والأسعار المباشرة (${customer.currency}):*

${cheapList}

━━━━━━━━━━━━━━━━━━
📊 *للاطلاع على جميع الخدمات:*
👉 ${PANEL_URL}/services`
          : `🌐 *${PANEL_NAME} - Popular Services & Live Rates (${customer.currency}):*

${cheapList}

━━━━━━━━━━━━━━━━━━
📊 *View Full Catalog & Order Live:*
👉 ${PANEL_URL}/services`;

        await sock.sendMessage(remoteJid, { text: servicesMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 8. OPTION 5: HUMAN ADMIN SUPPORT
      // ========================================================
      if (
        cleanText === '5' ||
        cleanText === '5.' ||
        cleanText === '#5' ||
        cleanText === 'option 5' ||
        cleanText === 'admin' ||
        cleanText.includes('human') ||
        cleanText.includes('agent')
      ) {
        // Automatically pause bot for 24h for human takeover so Admin can chat smoothly!
        await setPhoneControl(senderPhone, { isPaused: true, pauseHours: 24, reason: 'Customer requested human support' });

        const adminMsg =
`👤 *Human Admin Support:*

${customer.name ? `${customer.name} bhai, ` : ''}Aapka message hamare support admin ko forward kar diya gaya hai.
Aap hamari official WhatsApp Support helpline par bhi direct rabta kar sakte hain:
📱 *Support WhatsApp:* +92 308 8180234

Aap apna masla (Order ID ya screenshot) yahan likh kar chhor dein, admin jald se jald aapko reply karenge!
_(Note: Admin ke reply aane tak bot ko temporarily pause kar diya gaya hai taake aap direct insan se baat kar sakein)._`;

        await sock.sendMessage(remoteJid, { text: adminMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 9. OPTION 6: FREE TEST TRIAL SERVICES (SEPARATE FROM CHEAP SERVICES)
      // ========================================================
      if (
        cleanText === '6' ||
        cleanText === '6.' ||
        cleanText === '#6' ||
        cleanText === 'option 6' ||
        cleanText.includes('trial') ||
        cleanText.includes('free test') ||
        cleanText.includes('free service') ||
        cleanText.includes('muft')
      ) {
        const trials = await getFreeTrialServices(customer?.currency);
        const trialList = trials.map((t) => `✨ *${t.name}* (100% Free)`).join('\n');

        const trialMsg =
`🎁 *${PANEL_NAME} 100% Free Test Trial Services:*

Hum naye customers ko speed test karne ke liye FREE services dete hain bina kisi payment ke:

${trialList || '• TikTok Views [Free Test Trial - Max 1,000 Views]\n• Instagram Views [Free Test Trial - Max 1,000 Views]\n• Instagram Likes [Free Test Trial - Max 50 Likes]'}

━━━━━━━━━━━━━━━━━━
📝 *Free Trial Lagane Ka Tareeqa:*
1. Website par visit karein: ${PANEL_URL}
2. Login ya Sign Up karein.
3. *New Order* page par jayein -> Category: *Free Test Trial* select karein.
4. Apna post ya video link enter karein aur submit karein.
_Order automatically 1-5 minutes me start ho jayega!_`;

        await sock.sendMessage(remoteJid, { text: trialMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 10. OPTION 7: LANGUAGE SELECTION / ZABAN BADLEIN
      // ========================================================
      if (
        cleanText === '7' ||
        cleanText === '7.' ||
        cleanText === '#7' ||
        cleanText === 'option 7' ||
        cleanText === 'language' ||
        cleanText === 'zaban' ||
        cleanText === 'zuban' ||
        cleanText === 'bhasha'
      ) {
        const langMenuMsg =
`🌐 *Select Your Preferred Language / Apni Zaban Chunein:*

Reply with:
• *7A* or *EN* - 🇬🇧 English
• *7B* or *UR* - 🇵🇰 Roman Urdu / اردو
• *7C* or *BN* - 🇧🇩 বাংলা (Bengali)
• *7D* or *AR* - 🇸🇦 العربية (Arabic)

_Aap direct language ka naam (e.g. "English" ya "Urdu") bhi likh kar bhej sakte hain!_`;

        await sock.sendMessage(remoteJid, { text: langMenuMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 10. INTELLIGENT AI "THINKING" (LOCAL CURRENCY RATES)
      // ========================================================
      let liveContext = '';

      if (
        cleanText.includes('cheap') ||
        cleanText.includes('sasti') ||
        cleanText.includes('kam rate') ||
        cleanText.includes('dam') ||
        cleanText.includes('koto') ||
        cleanText.includes('price') ||
        cleanText.includes('low')
      ) {
        const cheapServices = await getCheapestServices(null, 6, customer.currency);
        liveContext = `Live Cheapest Services in ${customer.currency} from VEXARO database:\n` +
          cheapServices.map((s) => `- ${s.name}: ${s.rateConverted} per 1,000 (Min: ${s.min}, Max: ${s.max})`).join('\n');
      } else if (
        cleanText.includes('tiktok') ||
        cleanText.includes('instagram') ||
        cleanText.includes('youtube') ||
        cleanText.includes('facebook') ||
        cleanText.includes('telegram') ||
        cleanText.includes('views') ||
        cleanText.includes('followers') ||
        cleanText.includes('likes') ||
        cleanText.includes('subscribers') ||
        cleanText.includes('rate') ||
        cleanText.includes('service')
      ) {
        let searchKey = 'instagram';
        if (cleanText.includes('tiktok')) searchKey = 'tiktok';
        else if (cleanText.includes('youtube')) searchKey = 'youtube';
        else if (cleanText.includes('facebook')) searchKey = 'facebook';
        else if (cleanText.includes('telegram')) searchKey = 'telegram';
        else if (cleanText.includes('followers')) searchKey = 'followers';
        else if (cleanText.includes('views')) searchKey = 'views';

        const searched = await searchServices(searchKey, 6, customer.currency);
        if (searched.length > 0) {
          liveContext = `Live ${searchKey.toUpperCase()} Services in ${customer.currency} from VEXARO database:\n` +
            searched.map((s) => `- ${s.name}: ${s.rateConverted} per 1,000 (Min: ${s.min})`).join('\n');
        }
      }

      const aiReply = await askIntelligentGemini(text, liveContext, customer);
      await sock.sendMessage(remoteJid, { text: aiReply });
      await sock.sendPresenceUpdate('paused', remoteJid);
    }
  });
}

startBot().catch((err) => {
  console.error('Fatal Bot Error:', err);
});
