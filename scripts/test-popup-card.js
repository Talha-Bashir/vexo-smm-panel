const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const logoPath = path.join(__dirname, '..', 'public', 'vexaro_logo.png');
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 880px; height: 520px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card {
    width: 840px;
    background: linear-gradient(135deg, rgba(14, 25, 22, 0.94), rgba(7, 16, 15, 0.96));
    border: 2px solid rgba(186, 255, 0, 0.8);
    border-radius: 28px;
    padding: 32px 28px;
    box-shadow: 0 0 50px rgba(186, 255, 0, 0.35);
    text-align: center;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(186, 255, 0, 0.15);
    border: 1px solid #baff00;
    color: #baff00;
    padding: 6px 20px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  h1 { color: #ffffff; font-size: 38px; font-weight: 900; letter-spacing: 1px; margin-bottom: 8px; }
  .subtitle { color: #94a3b8; font-size: 17px; margin-bottom: 24px; font-weight: 500; }
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .stat-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(186, 255, 0, 0.3); border-radius: 18px; padding: 18px 12px; }
  .stat-num { color: #baff00; font-size: 36px; font-weight: 900; margin-bottom: 6px; }
  .stat-label { color: #cbd5e1; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><img src="data:image/png;base64,${logoBase64}" style="width: 22px; height: 22px; border-radius: 50%;" /> 🚀 Teen Founder Story</div>
    <h1>TALHA BASHIR</h1>
    <div class="subtitle">Building Pakistan's #1 Automated Wholesale SMM Platform at Age 15</div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-num">₨0</div>
        <div class="stat-label">Initial Capital</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">100%</div>
        <div class="stat-label">Next.js Engine</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">99.98%</div>
        <div class="stat-label">Server Uptime</div>
      </div>
    </div>
  </div>
</body>
</html>`;

const tmpHtml = path.join(__dirname, '_tmp_popup_card.html');
const outPng = path.join(__dirname, '..', 'public', 'video_cards', 'popup_founder.png');
fs.writeFileSync(tmpHtml, html, 'utf8');

execFileSync(edgePath, [
  '--headless',
  '--disable-gpu',
  '--default-background-color=00000000',
  '--window-size=880,520',
  `--screenshot=${outPng}`,
  tmpHtml
]);

if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
console.log('✓ Created transparent popup card at:', outPng);
