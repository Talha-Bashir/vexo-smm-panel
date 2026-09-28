const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function run() {
  const url = process.env.RIZVI_API_URL || "https://rizvismmpanels.com/api/v2";
  const key = process.env.RIZVI_API_KEY || process.env.PROVIDER_5_KEY || "";
  const body = new URLSearchParams({ key, action: 'services' });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json();
  
  console.log('Searching', data.length, 'services from provider...');
  const dropServices = data.filter(s => {
    const text = `${s.name} ${s.category} ${s.desc || ''}`.toLowerCase();
    return text.includes('drop able') || text.includes('dropable') || text.includes('100% drop') || text.includes('drop 100%') || text.includes('drop: 100%') || text.includes('drop - 100%') || text.includes('drop–100%');
  });

  console.log(`Found ${dropServices.length} drop-able services:`);
  for (const s of dropServices.slice(0, 15)) {
    console.log(`\nID: ${s.service} | Name: ${s.name} | Refill: ${s.refill}`);
    console.log(`Desc: ${s.desc ? s.desc.replace(/\r?\n/g, ' ') : 'NO DESC'}`);
  }
}

run();
