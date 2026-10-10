const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const cardsDir = path.join(__dirname, '..', 'public', 'video_cards');
if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });

const logoPath = path.join(__dirname, '..', 'public', 'vexaro_logo.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');
const logoImgTag = `<img src="data:image/png;base64,${logoBase64}" style="width: 76px; height: 76px; border-radius: 50%; filter: drop-shadow(0 0 18px #baff00); vertical-align: middle; margin-right: 14px;" />`;

const cards = [
  {
    name: 'card_choice.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(5, 10, 10, 0.96); display: flex; align-items: center; justify-content: center; }
  .container { width: 1360px; text-align: center; }
  .badge { display: inline-flex; align-items: center; background: rgba(186, 255, 0, 0.15); border: 2px solid #baff00; color: #baff00; padding: 8px 28px; border-radius: 999px; font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; box-shadow: 0 0 25px rgba(186, 255, 0, 0.3); }
  h1 { color: #ffffff; font-size: 58px; font-weight: 900; margin-bottom: 40px; letter-spacing: -1px; }
  .highlight { color: #baff00; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
  .card-path { border-radius: 32px; padding: 48px 36px; text-align: left; }
  .path-1 { background: rgba(239, 68, 68, 0.08); border: 2px solid rgba(239, 68, 68, 0.4); box-shadow: 0 0 40px rgba(239, 68, 68, 0.15); }
  .path-2 { background: rgba(186, 255, 0, 0.08); border: 2px solid rgba(186, 255, 0, 0.6); box-shadow: 0 0 50px rgba(186, 255, 0, 0.25); }
  .path-title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; display: flex; align-items: center; }
  .title-1 { color: #f87171; }
  .title-2 { color: #baff00; }
  .item { display: flex; align-items: center; gap: 16px; color: #cbd5e1; font-size: 22px; font-weight: 600; margin-bottom: 16px; }
  .icon-bad { background: rgba(239, 68, 68, 0.2); color: #ef4444; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; }
  .icon-good { background: rgba(186, 255, 0, 0.2); color: #baff00; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; }
</style>
</head>
<body>
  <div class="container">
    <div class="badge">Decision at Age 15</div>
    <h1>TWO ROADS IN FRONT OF A <span class="highlight">15-YEAR-OLD</span></h1>
    <div class="grid">
      <div class="card-path path-1">
        <div class="path-title title-1">❌ PATH 1: ORDINARY ROUTINE</div>
        <div class="item"><div class="icon-bad">✕</div> School Homework & Exams</div>
        <div class="item"><div class="icon-bad">✕</div> Late Night PUBG with Friends</div>
        <div class="item"><div class="icon-bad">✕</div> Endless TikTok Doomscrolling</div>
        <div class="item"><div class="icon-bad">✕</div> Zero Real-World Skills</div>
      </div>
      <div class="card-path path-2">
        <div class="path-title title-2"><img src="data:image/png;base64,${logoBase64}" style="width: 36px; height: 36px; margin-right: 12px; border-radius: 50%;" /> PATH 2: THE TECH FOUNDER</div>
        <div class="item"><div class="icon-good">✓</div> Built Automated Business (Vexaro SMM)</div>
        <div class="item"><div class="icon-good">✓</div> 100% Zero Starting Capital</div>
        <div class="item"><div class="icon-good">✓</div> Direct Server API Integrations</div>
        <div class="item"><div class="icon-good">✓</div> Thousands of Real Paying Customers</div>
      </div>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_arbitrage_math.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(7, 13, 13, 0.96); display: flex; align-items: center; justify-content: center; }
  .container { width: 1320px; text-align: center; }
  .badge { display: inline-block; background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; color: #ef4444; padding: 10px 28px; border-radius: 999px; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  h1 { color: #ffffff; font-size: 56px; font-weight: 900; margin-bottom: 40px; }
  .highlight { color: #ef4444; }
  .math-bar { display: grid; grid-template-columns: 1fr auto 1fr auto 1.3fr; gap: 20px; align-items: center; background: #0c1615; border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 32px; padding: 36px 32px; box-shadow: 0 0 50px rgba(0, 0, 0, 0.5); }
  .box { background: rgba(255, 255, 255, 0.04); border-radius: 24px; padding: 28px 20px; text-align: center; }
  .box-danger { background: rgba(239, 68, 68, 0.12); border: 2px solid rgba(239, 68, 68, 0.5); }
  .math-operator { color: #64748b; font-size: 48px; font-weight: 900; }
  .box-label { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
  .box-val { font-size: 44px; font-weight: 900; }
  .val-danger { color: #ef4444; }
  .val-cost { color: #38bdf8; }
  .val-profit { color: #f59e0b; }
  .footer-tag { margin-top: 32px; font-size: 24px; color: #baff00; font-weight: 700; background: rgba(186, 255, 0, 0.08); border: 1px solid rgba(186, 255, 0, 0.3); padding: 18px 36px; border-radius: 20px; display: inline-flex; align-items: center; gap: 14px; }
</style>
</head>
<body>
  <div class="container">
    <div class="badge">⚠️ The Reseller Arbitrage Exposed</div>
    <h1>WHY YOU ARE PAYING <span class="highlight">3,000% TOO MUCH</span></h1>
    <div class="math-bar">
      <div class="box box-danger">
        <div class="box-label">Customer Pays Reseller</div>
        <div class="box-val val-danger">₨2,000</div>
      </div>
      <div class="math-operator">−</div>
      <div class="box">
        <div class="box-label">Actual Wholesale Cost</div>
        <div class="box-val val-cost">₨60</div>
      </div>
      <div class="math-operator">=</div>
      <div class="box" style="background: rgba(245, 158, 11, 0.12); border: 2px solid rgba(245, 158, 11, 0.5);">
        <div class="box-label">Middleman Profit Kept</div>
        <div class="box-val val-profit">₨1,940 (97%)</div>
      </div>
    </div>
    <div class="footer-tag">
      <img src="data:image/png;base64,${logoBase64}" style="width: 36px; height: 36px; border-radius: 50%;" />
      <span>Vexaro SMM gives you that exact provider rate (₨60) with 0 middleman markup!</span>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_struggle_mom.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(4, 9, 9, 0.98); display: flex; align-items: center; justify-content: center; }
  .container { width: 1260px; text-align: center; }
  .badge { display: inline-block; background: rgba(148, 163, 184, 0.15); border: 1px solid #94a3b8; color: #cbd5e1; padding: 8px 24px; border-radius: 999px; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  .time-badge { font-size: 64px; font-weight: 900; color: #ef4444; text-shadow: 0 0 30px rgba(239, 68, 68, 0.5); margin-bottom: 24px; font-family: monospace; }
  .quote-box { background: rgba(15, 23, 42, 0.8); border: 2px solid rgba(148, 163, 184, 0.3); border-radius: 32px; padding: 48px; box-shadow: 0 0 60px rgba(0, 0, 0, 0.8); }
  .quote-text { color: #ffffff; font-size: 38px; font-weight: 700; line-height: 1.5; font-style: italic; margin-bottom: 24px; }
  .quote-author { color: #baff00; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
  .details { margin-top: 32px; color: #94a3b8; font-size: 22px; display: flex; justify-content: center; gap: 48px; }
</style>
</head>
<body>
  <div class="container">
    <div class="badge">🌙 The 15-Year-Old Reality</div>
    <div class="time-badge">03:15 AM</div>
    <div class="quote-box">
      <div class="quote-text">
        "Beta so jao, subah school jana hai... Yeh kya screen par safed kaali pattiyan dekh rahe ho?"
      </div>
      <div class="quote-author">— Mother walking into the bedroom at 3 AM</div>
    </div>
    <div class="details">
      <div>📚 Morning: Physics & Mathematics</div>
      <div>💻 Night: 12 AM – 4 AM Coding Vexaro</div>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_whatsapp_panic.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(15, 5, 5, 0.98); display: flex; align-items: center; justify-content: center; }
  .container { width: 1100px; text-align: center; }
  .badge { display: inline-block; background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; color: #ef4444; padding: 10px 28px; border-radius: 999px; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; box-shadow: 0 0 30px rgba(239, 68, 68, 0.4); }
  h1 { color: #ffffff; font-size: 50px; font-weight: 900; margin-bottom: 32px; }
  .chat-box { background: #0b141a; border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 28px; padding: 36px; box-shadow: 0 0 80px rgba(239, 68, 68, 0.25); text-align: left; }
  .msg-incoming { background: #202c33; color: #e9edef; padding: 18px 24px; border-radius: 18px 18px 18px 4px; max-width: 80%; font-size: 22px; font-weight: 600; line-height: 1.4; margin-bottom: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
  .msg-danger { border-left: 6px solid #ef4444; color: #fecaca; }
  .sender { font-size: 14px; color: #ef4444; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; }
  .time { font-size: 13px; color: #8696a0; text-align: right; margin-top: 6px; }
  .callout { margin-top: 28px; color: #cbd5e1; font-size: 22px; font-weight: 600; text-align: center; }
</style>
</head>
<body>
  <div class="container">
    <div class="badge">🚨 02:30 AM Crisis — The Turning Point</div>
    <h1>SUPPLIER SERVER DOWN & <span style="color:#ef4444;">POLICE THREAT</span></h1>
    <div class="chat-box">
      <div class="msg-incoming">
        <div class="sender">Customer</div>
        Bhai paise kat gaye lekin order dashboard par show nahi ho raha!!??
        <div class="time">02:31 AM</div>
      </div>
      <div class="msg-incoming msg-danger">
        <div class="sender">Customer</div>
        Bhai mere paise kahan gaye? Main subah direct Police mein report karunga!! 🚨
        <div class="time">02:33 AM</div>
      </div>
    </div>
    <div class="callout">
      😰 15-Year-Old Founder in Cold Sweat -> Instant Refund -> <span style="color:#baff00; font-weight:900;">Built Auto-Backup System That Night!</span>
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_failover_diagram.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(5, 12, 12, 0.96); display: flex; align-items: center; justify-content: center; }
  .container { width: 1320px; text-align: center; }
  .badge { display: inline-block; background: rgba(186, 255, 0, 0.15); border: 2px solid #baff00; color: #baff00; padding: 10px 28px; border-radius: 999px; font-size: 20px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px; }
  h1 { color: #ffffff; font-size: 54px; font-weight: 900; margin-bottom: 40px; }
  .flow { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 36px; }
  .node { flex: 1; border-radius: 28px; padding: 36px 24px; text-align: center; }
  .node-bad { background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.5); }
  .node-router { background: rgba(56, 189, 248, 0.1); border: 2px solid rgba(56, 189, 248, 0.6); box-shadow: 0 0 40px rgba(56, 189, 248, 0.2); }
  .node-good { background: rgba(186, 255, 0, 0.12); border: 2px solid rgba(186, 255, 0, 0.7); box-shadow: 0 0 40px rgba(186, 255, 0, 0.25); }
  .node-icon { font-size: 48px; margin-bottom: 12px; }
  .node-title { font-size: 22px; font-weight: 900; color: #ffffff; margin-bottom: 8px; }
  .node-desc { font-size: 16px; color: #94a3b8; }
  .arrow { color: #baff00; font-size: 48px; font-weight: 900; }
  .footer-banner { background: rgba(186, 255, 0, 0.1); border: 2px solid #baff00; border-radius: 20px; padding: 22px 32px; font-size: 24px; font-weight: 800; color: #ffffff; }
</style>
</head>
<body>
  <div class="container">
    <div class="badge">🛡️ Engineered for 99.9% Uptime</div>
    <h1>VEXARO AUTOMATED <span style="color:#baff00;">FAILOVER ENGINE</span></h1>
    <div class="flow">
      <div class="node node-bad">
        <div class="node-icon">❌</div>
        <div class="node-title" style="color:#ef4444;">Server 01 Down</div>
        <div class="node-desc">Supplier API Crash Detected in 500ms</div>
      </div>
      <div class="arrow">➔</div>
      <div class="node node-router">
        <div class="node-icon">⚡</div>
        <div class="node-title" style="color:#38bdf8;">Auto Reroute</div>
        <div class="node-desc">Instant Failover without customer pause</div>
      </div>
      <div class="arrow">➔</div>
      <div class="node node-good">
        <div class="node-icon">✅</div>
        <div class="node-title" style="color:#baff00;">Server 02 Active</div>
        <div class="node-desc">100% Order Fulfilled & Delivered</div>
      </div>
    </div>
    <div class="footer-banner">
      ⚡ Missing in 99% of Pakistani panels — Built at 3 AM by a 15yo student!
    </div>
  </div>
</body>
</html>`
  },
  {
    name: 'card_launch_stats.png',
    html: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: rgba(6, 12, 12, 0.96); display: flex; align-items: center; justify-content: center; }
  .container { width: 1320px; text-align: center; }
  .logo-header { margin-bottom: 16px; }
  .badge { display: inline-block; background: rgba(186, 255, 0, 0.15); border: 2px solid #baff00; color: #baff00; padding: 8px 28px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
  h1 { color: #ffffff; font-size: 54px; font-weight: 900; margin-bottom: 36px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 36px; }
  .card-stat { background: #0c1615; border: 2px solid rgba(186, 255, 0, 0.3); border-radius: 24px; padding: 32px 20px; box-shadow: 0 0 35px rgba(0,0,0,0.5); }
  .stat-val { font-size: 48px; font-weight: 900; color: #baff00; margin-bottom: 8px; }
  .stat-label { font-size: 18px; color: #cbd5e1; font-weight: 700; line-height: 1.3; }
  .footer-box { background: rgba(37, 211, 102, 0.12); border: 2px solid #25d366; border-radius: 20px; padding: 22px; color: #ffffff; font-size: 24px; font-weight: 800; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo-header">
      <img src="data:image/png;base64,${logoBase64}" style="width: 80px; height: 80px; border-radius: 50%; filter: drop-shadow(0 0 20px #baff00);" />
    </div>
    <div class="badge">🚀 Official Platform Launch</div>
    <h1>VEXAROSMM.COM IS LIVE IN <span style="color:#baff00;">PAKISTAN</span></h1>
    <div class="grid">
      <div class="card-stat">
        <div class="stat-val">500+</div>
        <div class="stat-label">Automated Services Available</div>
      </div>
      <div class="card-stat">
        <div class="stat-val">₨1.85</div>
        <div class="stat-label">Starting Rates per 1,000</div>
      </div>
      <div class="card-stat">
        <div class="stat-val">0%</div>
        <div class="stat-label">SadaPay / Easypaisa Fee</div>
      </div>
      <div class="card-stat">
        <div class="stat-val">24/7</div>
        <div class="stat-label">Live WhatsApp Human Support</div>
      </div>
    </div>
    <div class="footer-box">
      💬 Direct WhatsApp Support: +92 317 6437013 (Talha Bashir)
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
  .badge { display: inline-flex; align-items: center; gap: 10px; background: rgba(37, 211, 102, 0.15); border: 1px solid #25d366; color: #25d366; padding: 8px 24px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
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
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 28px; height: 28px; border-radius: 50%;" /> 🇵🇰 Built for Pakistan</div>
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
      💬 Direct WhatsApp Support: <span style="color: #baff00; font-weight: 900;">+92 317 6437013</span> (Talha Bashir)
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
  .card { width: 1280px; background: linear-gradient(135deg, #0e1916, #07100f); border: 2px solid rgba(186, 255, 0, 0.6); border-radius: 36px; padding: 48px; box-shadow: 0 0 80px rgba(186, 255, 0, 0.25); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 10px; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 8px 24px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
  h1 { color: #ffffff; font-size: 54px; font-weight: 900; line-height: 1.15; margin-bottom: 24px; }
  .highlight { color: #baff00; }
  .bonus-box { background: rgba(186, 255, 0, 0.12); border: 2px dashed #baff00; border-radius: 28px; padding: 32px; margin-bottom: 28px; }
  .code { color: #baff00; font-size: 52px; font-weight: 900; letter-spacing: 6px; font-family: monospace; }
  .cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .cta-item { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 20px; font-size: 22px; font-weight: 700; color: #ffffff; }
  .cta-highlight { color: #baff00; font-weight: 900; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 28px; height: 28px; border-radius: 50%;" /> 🎁 Viewer Exclusive</div>
    <h1>GET <span class="highlight">₨50 FREE BALANCE</span> ON VEXARO</h1>
    <div class="bonus-box">
      <p style="color: #cbd5e1; font-size: 20px; margin-bottom: 12px; font-weight: 600;">Message "START50" on WhatsApp to Claim:</p>
      <div class="code">CODE: START50</div>
    </div>
    <div class="cta-grid">
      <div class="cta-item">
        📱 WhatsApp: <span class="cta-highlight">+92 317 6437013</span>
      </div>
      <div class="cta-item">
        🌐 Website: <span class="cta-highlight">vexarosmm.com</span>
      </div>
    </div>
    <div style="margin-top: 20px; color: #38bdf8; font-size: 20px; font-weight: 800;">
      🇬🇧 Special: UK TikTok Monetization Accounts for only ₨250!
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
  .card { width: 1240px; background: linear-gradient(135deg, #0e1916, #07100f); border: 2px solid rgba(186, 255, 0, 0.6); border-radius: 36px; padding: 48px; box-shadow: 0 0 80px rgba(186, 255, 0, 0.25); text-align: center; }
  .badge { display: inline-flex; align-items: center; gap: 10px; background: rgba(186, 255, 0, 0.15); border: 1px solid #baff00; color: #baff00; padding: 8px 24px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
  h1 { color: #ffffff; font-size: 60px; font-weight: 900; letter-spacing: 2px; margin-bottom: 12px; }
  .subtitle { color: #94a3b8; font-size: 24px; margin-bottom: 36px; font-weight: 500; }
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .stat-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(186, 255, 0, 0.3); border-radius: 24px; padding: 28px 20px; }
  .stat-num { color: #baff00; font-size: 52px; font-weight: 900; margin-bottom: 8px; }
  .stat-label { color: #cbd5e1; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 28px; height: 28px; border-radius: 50%;" /> 🚀 Teen Founder Story</div>
    <h1>TALHA BASHIR</h1>
    <div class="subtitle">Building Pakistan's #1 Automated Wholesale SMM Platform at Age 15</div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-num">₨0</div>
        <div class="stat-label">Initial Startup Capital</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">100%</div>
        <div class="stat-label">Automated Next.js Engine</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">99.98%</div>
        <div class="stat-label">Tier-1 API Server Uptime</div>
      </div>
    </div>
  </div>
</body>
</html>`
  }
];

console.log('Re-rendering all graphic cards with official logo...');
cards.forEach(c => {
  const tmpHtml = path.join(__dirname, `_tmp_${c.name}.html`);
  const outPng = path.join(cardsDir, c.name);
  fs.writeFileSync(tmpHtml, c.html, 'utf8');

  console.log(`Rendering ${c.name} via Edge...`);
  execFileSync(edgePath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1920,1080',
    `--screenshot=${outPng}`,
    tmpHtml
  ]);

  if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  console.log(`✓ Created: ${outPng}`);
});

console.log('All graphic cards updated with official logo successfully!');
