const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cardsDir = path.join(__dirname, '..', 'public', 'video_cards');
if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });

const cards = [
  {
    name: 'card_comparison.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(7, 13, 13, 0.96); display: flex; align-items: center; justify-content: center; }
  .card { width: 1280px; background: linear-gradient(135deg, #0e1916, #07100f); border: 2px solid rgba(186, 255, 0, 0.6); border-radius: 36px; padding: 52px; box-shadow: 0 0 80px rgba(186, 255, 0, 0.25); text-align: center; }
  .badge { display: inline-block; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 8px 24px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
  h1 { color: #ffffff; font-size: 56px; font-weight: 900; line-height: 1.15; margin-bottom: 36px; letter-spacing: -1px; }
  .highlight { color: #baff00; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .col-bad { background: rgba(239, 68, 68, 0.08); border: 2px solid rgba(239, 68, 68, 0.35); border-radius: 28px; padding: 36px 28px; text-align: left; }
  .col-good { background: rgba(186, 255, 0, 0.08); border: 2px solid rgba(186, 255, 0, 0.6); border-radius: 28px; padding: 36px 28px; text-align: left; box-shadow: 0 0 35px rgba(186, 255, 0, 0.15); }
  .price-bad { color: #ef4444; font-size: 54px; font-weight: 900; margin: 12px 0 16px; }
  .price-good { color: #baff00; font-size: 54px; font-weight: 900; margin: 12px 0 16px; }
  .label-bad { color: #f87171; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  .label-good { color: #baff00; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  .desc { color: #cbd5e1; font-size: 20px; line-height: 1.5; }
  .tick { color: #baff00; font-weight: 900; margin-right: 8px; }
  .cross { color: #ef4444; font-weight: 900; margin-right: 8px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🔥 The SMM Arbitrage Exposed</div>
    <h1>TYPICAL RESELLERS vs <span class="highlight">VEXARO SMM</span></h1>
    <div class="grid">
      <div class="col-bad">
        <div class="label-bad">❌ Local Resellers & Agencies</div>
        <div class="price-bad">₨2,000 – ₨3,000</div>
        <div class="desc">
          <p><span class="cross">✕</span> 3,000% Middleman Profit Markup</p>
          <p><span class="cross">✕</span> Slow Manual Processing</p>
          <p><span class="cross">✕</span> Zero Refill / Drop Protection</p>
        </div>
      </div>
      <div class="col-good">
        <div class="label-good">✅ Direct Wholesale Provider</div>
        <div class="price-good">₨1.85 – ₨60</div>
        <div class="desc">
          <p><span class="tick">✓</span> Direct Tier-1 Wholesale API Rates</p>
          <p><span class="tick">✓</span> 0% Fee Instant SadaPay & Easypaisa</p>
          <p><span class="tick">✓</span> 30-Day Automated Non-Drop Refill</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_payments.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(7, 13, 13, 0.96); display: flex; align-items: center; justify-content: center; }
  .card { width: 1280px; background: linear-gradient(135deg, #0e1916, #07100f); border: 2px solid rgba(186, 255, 0, 0.6); border-radius: 36px; padding: 52px; box-shadow: 0 0 80px rgba(186, 255, 0, 0.25); text-align: center; }
  .badge { display: inline-block; background: rgba(37, 211, 102, 0.15); border: 1px solid #25d366; color: #25d366; padding: 8px 24px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
  h1 { color: #ffffff; font-size: 54px; font-weight: 900; line-height: 1.15; margin-bottom: 36px; }
  .highlight { color: #baff00; }
  .pills { display: flex; justify-content: center; gap: 24px; margin-bottom: 36px; }
  .pill { background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.15); border-radius: 20px; padding: 20px 32px; font-size: 26px; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 14px; }
  .pill-green { border-color: rgba(186, 255, 0, 0.5); background: rgba(186, 255, 0, 0.08); color: #baff00; }
  .pill-teal { border-color: rgba(37, 211, 102, 0.5); background: rgba(37, 211, 102, 0.08); color: #25d366; }
  .pill-orange { border-color: rgba(251, 146, 60, 0.5); background: rgba(251, 146, 60, 0.08); color: #fb923c; }
  .footer-box { background: rgba(186, 255, 0, 0.1); border: 1px solid #baff00; border-radius: 20px; padding: 22px; color: #ffffff; font-size: 22px; font-weight: 700; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🇵🇰 Built for Pakistan</div>
    <h1>INSTANT DEPOSITS WITH <span class="highlight">0% GATEWAY FEES</span></h1>
    <div class="pills">
      <div class="pill pill-green">
        <span>⚡</span> SadaPay (Instant)
      </div>
      <div class="pill pill-teal">
        <span>📱</span> Easypaisa
      </div>
      <div class="pill pill-orange">
        <span>💳</span> JazzCash
      </div>
    </div>
    <div class="footer-box">
      💬 Direct WhatsApp Support & Concierge: <span style="color: #baff00; font-weight: 900;">+92 317 6437013</span> (Talha Bashir)
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_bonus.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(7, 13, 13, 0.96); display: flex; align-items: center; justify-content: center; }
  .card { width: 1280px; background: linear-gradient(135deg, #0e1916, #07100f); border: 2px solid rgba(186, 255, 0, 0.8); border-radius: 36px; padding: 56px; box-shadow: 0 0 100px rgba(186, 255, 0, 0.35); text-align: center; }
  .badge { display: inline-block; background: #baff00; color: #07100f; padding: 10px 32px; border-radius: 999px; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; box-shadow: 0 0 30px rgba(186, 255, 0, 0.4); }
  h1 { color: #ffffff; font-size: 64px; font-weight: 900; line-height: 1.1; margin-bottom: 20px; }
  .highlight { color: #baff00; }
  p { color: #94a3b8; font-size: 26px; font-weight: 600; margin-bottom: 36px; }
  .url-box { background: rgba(255, 255, 255, 0.05); border: 2px solid #baff00; border-radius: 24px; padding: 24px 40px; display: inline-block; color: #ffffff; font-size: 38px; font-weight: 900; letter-spacing: 1px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🎁 New User Bonus</div>
    <h1>CLAIM YOUR <span class="highlight">₨50 FREE BALANCE</span></h1>
    <p>Test wholesale TikTok views & Instagram followers without depositing a single rupee!</p>
    <div class="url-box">
      🌐 Visit: <span style="color: #baff00;">vexarosmm.com/signup</span>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_founder.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(7, 13, 13, 0.96); display: flex; align-items: center; justify-content: center; }
  .card { width: 1240px; background: linear-gradient(135deg, #0e1916, #07100f); border: 2px solid rgba(186, 255, 0, 0.7); border-radius: 36px; padding: 56px; box-shadow: 0 0 90px rgba(186, 255, 0, 0.3); text-align: center; }
  .badge { display: inline-block; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 8px 28px; border-radius: 999px; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  h1 { color: #ffffff; font-size: 60px; font-weight: 900; line-height: 1.15; margin-bottom: 16px; }
  .subtitle { color: #94a3b8; font-size: 26px; font-weight: 600; margin-bottom: 36px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .stat-box { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(186, 255, 0, 0.3); border-radius: 24px; padding: 28px 20px; }
  .stat-val { font-size: 46px; font-weight: 900; color: #baff00; margin-bottom: 8px; }
  .stat-lbl { font-size: 18px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge">🚀 Teen Founder Story</div>
    <h1>TALHA BASHIR</h1>
    <p class="subtitle">Building Pakistan's #1 Automated Wholesale SMM Platform at Age 15</p>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-val">₨0</div>
        <div class="stat-lbl">Initial Startup Capital</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">100%</div>
        <div class="stat-lbl">Automated Next.js Engine</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">99.98%</div>
        <div class="stat-lbl">Tier-1 API Server Uptime</div>
      </div>
    </div>
  </div>
</body>
</html>`
  }
];

cards.forEach(c => {
  const tmpHtml = path.join(cardsDir, 'temp.html');
  const outPng = path.join(cardsDir, c.name);
  fs.writeFileSync(tmpHtml, c.html);
  console.log('Rendering', c.name, 'via Edge...');
  execFileSync(edgePath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1920,1080',
    '--screenshot=' + outPng,
    'file:///' + tmpHtml.replace(/\\/g, '/')
  ]);
  console.log('✓ Created:', outPng);
});
console.log('All graphic cards rendered successfully!');
