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

  const noRefillOrDrop = data.filter(s => {
    const text = `${s.name} ${s.category} ${s.desc || ''}`.toLowerCase();
    return text.includes('no refill') || text.includes('no-refill') || text.includes('no–refill') || 
           text.includes('without refill') || text.includes('no guarantee') || text.includes('non-guaranteed') ||
           text.includes('drop') || text.includes('dropable') || text.includes('drop able');
  });

  console.log(`Total services with no-refill / drop indicators: ${noRefillOrDrop.length}`);
  
  function detectGuarantee(name, category, refillFlag) {
    const text = `${name} ${category}`.toLowerCase();
    const noRefillPattern = /no refill|no-refill|drop 100%|drop: 100%|no guarantee|non-guaranteed|without refill|no drop 0%|drop high/i;
    if (noRefillPattern.test(text)) return false;

    const guaranteePattern = /refill|guarantee|guaranteed|non-drop|non drop|r30|r60|r90|r365|lifetime|permanent/i;
    return Boolean(refillFlag || guaranteePattern.test(text));
  }
  let falselyGuaranteed = 0;
  for (const s of noRefillOrDrop) {
    const isG = detectGuarantee(s.name, s.category);
    const text = `${s.name} ${s.category}`.toLowerCase();
    const isDrop = /drop\s*100%|drop–100%|100%\s*drop|drop\s*able|dropable|high\s*drop|no\s*refill|no-refill|no–refill|without\s*refill|no\s*guarantee|non-guaranteed|refill:\s*no/i.test(text);
    if (isDrop && isG) {
      falselyGuaranteed++;
      console.log(`❌ FALSE GUARANTEE [ID: ${s.service}]: "${s.name}" (provider refill: ${s.refill})`);
    }
  }
  console.log(`\nTotal falsely marked as guaranteed: ${falselyGuaranteed}`);
}

run();
