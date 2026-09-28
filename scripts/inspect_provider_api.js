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

async function test() {
  const url = process.env.RIZVI_API_URL || "https://rizvismmpanels.com/api/v2";
  const key = process.env.RIZVI_API_KEY || process.env.PROVIDER_5_KEY || "";
  const body = new URLSearchParams({ key, action: 'services' });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const data = await res.json();
  console.log('Response type:', typeof data, 'IsArray:', Array.isArray(data));
  console.log('Sample data keys/content:', Array.isArray(data) ? data.slice(0, 2) : data);
  if (!Array.isArray(data)) return;
  // Find a service that has desc or description or drop in name
  const sampleWithDesc = data.find(s => s.desc || s.description);
  console.log('Sample with desc:', sampleWithDesc ? Object.keys(sampleWithDesc) : 'none');
  if (sampleWithDesc) {
    console.log('desc field:', sampleWithDesc.desc || sampleWithDesc.description);
  }
  // Find a service with drop in name
  const dropSample = data.find(s => /drop/i.test(s.name));
  console.log('Drop sample:', dropSample);
}

test();
