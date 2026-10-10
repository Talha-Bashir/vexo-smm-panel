const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cardsDir = path.join(__dirname, '..', 'public', 'video_cards');
if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });

const logoPath = path.join(__dirname, '..', 'public', 'vexaro_logo.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const popups = [
  {
    name: 'popup_choice.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card { width: 840px; background: linear-gradient(135deg, rgba(14, 25, 22, 0.95), rgba(7, 16, 15, 0.97)); border: 2px solid rgba(186, 255, 0, 0.8); border-radius: 28px; padding: 26px 24px; box-shadow: 0 0 50px rgba(186, 255, 0, 0.35); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 4px 16px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  h1 { color: #ffffff; font-size: 32px; font-weight: 900; margin-bottom: 20px; }
  .highlight { color: #baff00; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; text-align: left; }
  .path-box { border-radius: 18px; padding: 18px 16px; }
  .p-bad { background: rgba(239, 68, 68, 0.1); border: 1.5px solid rgba(239, 68, 68, 0.4); }
  .p-good { background: rgba(186, 255, 0, 0.1); border: 1.5px solid rgba(186, 255, 0, 0.6); }
  .p-title { font-size: 15px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; }
  .item { color: #cbd5e1; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 20px; height: 20px; border-radius: 50%;" /> Decision at 15</div>
    <h1>TWO ROADS FOR A <span class="highlight">15-YEAR-OLD</span></h1>
    <div class="grid">
      <div class="path-box p-bad">
        <div class="p-title" style="color:#f87171;">✕ Ordinary Path</div>
        <div class="item">• Homework & School Exams</div>
        <div class="item">• Late Night PUBG with Friends</div>
        <div class="item">• TikTok Doomscrolling</div>
      </div>
      <div class="path-box p-good">
        <div class="p-title" style="color:#baff00;">✓ The Founder Path</div>
        <div class="item">• Built Vexaro SMM Platform</div>
        <div class="item">• ₨0 Initial Investment</div>
        <div class="item">• Automated Server APIs</div>
      </div>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'popup_arbitrage.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card { width: 840px; background: linear-gradient(135deg, rgba(14, 25, 22, 0.95), rgba(7, 16, 15, 0.97)); border: 2px solid rgba(239, 68, 68, 0.8); border-radius: 28px; padding: 28px 24px; box-shadow: 0 0 50px rgba(239, 68, 68, 0.3); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; padding: 4px 16px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  h1 { color: #ffffff; font-size: 32px; font-weight: 900; margin-bottom: 22px; }
  .math-row { display: grid; grid-template-columns: 1fr auto 1fr auto 1.3fr; gap: 10px; align-items: center; margin-bottom: 20px; }
  .box { background: rgba(255, 255, 255, 0.04); border-radius: 16px; padding: 16px 10px; text-align: center; }
  .b-danger { background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.5); }
  .b-profit { background: rgba(245, 158, 11, 0.12); border: 1.5px solid rgba(245, 158, 11, 0.5); }
  .op { color: #64748b; font-size: 32px; font-weight: 900; }
  .val { font-size: 28px; font-weight: 900; }
  .lbl { font-size: 12px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
  .footer { color: #baff00; font-size: 16px; font-weight: 700; background: rgba(186, 255, 0, 0.08); border: 1px solid rgba(186, 255, 0, 0.3); padding: 10px 18px; border-radius: 14px; display: inline-flex; align-items: center; gap: 10px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">⚠️ 3,000% Middleman Markup Exposed</div>
    <h1>THE RESELLER ARBITRAGE</h1>
    <div class="math-row">
      <div class="box b-danger">
        <div class="lbl">Buyer Pays Reseller</div>
        <div class="val" style="color:#ef4444;">₨2,000</div>
      </div>
      <div class="op">−</div>
      <div class="box">
        <div class="lbl">Actual API Cost</div>
        <div class="val" style="color:#38bdf8;">₨60</div>
      </div>
      <div class="op">=</div>
      <div class="box b-profit">
        <div class="lbl">Middleman Kept</div>
        <div class="val" style="color:#f59e0b;">₨1,940 (97%)</div>
      </div>
    </div>
    <div class="footer">
      <img src="data:image/png;base64,${logoBase64}" style="width: 24px; height: 24px; border-radius: 50%;" />
      <span>Vexaro SMM gives you direct provider rates (₨60) with 0 markup!</span>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'popup_payments.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card { width: 840px; background: linear-gradient(135deg, rgba(14, 25, 22, 0.95), rgba(7, 16, 15, 0.97)); border: 2px solid rgba(186, 255, 0, 0.8); border-radius: 28px; padding: 28px 24px; box-shadow: 0 0 50px rgba(186, 255, 0, 0.35); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.15); border: 1px solid #25d366; color: #25d366; padding: 4px 16px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  h1 { color: #ffffff; font-size: 32px; font-weight: 900; margin-bottom: 24px; }
  .pills { display: flex; justify-content: center; gap: 14px; margin-bottom: 22px; }
  .pill { background: rgba(255, 255, 255, 0.05); border-radius: 14px; padding: 14px 20px; font-size: 18px; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 8px; }
  .pill-green { border: 1.5px solid rgba(186, 255, 0, 0.6); color: #baff00; }
  .pill-teal { border: 1.5px solid rgba(37, 211, 102, 0.6); color: #25d366; }
  .pill-orange { border: 1.5px solid rgba(251, 146, 60, 0.6); color: #fb923c; }
  .footer { color: #ffffff; font-size: 15px; font-weight: 700; background: rgba(186, 255, 0, 0.1); border: 1px solid #baff00; padding: 12px; border-radius: 14px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 20px; height: 20px; border-radius: 50%;" /> 🇵🇰 Built for Pakistan</div>
    <h1>INSTANT 0% FEE DEPOSITS</h1>
    <div class="pills">
      <div class="pill pill-green">⚡ SadaPay (Instant)</div>
      <div class="pill pill-teal">📱 Easypaisa</div>
      <div class="pill pill-orange">💳 JazzCash</div>
    </div>
    <div class="footer">
      💬 Direct WhatsApp Support: <span style="color:#baff00; font-weight:900;">+92 317 6437013</span> (Talha Bashir)
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'popup_panic.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card { width: 840px; background: linear-gradient(135deg, rgba(20, 6, 6, 0.97), rgba(12, 4, 4, 0.98)); border: 2px solid rgba(239, 68, 68, 0.85); border-radius: 28px; padding: 24px 22px; box-shadow: 0 0 60px rgba(239, 68, 68, 0.4); text-align: left; }
  .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 4px 16px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  h1 { color: #ffffff; font-size: 28px; font-weight: 900; margin-bottom: 16px; }
  .chat-bubble { background: #202c33; color: #e9edef; padding: 12px 18px; border-radius: 14px 14px 14px 2px; font-size: 16px; font-weight: 600; line-height: 1.4; margin-bottom: 12px; }
  .bubble-danger { border-left: 5px solid #ef4444; color: #fecaca; }
  .sender { font-size: 12px; color: #ef4444; font-weight: 800; margin-bottom: 2px; }
  .time { font-size: 11px; color: #8696a0; text-align: right; }
  .callout { font-size: 15px; color: #baff00; font-weight: 800; text-align: center; margin-top: 12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🚨 02:30 AM Crisis</div>
    <h1>SERVER DOWN & POLICE THREAT</h1>
    <div class="chat-bubble">
      <div class="sender">Customer</div>
      Bhai paise cut gaye lekin order dashboard par nahi aaya!!??
      <div class="time">02:31 AM</div>
    </div>
    <div class="chat-bubble bubble-danger">
      <div class="sender">Customer</div>
      Bhai mere paise kahan gaye? Main direct Police mein report karunga! 🚨
      <div class="time">02:33 AM</div>
    </div>
    <div class="callout">
      😰 15yo Founder in Cold Sweat -> Instant Refund -> Built Auto-Backup System!
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'popup_failover.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card { width: 840px; background: linear-gradient(135deg, rgba(14, 25, 22, 0.95), rgba(7, 16, 15, 0.97)); border: 2px solid rgba(186, 255, 0, 0.8); border-radius: 28px; padding: 26px 22px; box-shadow: 0 0 50px rgba(186, 255, 0, 0.35); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 4px 16px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }
  h1 { color: #ffffff; font-size: 30px; font-weight: 900; margin-bottom: 20px; }
  .flow { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; }
  .node { flex: 1; border-radius: 18px; padding: 20px 14px; }
  .n-bad { background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.5); }
  .n-route { background: rgba(56, 189, 248, 0.12); border: 1.5px solid rgba(56, 189, 248, 0.6); }
  .n-good { background: rgba(186, 255, 0, 0.12); border: 1.5px solid rgba(186, 255, 0, 0.7); }
  .n-title { font-size: 16px; font-weight: 900; margin-bottom: 4px; }
  .n-desc { font-size: 12px; color: #cbd5e1; }
  .arr { color: #baff00; font-size: 32px; font-weight: 900; }
  .footer { color: #ffffff; font-size: 14px; font-weight: 800; background: rgba(186, 255, 0, 0.1); border: 1px solid #baff00; padding: 12px; border-radius: 14px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 20px; height: 20px; border-radius: 50%;" /> 🛡️ 99.9% Uptime Engine</div>
    <h1>VEXARO FAILOVER SYSTEM</h1>
    <div class="flow">
      <div class="node n-bad">
        <div class="n-title" style="color:#ef4444;">✕ Server 1 Down</div>
        <div class="n-desc">Crash detected in 500ms</div>
      </div>
      <div class="arr">➔</div>
      <div class="node n-route">
        <div class="n-title" style="color:#38bdf8;">⚡ Auto Reroute</div>
        <div class="n-desc">Zero manual delay</div>
      </div>
      <div class="arr">➔</div>
      <div class="node n-good">
        <div class="n-title" style="color:#baff00;">✓ Server 2 Active</div>
        <div class="n-desc">Order 100% Fulfilled</div>
      </div>
    </div>
    <div class="footer">
      ⚡ Missing in 99% of Pakistani panels — Built by a 15yo student!
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'popup_bonus.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card { width: 840px; background: linear-gradient(135deg, rgba(14, 25, 22, 0.95), rgba(7, 16, 15, 0.97)); border: 2px solid rgba(186, 255, 0, 0.8); border-radius: 28px; padding: 24px 22px; box-shadow: 0 0 50px rgba(186, 255, 0, 0.35); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 4px 16px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }
  h1 { color: #ffffff; font-size: 32px; font-weight: 900; margin-bottom: 14px; }
  .box { background: rgba(186, 255, 0, 0.12); border: 2px dashed #baff00; border-radius: 18px; padding: 16px; margin-bottom: 16px; }
  .code { color: #baff00; font-size: 34px; font-weight: 900; font-family: monospace; letter-spacing: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .item { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 12px; font-size: 15px; font-weight: 700; color: #ffffff; }
  .highlight { color: #baff00; font-weight: 900; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 20px; height: 20px; border-radius: 50%;" /> 🎁 Free Gift</div>
    <h1>GET <span style="color:#baff00;">₨50 FREE BALANCE</span></h1>
    <div class="box">
      <div class="code">CODE: START50</div>
    </div>
    <div class="grid">
      <div class="item">📱 WhatsApp: <span class="highlight">+92 317 6437013</span></div>
      <div class="item">🌐 Website: <span class="highlight">vexarosmm.com</span></div>
    </div>
    <div style="margin-top: 12px; color: #38bdf8; font-size: 14px; font-weight: 800;">
      🇬🇧 UK TikTok Monetization Accounts for ₨250 Only!
    </div>
  </div>
</body>
</html>`
  }
];

console.log('Rendering transparent floating popup cards...');
popups.forEach(p => {
  const tmpHtml = path.join(__dirname, `_tmp_${p.name}.html`);
  const outPng = path.join(cardsDir, p.name);
  fs.writeFileSync(tmpHtml, p.html, 'utf8');

  console.log(`Rendering ${p.name} via Edge...`);
  execFileSync(edgePath, [
    '--headless',
    '--disable-gpu',
    '--default-background-color=00000000',
    '--window-size=880,520',
    `--screenshot=${outPng}`,
    tmpHtml
  ]);

  if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  console.log(`✓ Created: ${outPng}`);
});

console.log('All transparent floating popups created successfully!');
