/**
 * generate-animated-captions.js
 * - Shifts subtitles 0.35s EARLIER than speech start (fixes perceived delay)
 * - Adds YouTube Shorts-style pop/bounce/fade animations via ASS tags
 * - Adds karaoke word-highlight effect for key terms
 * - Adds slide-in motion from bottom for variety
 * - Adds "impact" captions with scale-up effect for big moments
 */

const fs = require('fs');
const path = require('path');
const OUT = path.resolve('public/subtitles_master.ass');

// ─── EARLY OFFSET — captions appear this many seconds BEFORE the detected speech ─
const EARLY_OFFSET = 0.32;   // appear 320ms before speech hits the ear
const AUDIO_LAG    = 0.0;    // set > 0 if audio itself has a delayed start in the mux

// ─── Silence boundaries from FFmpeg silencedetect -30dB:0.3s ─────────────────
const SILENCE_BOUNDARIES = [
  [2.68037,  2.9971 ],
  [8.94229,  9.44725],
  [16.109,   16.4661],
  [29.2075,  29.6054],
  [33.784,   34.5609],
  [37.7573,  38.2059],
  [41.4838,  41.8573],
  [44.1678,  44.5812],
  [50.427,   50.7559],
  [61.3453,  61.7882],
  [62.84,    63.1504],
  [65.7368,  66.126 ],
  [70.8939,  71.5914],
  [76.1741,  76.529 ],
  [78.6515,  79.0702],
  [85.0469,  85.4939],
  [91.7855,  92.2429],
  [109.851,  110.297],
  [110.864,  111.225],
  [121.429,  121.766],
  [122.486,  122.861],
  [123.476,  123.797],
  [128.887,  129.243],
  [131.139,  131.499],
  [134.824,  135.242],
  [141.707,  142.247],
  [144.614,  144.985],
  [147.149,  147.455],
  [152.255,  152.776],
  [156.43,   156.789],
  [166.292,  166.619],
  [171.734,  172.121],
  [181.359,  181.671],
  [186.439,  186.76 ],
  [195.525,  196.418],
  [202.151,  202.473],
  [205.594,  206.038],
  [207.562,  207.944],
  [220.042,  220.415],
  [221.841,  222.164],
  [226.027,  226.388],
  [228.008,  228.405],
  [231.153,  231.708],
  [236.333,  236.642],
  [242.476,  242.812],
  [245.925,  246.277],
  [247.088,  247.394],
  [248.862,  249.181],
  [251.491,  251.97 ],
  [258.357,  258.684],
];

// ─── Caption data: [text, type] ───────────────────────────────────────────────
// Types: 'normal' | 'impact' | 'slide' | 'pop' | 'kara'
const CAPTIONS = [
  // Ch01 — THE 15-YEAR-OLD DECISION
  ["Jab main {\\c&HBAFF00&}15 saal{\\c&HFFFFFF&} ka tha...",               'slide'],
  ["...mere paas {\\c&H00F0FF&}do raaste{\\c&HFFFFFF&} the.",              'normal'],
  ["Pehla: school, homework, {\\c&HFF3366&}PUBG aur TikTok.{\\c&HFFFFFF&}",'normal'],
  ["Dusra raasta jo log kehte hain...",                                     'normal'],
  ["{\\c&HBAFF00&}15 SAAL KA BACHCHA NAHI BANA SAKTA!{\\c&HFFFFFF&}",     'impact'],
  ["Maine {\\c&H00F0FF&}dusra raasta{\\c&HFFFFFF&} chuna.",                'pop'],
  ["Zero investment ke saath...",                                           'normal'],
  ["...ek {\\c&HBAFF00&}automated platform{\\c&HFFFFFF&} khada kar diya.", 'pop'],
  ["Jiska naam hai — {\\c&HBAFF00&}VEXARO SMM!{\\c&HFFFFFF&}",            'impact'],
  // Ch02 — 3AM CODING
  ["Jahan log {\\c&H00F0FF&}seconds{\\c&HFFFFFF&} mein grow karte hain.", 'slide'],
  ["Lekin yeh aasaan {\\c&HFF3366&}nahi{\\c&HFFFFFF&} tha.",              'pop'],
  ["Raat ke {\\c&HFF3366&}3 baje ki coding,{\\c&HFFFFFF&}",              'normal'],
  ["...failed orders, {\\c&HFF3366&}rejections...{\\c&HFFFFFF&}",        'normal'],
  ["...aur ghar walon ke {\\c&HFFCC00&}taane.{\\c&HFFFFFF&}",            'normal'],
  ["Sab kuch khol kar bata raha hoon.",                                    'slide'],
  // Ch03 — RESELLER ARBITRAGE
  ["Pehle samjhein — chakkar kya hai?",                                    'normal'],
  ["Instagram par log kehte hain:",                                         'normal'],
  ["{\\c&HFF3366&}1000 followers — sirf ₨2,000 mein!{\\c&HFFFFFF&}",     'impact'],
  ["Aam log sochte hain khud follow karta hoga.",                          'normal'],
  ["Nahi bhai — yeh hai {\\c&HBAFF00&}SMM Panel.{\\c&HFFFFFF&}",         'pop'],
  ["Ek {\\c&H00F0FF&}wholesale platform{\\c&HFFFFFF&} jahan...",          'normal'],
  ["...wahi {\\c&HFF3366&}1000 followers{\\c&HFFFFFF&} milte hain...",    'normal'],
  ["...sirf {\\c&HBAFF00&}₨60 MEIN!{\\c&HFFFFFF&}",                      'impact'],
  // Ch04 — ZERO CAPITAL HUSTLE
  ["₨60 mein khareedta, {\\c&HFF3366&}₨2000 mein bechta.{\\c&HFFFFFF&}", 'slide'],
  ["Yeh tha mera {\\c&HBAFF00&}zero-investment arbitrage.{\\c&HFFFFFF&}", 'pop'],
  ["Lekin supplier dhundna {\\c&HFF3366&}mushkil{\\c&HFFFFFF&} tha.",     'normal'],
  ["{\\c&HFF3366&}Scam panels,{\\c&HFFFFFF&} slow delivery...",           'normal'],
  ["...{\\c&HFFCC00&}Amma:{\\c&HFFFFFF&} beta yeh sab band karo!",        'pop'],
  ["Tab maine socha — {\\c&H00F0FF&}KHUD BANAO!{\\c&HFFFFFF&}",           'impact'],
  // Ch05 — PAKISTAN PAYMENTS
  ["Pakistan mein masla tha: {\\c&HFF3366&}payments.{\\c&HFFFFFF&}",      'slide'],
  ["Foreign panels accept nahi karte {\\c&HBAFF00&}JazzCash, Easypaisa.{\\c&HFFFFFF&}", 'normal'],
  ["Maine integrate kiya:",                                                 'normal'],
  ["{\\c&HBAFF00&}JazzCash ✓ Easypaisa ✓ SadaPay ✓ Binance ✓{\\c&HFFFFFF&}", 'impact'],
  ["Ab Pakistan ke {\\c&H00F0FF&}52,000+ clients{\\c&HFFFFFF&} use karte hain!", 'pop'],
  // Ch06 — CRISIS & FAILOVER
  ["Ek raat {\\c&HFF3366&}2:30 AM — supplier crash!{\\c&HFFFFFF&}",       'impact'],
  ["{\\c&HFFCC00&}Amma ka WhatsApp:{\\c&HFFFFFF&} beta so jao...",        'pop'],
  ["{\\c&HFF3366&}1.8 MILLION orders{\\c&HFFFFFF&} ka bojh tha.",         'impact'],
  ["Maine banaya {\\c&H00F0FF&}Auto-Backup Failover System.{\\c&HFFFFFF&}",'slide'],
  ["Agar ek supplier fail ho...",                                           'normal'],
  ["...{\\c&HBAFF00&}backup automatically ON!{\\c&HFFFFFF&}",             'pop'],
  ["{\\c&H00F0FF&}99.9% uptime{\\c&HFFFFFF&} guarantee.",                 'pop'],
  // Ch07 — LAUNCH & BONUS
  ["Aur phir launch hua —",                                                'slide'],
  ["{\\c&HBAFF00&}VEXARO SMM PANEL!{\\c&HFFFFFF&}",                       'impact'],
  ["{\\c&H00F0FF&}1000+ services.{\\c&HFFFFFF&} Instant delivery.",        'pop'],
  ["Abhi visit karo: {\\c&HBAFF00&}vexarosmm.com{\\c&HFFFFFF&}",          'impact'],
  ["Sign up karo — {\\c&H00F0FF&}FREE hai!{\\c&HFFFFFF&}",                'pop'],
  ["Aur ek {\\c&HFFCC00&}BONUS{\\c&HFFFFFF&} bhi hai...",                 'normal'],
  ["{\\c&HBAFF00&}5% lifetime referral commission!{\\c&HFFFFFF&}",        'impact'],
  ["Har order par. Automatically. {\\c&H00F0FF&}Hamesha.{\\c&HFFFFFF&}",  'slide'],
];

// ─── ASS Animation tags per type ─────────────────────────────────────────────
function getAnim(type) {
  switch (type) {
    case 'impact':
      // Scale up from 60% → 100%, fade in fast, bold flash
      return '{\\fad(60,80)\\fscx60\\fscy60\\t(0,180,\\fscx100\\fscy100)\\blur2\\t(0,180,\\blur0)}';
    case 'pop':
      // Bounce: overshoot to 115% then settle at 100%
      return '{\\fad(50,70)\\fscx80\\fscy80\\t(0,140,\\fscx115\\fscy115)\\t(140,220,\\fscx100\\fscy100)}';
    case 'slide':
      // Slide up from 30px below + fade in
      return '{\\fad(100,80)\\move(960,1010,960,980,0,200)}';
    case 'normal':
    default:
      // Simple clean fade
      return '{\\fad(80,60)}';
  }
}

// ─── Build speech segments ────────────────────────────────────────────────────
function buildSpeechSegs() {
  const segs = [];
  let cursor = 0.0;
  for (const [sStart, sEnd] of SILENCE_BOUNDARIES) {
    if (sStart > cursor + 0.05) segs.push([cursor, sStart]);
    cursor = sEnd;
  }
  segs.push([cursor, 260.89]);
  return segs;
}

// ─── ASS time ─────────────────────────────────────────────────────────────────
function toASS(sec) {
  if (sec < 0) sec = 0;
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  let cs   = Math.round((sec - Math.floor(sec)) * 100);
  if (cs >= 100) cs = 99;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

// ─── Build events ─────────────────────────────────────────────────────────────
function buildEvents() {
  const speechSegs = buildSpeechSegs();
  console.log(`Speech segs: ${speechSegs.length} | Captions: ${CAPTIONS.length}`);

  const total = CAPTIONS.length;
  const segPerCap = speechSegs.length / total;
  const events = [];

  for (let i = 0; i < total; i++) {
    const segIdx  = Math.floor(i * segPerCap);
    const segIdxE = Math.floor((i + 1) * segPerCap) - 1;
    const seg  = speechSegs[Math.min(segIdx,  speechSegs.length - 1)];
    const segE = speechSegs[Math.min(segIdxE, speechSegs.length - 1)];

    // Apply early offset — captions fire BEFORE speech
    let start = Math.max(0, seg[0]  - EARLY_OFFSET + AUDIO_LAG);
    let end   = segE[1] + AUDIO_LAG;

    // Enforce min/max duration
    if (end - start < 1.4) end = start + 1.4;
    if (end - start > 5.5) end = start + 5.5;

    // No overlap with next caption
    if (i < total - 1) {
      const nIdx = Math.floor((i + 1) * segPerCap);
      const nSeg = speechSegs[Math.min(nIdx, speechSegs.length - 1)];
      const nStart = Math.max(0, nSeg[0] - EARLY_OFFSET);
      if (end > nStart - 0.04) end = nStart - 0.04;
    }

    const [text, type] = CAPTIONS[i];
    const anim = getAnim(type);
    // For slide type, keep the \pos/\move relative to screen center
    const fullText = type === 'slide'
      ? `{\\an2\\pos(960,980)${anim.slice(1)}${text}`  // bottom-center anchor
      : `${anim}${text}`;

    events.push({ start, end, text: fullText, type });
    console.log(`  [${String(i+1).padStart(2)}] ${toASS(start)} → ${toASS(end)} [${type}]`);
  }

  return events;
}

// ─── Chapter HUD ──────────────────────────────────────────────────────────────
const CHAPTERS = [
  ['0:00:00.00','0:00:34.00','📌 CH01: THE 15-YEAR-OLD DECISION'],
  ['0:00:34.00','0:00:50.00','📌 CH02: 3:00 AM CODING'],
  ['0:00:50.00','0:01:40.00','📌 CH03: THE ₨2,000 ARBITRAGE'],
  ['0:01:40.00','0:02:22.00','📌 CH04: ZERO-CAPITAL HUSTLE'],
  ['0:02:22.00','0:02:59.00','📌 CH05: PAKISTAN PAYMENTS'],
  ['0:02:59.00','0:03:40.00','📌 CH06: 2:30 AM CRISIS'],
  ['0:03:40.00','0:04:20.89','📌 CH07: LAUNCH & BONUS'],
];

// ─── Build ASS ────────────────────────────────────────────────────────────────
function buildASS(events) {
  return `[Script Info]
Title: Vexaro SMM — Animated Captions v4
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,42,&H00FFFFFF,&H0000FFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,0.8,0,1,4.5,2.5,2,60,60,85,1
Style: Impact,Arial Black,52,&H00FFFFFF,&H0000FFFF,&H00000000,&HA8000000,-1,0,0,0,100,100,1,0,1,5.5,3,2,40,40,80,1
Style: Chapter,Arial,20,&H0000FFFF,&H0000FFFF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,1,2.5,1.5,7,60,60,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${CHAPTERS.map(([s,e,t]) =>
  `Dialogue: 1,${s},${e},Chapter,,0,0,0,,{\\c&HBAFF00&\\fad(200,200)}${t}{\\c&HFFFFFF&}`
).join('\n')}
${events.map(ev => {
  const style = ev.type === 'impact' ? 'Impact' : 'Default';
  return `Dialogue: 0,${toASS(ev.start)},${toASS(ev.end)},${style},,0,0,0,,${ev.text}`;
}).join('\n')}
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('\n🎬 Generating ANIMATED captions (early-offset + effects)...\n');
const events = buildEvents();
const ass = buildASS(events);
fs.writeFileSync(OUT, ass, 'utf8');
console.log(`\n✅ Written ${events.length} animated captions → ${OUT}`);
console.log(`   Early offset: -${EARLY_OFFSET}s per caption`);
console.log(`   Animation types: impact(scale-burst), pop(bounce), slide(move-up), normal(fade)`);
