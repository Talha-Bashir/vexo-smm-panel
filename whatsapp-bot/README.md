# 🤖 VEXARO SMM Panel - 100% Free WhatsApp Bot

Yeh bot **100% Free** hai. Isme kisi bhi third-party paid tool (Wasender, Wati, UltraMsg) ya paid ChatGPT API ki zaroorat nahi hai.

- **WhatsApp Engine:** Baileys (Pure open-source WhatsApp Web protocol)
- **AI Engine:** Google Gemini Flash (100% Free Tier API)
- **Running Cost:** 0 Rupees (Aapke apne PC / Laptop par chalta hai)

---

## 🚀 Bot Start Karne Ka Tareeqa (Step-by-Step)

### 1. Payment Numbers Set Karein
Agar aapko apne JazzCash ya Easypaisa ke numbers change karne hain, toh `.env` file ko open karein aur edit karein:
```env
EASYPAISA_NO="0300-1234567"
EASYPAISA_NAME="Aapka Name"

JAZZCASH_NO="0300-1234567"
JAZZCASH_NAME="Aapka Name"
```

### 2. Bot Run Karein
Terminal ya PowerShell me `whatsapp-bot` folder ke andar jayein aur yeh command likhein:

```bash
cd whatsapp-bot
npm start
```

### 3. QR Code Scan Karein
1. Terminal me ek QR Code print ho jayega.
2. Apne mobile me **WhatsApp** open karein.
3. Top right par 3 dots (ya Settings) dabayein -> **Linked Devices**.
4. **"Link a Device"** par click karke terminal wala QR code scan karein.
5. Connected! Terminal me likha aayega: `✅ WHATSAPP BOT CONNECTED SUCCESSFULLY!`.

---

## ⚡ Bot 24/7 Background Me Kaise Chalayein? (PC band kiye baghair)

Agar aap chahte hain ke terminal window band bhi ho jaye tab bhi bot background me chalta rahe, toh **PM2** (Free Process Manager) use karein:

```bash
# PM2 install karein (sirf 1 dafa):
npm install -g pm2

# Bot background me start karein:
cd whatsapp-bot
pm2 start index.js --name vexaro-bot

# Check status:
pm2 status

# Agar bot stop karna ho:
pm2 stop vexaro-bot
```

---

## 🛡️ WhatsApp Ban Se Bachne Ke Rules:
1. **Never send bulk/spam messages**: Bot sirf un customers ko reply karta hai jo **khud pehle message karte hain**.
2. Is bot me already **2.2 seconds ka human delay** aur **typing indicator** shamil hai taake WhatsApp block na kare.
