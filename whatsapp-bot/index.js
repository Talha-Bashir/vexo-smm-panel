import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCheapestServices,
  searchServices,
  lookupOrder,
  processOrderSpeedUp,
  sanitizeText
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const PANEL_NAME = process.env.PANEL_NAME || 'VEXARO SMM Panel';
const PANEL_URL = process.env.PANEL_URL || 'https://vexarosmm.com';
const SADAPAY_NO = process.env.SADAPAY_NO || '03197008275';
const SADAPAY_NAME = process.env.SADAPAY_NAME || 'Saeed Bashir';
const EASYPAISA_NO = process.env.EASYPAISA_NO || '03197008275';
const EASYPAISA_NAME = process.env.EASYPAISA_NAME || 'Saeed Bashir';
const MIN_BONUS_DEPOSIT = process.env.MIN_BONUS_DEPOSIT || '5000';

// Simple debounce to prevent responding twice to duplicate webhook deliveries
const recentMessages = new Set();

/**
 * Intelligent AI Assistant with Live Website Awareness & Strict Security Guardrails
 */
async function askIntelligentGemini(userMessage, contextData = '') {
  if (!GEMINI_API_KEY) {
    return `Assalam-o-Alaikum! Welcome to ${PANEL_NAME}. Mazeed maloomat ke liye *menu* likh kar reply karein.`;
  }

  const systemPrompt = `You are the intelligent, polite official WhatsApp assistant for ${PANEL_NAME} (website: ${PANEL_URL}).

CRITICAL SECURITY & CONFIDENTIALITY RULES (STRICT ENFORCEMENT):
1. You represent ONLY ${PANEL_NAME}.
2. You must NEVER, under any circumstance, reveal or mention:
   - Any upstream provider or third-party panel names (e.g. SMM Flare, PAK SMM, Smooth SMM, Rizvi SMM, AM SMM, etc.).
   - Any supplier websites, URLs, API keys, database credentials, server connection strings, or profit margins.
   - Always refer to backend servers as "VEXARO Automated High-Speed Server" or "VEXARO Direct Server".
3. Reply in natural, friendly, polite Roman Urdu (or English if the user asked in English).
4. Use the live website data provided in the context to answer questions about services, prices, and rates accurately.
5. If someone asks how to add funds or pay, inform them they can pay via SadaPay or Easypaisa to ${SADAPAY_NO} (${SADAPAY_NAME}) and upload the receipt in the Add Funds tab.
6. Bonus rule: 5% bonus on Rs 5,000+ deposits, 10% bonus on Rs 10,000+ deposits. Under Rs 5,000 has 0 bonus.
7. Keep replies concise, helpful, and transparent (maximum 3-4 sentences).`;

  try {
    const inputContent = contextData
      ? `[LIVE WEBSITE CONTEXT FROM DATABASE]:\n${contextData}\n\n[USER QUESTION]:\n${userMessage}`
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

  return `Assalam-o-Alaikum! Aapka sawal mil gaya hai. Live services aur rates website par check karein: ${PANEL_URL}/services ya support ke liye *5* bhejien.`;
}

/**
 * Extract potential Order ID from message
 */
function extractOrderId(text) {
  // Check UUID format (e.g. 26684bd1-ebe1-4d3c-aabd-6ddac4b39c32 or prefix 26684bd1)
  const uuidMatch = text.match(/[a-f0-9]{8}(?:-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?/i);
  if (uuidMatch) return uuidMatch[0];

  // Check "#12345" or "order 12345"
  const orderNumMatch = text.match(/(?:order|id|#)\s*[:#]?\s*([0-9]{3,10})/i);
  if (orderNumMatch) return orderNumMatch[1];

  // Check standalone digits if 4 to 8 digits
  const standaloneDigits = text.match(/\b\d{4,8}\b/);
  if (standaloneDigits) return standaloneDigits[0];

  return null;
}

/**
 * Main WhatsApp Connection Handler
 */
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_session');
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n======================================================`);
  console.log(`🚀 Starting ${PANEL_NAME} Intelligent WhatsApp Assistant`);
  console.log(`Using Baileys v${version.join('.')}`);
  console.log(`Live Database Connected & Real-time Speed-Up Active`);
  console.log(`======================================================\n`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['VexaroBot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('📲 SCAN THIS QR CODE WITH YOUR WHATSAPP TO CONNECT:');
      console.log('1. Open WhatsApp on your phone');
      console.log('2. Tap 3 dots (or Settings) -> Linked Devices');
      console.log('3. Tap "Link a Device" and scan the code below:');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      console.log(
        `\n⚠️ Connection closed (reason: ${lastDisconnect?.error?.message || 'Unknown'}). Reconnecting: ${shouldReconnect}...`
      );

      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      } else {
        console.log('❌ Device logged out. Please restart the script and scan the new QR code.');
      }
    } else if (connection === 'open') {
      console.log('\n======================================================');
      console.log(`✅ [${PANEL_NAME}] WHATSAPP BOT CONNECTED SUCCESSFULLY!`);
      console.log('Bot is now LIVE and listening for customer messages.');
      console.log('======================================================\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (m.key.fromMe) continue;

      const remoteJid = m.key.remoteJid;
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

      const msgId = m.key.id;
      if (recentMessages.has(msgId)) continue;
      recentMessages.add(msgId);
      setTimeout(() => recentMessages.delete(msgId), 15000);

      const senderNumber = remoteJid.split('@')[0];
      console.log(`📩 [New Message] From: +${senderNumber} -> "${text}"`);

      // Human delay + typing indicator
      await sock.sendPresenceUpdate('composing', remoteJid);
      await new Promise((r) => setTimeout(r, 2200));

      const cleanText = text.toLowerCase();

      // ==========================================
      // 1. SPEED UP REQUEST (Automatic Provider Ticket & Push)
      // ==========================================
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
          const speedUpResult = await processOrderSpeedUp(orderId, senderNumber);
          await sock.sendMessage(remoteJid, { text: speedUpResult.message });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        } else {
          const promptMsg =
`⚡ *VEXARO Automated Speed-Up Service*

Order ko priority speed par push karne ke liye barah-e-karam apna *Order ID* likhein:
👉 Maslan: *speed up order 125* ya *speed up #26684bd1*

Jaise hi aap Order ID bhejenge, hamara bot foran upstream server ko *Priority Speed-Up Ticket* bhej kar order ko fast karwa dega!`;

          await sock.sendMessage(remoteJid, { text: promptMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }
      }

      // ==========================================
      // 2. DIRECT ORDER STATUS CHECK
      // ==========================================
      const isOrderQuery =
        cleanText.startsWith('order') ||
        cleanText.startsWith('#') ||
        cleanText.includes('order status') ||
        cleanText.includes('kahan pohancha') ||
        cleanText.includes('status check');

      const extractedId = extractOrderId(text);
      if (isOrderQuery && extractedId) {
        const order = await lookupOrder(extractedId);
        if (order) {
          const statusMsg =
`📦 *VEXARO Live Order Details:*

🔢 *Order ID:* #${order.shortId}
🚀 *Service:* ${order.serviceName}
👥 *Quantity:* ${order.quantity}
📊 *Current Status:* *${order.status}*
💳 *Charge:* Rs ${order.chargePkr}
${order.remains ? `⏳ *Remains:* ${order.remains}` : ''}

━━━━━━━━━━━━━━━━━━
⚡ *Tip:* Agar aapko lagta hai order slow hai, toh *speed up order ${order.shortId}* likh kar reply karein! Hamara bot foran server ko priority speed-up ticket send kar dega.`;

          await sock.sendMessage(remoteJid, { text: statusMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }
      }

      // ==========================================
      // 3. MENU & GREETINGS
      // ==========================================
      const greetings = ['hi', 'hello', 'salam', 'aoa', 'assalam', 'hey', 'start', 'menu', 'help', 'info', 'hy', 'bot'];
      const isGreeting = greetings.some((g) => cleanText === g || cleanText.startsWith(g + ' '));

      if (isGreeting) {
        const menuMsg =
`👋 *Assalam-o-Alaikum! Welcome to ${PANEL_NAME}.*

Main VEXARO ka automated WhatsApp assistant hoon. Main aapki kya madad kar sakta hoon?

*Reply karein number ke sath:*
*1* 💳 - SadaPay / Easypaisa Payment Details
*2* 📦 - Order Status & Speed Up
*3* 🎁 - Special Bonus Offers (Rs ${MIN_BONUS_DEPOSIT}+)
*4* 🌐 - Website Services & Live Rates
*5* 👤 - Admin / Human Support se Baat Karein

_Aap koi bhi sawal (maslan: "Aap ki cheap services kya hain?" ya "Speed up order 125") seedha pooch sakte hain!_`;

        await sock.sendMessage(remoteJid, { text: menuMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ==========================================
      // 4. OPTION 1: PAYMENT DETAILS (SadaPay & Easypaisa)
      // ==========================================
      if (
        cleanText === '1' ||
        cleanText.includes('payment') ||
        cleanText.includes('sadapay') ||
        cleanText.includes('easypaisa') ||
        cleanText.includes('jazzcash') ||
        cleanText.includes('paisa kaise') ||
        cleanText.includes('deposit')
      ) {
        const paymentMsg =
`💳 *${PANEL_NAME} - Official Payment Accounts*

*SadaPay:*
📱 Number: *${SADAPAY_NO}*
👤 Title: *${SADAPAY_NAME}*

*Easypaisa:*
📱 Number: *${EASYPAISA_NO}*
👤 Title: *${EASYPAISA_NAME}*

━━━━━━━━━━━━━━━━━━
📝 *Paisa Add Karne Ka Tareeqa:*
1. Upar diye gaye number par SadaPay ya Easypaisa se amount send karein.
2. Payment ka screenshot le lein.
3. Website par login karke *Add Funds* page par jayein:
👉 ${PANEL_URL}/dashboard?tab=add-funds
4. Amount, TID (Transaction ID), aur screenshot submit kar dein.
5. 5 se 10 minute me wallet balance auto approve ho jayega!

_Note: Rs 5,000 ya us se zyada par free extra bonus milta hai!_`;

        await sock.sendMessage(remoteJid, { text: paymentMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ==========================================
      // 5. OPTION 3: DEPOSIT BONUS
      // ==========================================
      if (cleanText === '3' || cleanText.includes('bonus') || cleanText.includes('offer')) {
        const bonusMsg =
`🎁 *${PANEL_NAME} Deposit Bonus Rewards:*

Agar aap Rs 5,000 ya us se zyada add karte hain toh aapko extra free bonus balance milta hai:

✨ *Rs 5,000+ Deposit:* 5% Extra Bonus Balance!
👑 *Rs 10,000+ Deposit:* 10% VIP Bonus Balance!

_Note: Rs 5,000 se kam deposit par bonus nahi milta._
Abhi login karein aur extra balance hasil karein:
👉 ${PANEL_URL}/dashboard?tab=add-funds`;

        await sock.sendMessage(remoteJid, { text: bonusMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ==========================================
      // 6. OPTION 5: HUMAN ADMIN SUPPORT
      // ==========================================
      if (cleanText === '5' || cleanText === 'admin' || cleanText.includes('human') || cleanText.includes('agent')) {
        const adminMsg =
`👤 *Human Admin Support:*

Aapka message support team ko notify kar diya gaya hai.
Aap apna masla (Order ID ya screenshot) yahan chhor dein, admin jald se jald aapko reply karenge. Shukriya!`;

        await sock.sendMessage(remoteJid, { text: adminMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ==========================================
      // 7. INTELLIGENT AI "THINKING" (LOOKS UP REAL WEBSITE DATA)
      // ==========================================
      let liveContext = '';

      // Check if user is asking about cheap/sasti services
      if (
        cleanText.includes('cheap') ||
        cleanText.includes('sasti') ||
        cleanText.includes('kam rate') ||
        cleanText.includes('sab se kam') ||
        cleanText.includes('low price')
      ) {
        const cheapServices = await getCheapestServices(null, 6);
        liveContext = 'Live Cheapest Services from VEXARO website database:\n' +
          cheapServices.map((s) => `- ${s.name} (Platform: ${s.platform}): Rs ${s.ratePkr} per 1,000 (Min: ${s.min}, Max: ${s.max})`).join('\n');
      }
      // Check if user mentions specific platforms (TikTok, Instagram, YouTube, Facebook, Telegram)
      else if (
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
        // Extract main platform or keyword
        let searchKey = 'instagram';
        if (cleanText.includes('tiktok')) searchKey = 'tiktok';
        else if (cleanText.includes('youtube')) searchKey = 'youtube';
        else if (cleanText.includes('facebook')) searchKey = 'facebook';
        else if (cleanText.includes('telegram')) searchKey = 'telegram';
        else if (cleanText.includes('followers')) searchKey = 'followers';
        else if (cleanText.includes('views')) searchKey = 'views';

        const searched = await searchServices(searchKey, 6);
        if (searched.length > 0) {
          liveContext = `Live ${searchKey.toUpperCase()} Services from VEXARO website database:\n` +
            searched.map((s) => `- ${s.name}: Rs ${s.ratePkr} per 1,000 (Min: ${s.min})`).join('\n');
        }
      }

      const aiReply = await askIntelligentGemini(text, liveContext);
      await sock.sendMessage(remoteJid, { text: aiReply });
      await sock.sendPresenceUpdate('paused', remoteJid);
    }
  });
}

startBot().catch((err) => {
  console.error('Fatal Bot Error:', err);
});
