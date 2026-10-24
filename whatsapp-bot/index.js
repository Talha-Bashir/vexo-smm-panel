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
  ensureCustomerSchema,
  getCustomer,
  upsertCustomer,
  saveContactToVcf,
  detectCountryFromPhone,
  parseCountryText,
  convertPkrToCurrency,
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

  const systemPrompt = `You are the friendly, intelligent official WhatsApp assistant for ${PANEL_NAME} (website: ${PANEL_URL}).

CUSTOMER PROFILE:
- Name: ${userName}
- Country: ${userCountry}
- Preferred Currency: ${userCurrency}

CRITICAL SECURITY & CONFIDENTIALITY RULES (STRICT ENFORCEMENT):
1. You represent ONLY ${PANEL_NAME}.
2. You must NEVER, under any circumstance, reveal or mention:
   - Any upstream provider or third-party panel names (e.g. SMM Flare, PAK SMM, Smooth SMM, Rizvi SMM, AM SMM, etc.).
   - Any supplier websites, URLs, API keys, database credentials, or server connection strings.
   - Always refer to backend servers as "VEXARO Automated High-Speed Server" or "VEXARO Direct Server".
3. Always quote prices and rates in the customer's preferred currency (${userCurrency}).
4. Reply in natural, friendly, polite Roman Urdu (or English if the user asked in English). Address them respectfully by their name (${userName}).
5. Use the live website data provided in the context to answer questions about services and prices accurately.
6. Keep replies concise, helpful, and transparent (maximum 3-4 sentences).`;

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

/**
 * Main WhatsApp Connection Handler
 */
async function startBot() {
  await ensureCustomerSchema();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_session');
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
      console.log('Bot is now LIVE with Onboarding & Currency Detection.');
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

      const senderPhone = remoteJid.replace(/:\d+@/, '@').split('@')[0].replace(/\D/g, '');
      console.log(`📩 [New Message] From: +${senderPhone} -> "${text}"`);

      // Human delay & typing status
      await sock.sendPresenceUpdate('composing', remoteJid);
      await new Promise((r) => setTimeout(r, 2200));

      const cleanText = text.toLowerCase();

      // ========================================================
      // 1. ONBOARDING & CONTACT SAVE FLOW FOR FIRST-TIME USERS
      // ========================================================
      let customer = await getCustomer(senderPhone);

      // --- STEP 1: First time message from new phone ---
      if (!customer) {
        const defaultGeo = detectCountryFromPhone(senderPhone);
        await sendOfficialVCard(sock, remoteJid);

        customer = await upsertCustomer(senderPhone, {
          stage: 'ask_name',
          country: defaultGeo.country,
          currency: defaultGeo.currency,
          vcard_sent: true,
        });

        const welcomeAskName =
`👋 *Assalam-o-Alaikum! Welcome to ${PANEL_NAME}.*

Main VEXARO ka automated assistant hoon. Hamare panel par Pakistan, Bangladesh, US aur Worldwide sab se cheapest aur fast social media services milti hain.

Aapko aapke mulk ke mutabiq best rates aur VIP discount dene ke liye:
👤 *1. Barah-e-karam apna Pyara Naam batayein?* (Maslan: *Talha*)

━━━━━━━━━━━━━━━━━━
📌 *Zaroori Anti-Ban Request:*
Upar bheje gaye contact card par click karke hamara number *"VEXARO Official"* ke naam se apne phone me **SAVE** kar lein taake aapka account aur tamam updates safe rahein!`;

        await sock.sendMessage(remoteJid, { text: welcomeAskName });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // --- STEP 2: Customer responds with their Name ---
      if (customer.stage === 'ask_name') {
        // If customer is just acknowledging contact save
        if (cleanText === 'saved' || cleanText === 'save' || cleanText === 'done' || cleanText === 'ho gaya' || cleanText === 'ok') {
          const reminderMsg =
`Boht shukriya hamara number save karne ka! 😊

Aapko aapke mulk ke mutabiq best rates aur special discount dene ke liye:
👤 *Barah-e-karam apna Pyara Naam batayein?* (Maslan: *Talha*)`;
          await sock.sendMessage(remoteJid, { text: reminderMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }

        const customerName = text.replace(/^(my name is|mera naam|naam|name)\s*[:=]?\s*/i, '').trim();
        customer = await upsertCustomer(senderPhone, {
          name: customerName,
          stage: 'ask_country',
        });

        // Save contact to phone VCF file
        saveContactToVcf(senderPhone, customerName, customer.country || 'Global');

        const askCountryMsg =
`Boht shukriya, *${customerName}* bhai! 😊

🌍 *2. Aap kis Mulk / Country se hain?*
(Maslan: *Pakistan*, *Bangladesh*, *USA*, *UAE*, *Saudi Arabia*, etc.)

_Yeh is liye zaroori hai taake hum aapko aapki local currency me rates aur local payment methods dikha sakein!_`;

        await sock.sendMessage(remoteJid, { text: askCountryMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // --- STEP 3: Customer responds with Country ---
      if (customer.stage === 'ask_country') {
        if (cleanText === 'saved' || cleanText === 'save' || cleanText === 'done' || cleanText === 'ok') {
          const reminderMsg =
`Shukriya ${customer.name || ''} bhai! 😊

🌍 *Barah-e-karam apna Mulk / Country batayein?*
(Maslan: *Pakistan*, *Bangladesh*, *USA*, *UAE*, etc.)`;
          await sock.sendMessage(remoteJid, { text: reminderMsg });
          await sock.sendPresenceUpdate('paused', remoteJid);
          continue;
        }

        const parsedGeo = parseCountryText(text) || detectCountryFromPhone(senderPhone);
        customer = await upsertCustomer(senderPhone, {
          country: parsedGeo.country,
          currency: parsedGeo.currency,
          stage: 'ask_interest',
        });

        // Update VCF file with customer name and country
        saveContactToVcf(senderPhone, customer.name, parsedGeo.country);

        const askInterestMsg =
`Zabardast! Aapka Mulk *${parsedGeo.country}* aur Currency *${parsedGeo.currency} (${parsedGeo.symbol})* set ho gayi hai. ✅

🎯 *3. Aapko kis platform ki services chahiye?*
*A* - Instagram (Followers, Likes, Views)
*B* - TikTok (Views, Followers, Likes)
*C* - YouTube (Watch Time, Subscribers)
*D* - All Services & Reseller Panel

_Aap letter (A, B, C, D) ya platform ka naam likh kar reply karein!_`;

        await sock.sendMessage(remoteJid, { text: askInterestMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // --- STEP 4: Customer selects Platform / Interest -> Onboarding Complete! ---
      if (customer.stage === 'ask_interest') {
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

        const completedMsg =
`🎉 *Welcome to ${PANEL_NAME}, ${customer.name} bhai!*

Aapka profile successfully set ho gaya hai!
🌍 Country: *${customer.country}*
💰 Currency: *${customer.currency}*
🎯 Category: *${chosen}*

━━━━━━━━━━━━━━━━━━
🔥 *Live Cheapest Rates in ${customer.currency}:*
${cheapText}
━━━━━━━━━━━━━━━━━━

*Ab aap jo bhi sawal poochenge, aapko aapki currency (${customer.currency}) me live rates milenge!*

*Quick Menu:*
*1* 💳 - Payment Methods (${customer.currency})
*2* 📦 - Order Status & Speed Up
*3* 🎁 - Deposit Bonus Offers
*4* 🌐 - Website Services & Rates
*5* 👤 - Human Support`;

        await sock.sendMessage(remoteJid, { text: completedMsg });
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
      // 3. DIRECT ORDER STATUS CHECK
      // ========================================================
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
      if (cleanText === '3' || cleanText.includes('bonus') || cleanText.includes('offer')) {
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
      // 7. OPTION 5: HUMAN ADMIN SUPPORT
      // ========================================================
      if (cleanText === '5' || cleanText === 'admin' || cleanText.includes('human') || cleanText.includes('agent')) {
        const adminMsg =
`👤 *Human Admin Support:*

${customer.name ? `${customer.name} bhai, ` : ''}Aapka message hamare support admin ko forward kar diya gaya hai.
Aap hamari official WhatsApp Support helpline par bhi direct rabta kar sakte hain:
📱 *Support WhatsApp:* +92 308 8180234

Aap apna masla (Order ID ya screenshot) yahan likh kar chhor dein, admin jald se jald aapko reply karenge!`;

        await sock.sendMessage(remoteJid, { text: adminMsg });
        await sock.sendPresenceUpdate('paused', remoteJid);
        continue;
      }

      // ========================================================
      // 8. INTELLIGENT AI "THINKING" (LOCAL CURRENCY RATES)
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
