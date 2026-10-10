const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const logoPath = path.join(__dirname, '..', 'public', 'vexaro_logo.png');
const outPng = path.join(__dirname, '..', 'public', 'watermark_logo.png');

// Encode logo as base64 so HTML can embed it directly
const logoBase64 = fs.readFileSync(logoPath).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body { width: 1920px; height: 1080px; background: transparent; overflow: hidden; }
  .watermark {
    position: absolute;
    top: 36px;
    right: 50px;
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(7, 14, 13, 0.85);
    border: 2px solid rgba(186, 255, 0, 0.6);
    padding: 10px 22px 10px 14px;
    border-radius: 999px;
    box-shadow: 0 0 25px rgba(186, 255, 0, 0.35);
  }
  .logo-img {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    filter: drop-shadow(0 0 10px #baff00);
  }
  .brand-text {
    display: flex;
    flex-direction: column;
  }
  .brand-name {
    color: #ffffff;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 2px;
    line-height: 1.1;
  }
  .brand-sub {
    color: #baff00;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="watermark">
    <img src="data:image/png;base64,${logoBase64}" class="logo-img" />
    <div class="brand-text">
      <span class="brand-name">VEXARO SMM</span>
      <span class="brand-sub">vexarosmm.com</span>
    </div>
  </div>
</body>
</html>`;

const tmpHtml = path.join(__dirname, '_tmp_watermark.html');
fs.writeFileSync(tmpHtml, html, 'utf8');

execFileSync(edgePath, [
  '--headless',
  '--disable-gpu',
  '--default-background-color=00000000',
  '--window-size=1920,1080',
  `--screenshot=${outPng}`,
  tmpHtml
]);

if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
console.log('✓ Created watermark overlay at:', outPng);
