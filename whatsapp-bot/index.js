import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const PANEL_NAME = process.env.PANEL_NAME || 'VEXARO SMM Panel';
const PANEL_URL = process.env.PANEL_URL || 'https://vexarosmm.com';
const EASYPAISA_NO = process.env.EASYPAISA_NO || '03197008275';
const EASYPAISA_NAME = process.env.EASYPAISA_NAME || 'Saeed Bashir';
const SADAPAY_NO = process.env.SADAPAY_NO || '03197008275';
const SADAPAY_NAME = process.env.SADAPAY_NAME || 'Saeed Bashir';
const MIN_BONUS_DEPOSIT = process.env.MIN_BONUS_DEPOSIT || '5000';

// Simple debounce to prevent responding twice to duplicate webhook deliveries
const recentMessages = new Set();

/**
 * Call 100% Free Google Gemini API
 */
async function askGemini(userMessage) {
  if (!GEMINI_API_KEY) {
    return "Assalam-o-Alaikum! VEXARO SMM Panel me khushamdeed. Menu dekhne ke liye *menu* likh kar reply karein.";
  }

  const systemPrompt = `You are the friendly, professional WhatsApp assistant for ${PANEL_NAME} (website: ${PANEL_URL}).
Follow these rules:
1. Always respond in polite, natural Roman Urdu (or English if the user asked in English).
2. Keep replies short, concise, and helpful (maximum 2-3 sentences).
3. VEXARO provides social media services (Instagram followers, TikTok views/likes, YouTube watchtime/subscribers, Facebook, etc.).
4. Deposit bonus is only on Rs 5,000+ (5% bonus) and Rs 10,000+ (10% bonus). Under 5,000 has 0 bonus.
5. If the user asks about payments, tell them to type 1.
6. If the user asks for human/admin help, tell them to type 5.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-3.5-flash-lite',
        input: userMessage,
        system_instruction: systemPrompt
      })
    });

    const data = await res.json();
    const outputStep = data.steps?.find(s => s.type === 'model_output');
    const aiText = outputStep?.content?.[0]?.text;

    if (aiText && aiText.trim()) {
      return aiText.trim();
    }
  } catch (err) {
    console.error('[Gemini API Error]:', err.message);
  }

  // Fallback if AI has temporary glitch
  return `Assalam-o-Alaikum! Aapka sawal mil gaya hai. VEXARO services aur details ke liye *menu* likh kar reply karein ya admin ke liye *5* bhejien.`;
}

/**
 * Main WhatsApp Connection Handler
 */
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_session');
  const { version } = await fetchLatestBaileysVersion();

  console.log(`\n======================================================`);
  console.log(`🚀 Starting ${PANEL_NAME} WhatsApp Assistant`);
  console.log(`Using Baileys v${version.join('.')}`);
  console.log(`======================================================\n`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }), // Silent internal logs to keep terminal clean
    printQRInTerminal: false,
    auth: state,
    browser: ['VexaroBot', 'Chrome', '1.0.0']
  });

  // Save auth credentials whenever updated
  sock.ev.on('creds.update', saveCreds);

  // Connection update event (QR display, reconnect, connection established)
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

  // Listen for incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      // Ignore if sent by bot itself
      if (m.key.fromMe) continue;

      const remoteJid = m.key.remoteJid;
      if (!remoteJid) continue;

      // Ignore group messages (@g.us) and status broadcasts (@broadcast)
      if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
        continue;
      }

      // Extract message text
      const rawText =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        '';

      const text = rawText.trim();
      if (!text) continue;

      // Deduplication check
      const msgId = m.key.id;
      if (recentMessages.has(msgId)) continue;
      recentMessages.add(msgId);
      setTimeout(() => recentMessages.delete(msgId), 15000);

      const senderNumber = remoteJid.split('@')[0];
      console.log(`📩 [New Message] From: +${senderNumber} -> "${text}"`);

      // Human delay (2.5 seconds) + show typing indicator to prevent WhatsApp spam flags
      await sock.sendPresenceUpdate('composing', remoteJid);
      await new Promise((r) => setTimeout(r, 2200));

      const cleanText = text.toLowerCase();

      // 1. Menu & Greetings
      const greetings = ['hi', 'hello', 'salam', 'aoa', 'assalam', 'hey', 'start', 'menu', 'help', 'info', 'hy', 'bot'];
      const isGreeting = greetings.some((g) => cleanText === g || cleanText.startsWith(g + ' '));

      if (isGreeting) {
        const menuMsg = 
`👋 *Assalam-o-Alaikum! Welcome to ${PANEL_NAME}.*

Main VEXARO ka automated WhatsApp assistant hoon. Main aapki kya madad kar sakta hoon?

*Reply karein number ke sath:*
*1* 💳 - Payment Details / Paisa Kaise Add Karein
*2* 📦 - Order Status Check Karein
*3* 🎁 - Special Bonus Offers (Rs ${MIN_BONUS_DEPOSIT}+)
*4* 🌐 - Website Services & Live Rates
*5* 👤 - Admin / Human Support se Baat Karein

_Aap apna koi bhi sawal Roman Urdu ya English me seedha likh kar bhi pooch sakte hain!_`;

        await sock.sendMessage(remoteJid, { text: menuMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // 2. Option 1: Payment Details
      if (cleanText === '1' || cleanText.includes('payment') || cleanText.includes('sadapay') || cleanText.includes('easypaisa') || cleanText.includes('jazzcash')) {
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
1. Upar diye gaye number par SadaPay ya Easypaisa se payment transfer karein.
2. Payment ka screenshot le lein.
3. Website par login karke *Add Funds* page par jayein:
👉 ${PANEL_URL}/dashboard?tab=add-funds
4. Amount, TID (Transaction ID), aur screenshot upload kar dein.
5. 5 se 10 minute me balance auto approve ho jayega!

_Note: Rs 5,000 ya us se zyada par free extra bonus milta hai!_`;

        await sock.sendMessage(remoteJid, { text: paymentMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // 3. Option 2: Order Status
      if (cleanText === '2' || cleanText.startsWith('order') || cleanText.includes('status')) {
        const orderMsg =
`📦 *Order Status Check:*

Aap apne tamam orders ka live status website par check kar sakte hain:
👉 ${PANEL_URL}/dashboard?tab=orders

Agar aapka order delayed hai toh apna *Order ID* (maslan: #105) aur masla yahan likh kar bhej dein, hamara support admin check kar lega!`;

        await sock.sendMessage(remoteJid, { text: orderMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // 4. Option 3: Deposit Bonus Offer
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

      // 5. Option 4: Website & Services
      if (cleanText === '4' || cleanText.includes('service') || cleanText.includes('rate') || cleanText.includes('price')) {
        const serviceMsg =
`🌐 *${PANEL_NAME} Popular Services & Rates:*

Hum Pakistan aur Worldwide sab se cheapest aur fast services dete hain:
🔥 Instagram Followers, Likes, Views & Comments
🎵 TikTok Views (Instant), Likes & Followers
▶️ YouTube Monetization, Watch Time & Subscribers
📘 Facebook Page Likes & Followers
💬 WhatsApp Channels & Telegram Members

Website par live rate list check karein:
👉 ${PANEL_URL}/services

1-Click me new order lagayein:
👉 ${PANEL_URL}/dashboard?tab=new-order`;

        await sock.sendMessage(remoteJid, { text: serviceMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // 6. Option 5: Admin Support
      if (cleanText === '5' || cleanText.includes('admin') || cleanText.includes('support') || cleanText.includes('agent')) {
        const adminMsg =
`👤 *Human Admin Support:*

Aapka message hamare support team ko forward kar diya gaya hai.
Aap apna masla (Order ID ya screenshot) yahan chhor dein, admin jald se jald aapko reply karenge. Shukriya!`;

        await sock.sendMessage(remoteJid, { text: adminMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // 7. General Questions -> Smart Google Gemini AI (100% Free)
      const aiReply = await askGemini(text);
      await sock.sendMessage(remoteJid, { text: aiReply });
      await sock.sendPresenceUpdate('paused', remoteJid);
    }
  });
}

// Start bot
startBot().catch((err) => {
  console.error('Fatal Bot Error:', err);
});
