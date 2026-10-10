/**
 * convert-srt-to-ass.js
 * Converts VEXARO_Hinglish.srt → public/subtitles_master.ass
 * Uses EXACT SRT timecodes so subtitles match the voiceover perfectly.
 */

const fs = require('fs');
const path = require('path');

const SRT_PATH = path.resolve(
  'C:/Users/HASSAN GAMERZ/Downloads/Assests of video editing/i built smm in 15 yeats if age/VEXARO_Hinglish.srt'
);
const OUT_PATH = path.resolve('public/subtitles_master.ass');

// ─── Keyword colour map ───────────────────────────────────────────────────────
// ASS colour format: &HBBGGRR& (blue-green-red, reversed)
const KEYWORDS = [
  // Brand / names  → lime green  #BAFF00 → &H00FFBA&
  { re: /\b(VEXARO SMM|vexarosmm\.com|Vexaro)\b/g,       colour: '&H00FFBA&' },
  // Numbers / money → pink-red  #FF3366 → &H6633FF&
  { re: /\b(₨[\d,]+|[\d,]+ rupay?s?|15 saal|2000|60|100|500)\b/gi, colour: '&H6633FF&' },
  // Key concepts    → cyan      #00F0FF → &HFFF000& ... wait, #00F0FF = R00 G F0 B FF → &HFFF000&? 
  // Actually ASS is &HAABBGGRR& — let's do it properly:
  // #00F0FF => R=00, G=F0, B=FF => &H00FFF000& no...
  // ASS primary: &HAABBGGRR& where AA=alpha(00=opaque), BB=blue, GG=green, RR=red
  // #00F0FF => hex RGB: R=0x00, G=0xF0, B=0xFF => ASS &H00FFF000& NO
  // correct: &H00 + BB + GG + RR = &H00 + FF + F0 + 00 = &H00FFF000& - still wrong
  // Simple: ASS stores BGR: blue=0xFF, green=0xF0, red=0x00 → &H00FFF000 
  // Let me just use the values that worked before:
  // In previous file: \c&H00F0FF& was used directly (it's treated as BGR by libass)
  // Actually libass uses &HAABBGGRR where the tag \c&HRRGGBB& is common misconception
  // The WORKING values from previous renders:
  // lime:  \c&HBAFF00&   cyan: \c&H00F0FF&   pink: \c&HFF3366&   yellow: \c&HFFCC00&
  // These worked in the rendered video so keep them as-is.
  { re: /\b(Auto-Backup|Failover|automated|zero investment|platform)\b/gi, colour: '&H00F0FF&' },
  // Mom dialogue — we'll handle inline per-line below
];

// Specific phrase overrides (exact match, case-insensitive)
const PHRASE_COLOURS = [
  { re: /\b(VEXARO SMM|vexarosmm\.com)\b/g,               colour: '&HBAFF00&' },
  { re: /\b(15 saal|junoon|Auto-Backup|Failover|automated)\b/gi, colour: '&H00F0FF&' },
  { re: /\b(₨[\d,]+|[\d,]+ rupay?|2000 rupay?|60 rupay?)\b/gi,  colour: '&HFF3366&' },
  { re: /\b(15 saal ka bachcha|15-year-old)\b/gi,           colour: '&HBAFF00&' },
  { re: /\b(Amma|ammi|mom|ghar wale)\b/gi,                  colour: '&HFFCC00&' },
  { re: /\b(PUBG|TikTok|Instagram|YouTube)\b/g,             colour: '&H00F0FF&' },
  { re: /\b(SMM panel|social media|followers|likes|views)\b/gi, colour: '&HBAFF00&' },
  { re: /\b(raat ke [23] baje|3 baje|2:30 AM|3:00 AM)\b/gi, colour: '&HFF3366&' },
];

// ─── SRT time → ASS time ──────────────────────────────────────────────────────
// SRT:  00:01:23,456  → ASS: 0:01:23.46  (H:MM:SS.cs, centiseconds = ms/10 rounded)
function srtTimeToAss(srtTime) {
  // srtTime: "HH:MM:SS,mmm"
  const [hms, ms] = srtTime.trim().split(',');
  const [h, m, s] = hms.split(':').map(Number);
  const cs = Math.round(parseInt(ms, 10) / 10); // centiseconds
  const csStr = String(cs).padStart(2, '0');
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${csStr}`;
}

// ─── Apply keyword colouring ──────────────────────────────────────────────────
function colourText(text) {
  // We apply each phrase rule; to avoid double-tagging we use a placeholder approach
  // Simple sequential replacement — last rule wins on overlaps (acceptable)
  let result = text;
  for (const { re, colour } of PHRASE_COLOURS) {
    result = result.replace(re, (match) => `{\\c${colour}}${match}{\\c&HFFFFFF&}`);
  }
  return result;
}

// ─── Parse SRT ────────────────────────────────────────────────────────────────
function parseSRT(content) {
  const blocks = [];
  // Normalise line endings
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    // Skip empty lines
    if (!lines[i].trim()) { i++; continue; }
    // Block index (number)
    const idx = parseInt(lines[i].trim(), 10);
    if (isNaN(idx)) { i++; continue; }
    i++;
    if (i >= lines.length) break;
    // Timecode line
    const timeLine = lines[i].trim();
    i++;
    const timeMatch = timeLine.match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;
    const start = srtTimeToAss(timeMatch[1]);
    const end   = srtTimeToAss(timeMatch[2]);
    // Text lines (until empty line)
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i].trim());
      i++;
    }
    const rawText = textLines.join(' ');
    blocks.push({ idx, start, end, text: rawText });
  }
  return blocks;
}

// ─── Build ASS file ───────────────────────────────────────────────────────────
function buildASS(blocks) {
  const header = `[Script Info]
Title: Vexaro SMM — Exact Voiceover Sync
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,38,&H00FFFFFF,&H0000FFFF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,1,3.8,2,2,40,40,80,1
Style: Chapter,Arial,22,&H0000FFFF,&H0000FFFF,&H00000000,&HB0000000,-1,0,0,0,100,100,0,0,1,2.5,1.5,7,60,60,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  // Chapter HUD lines (Layer 1, top-right)
  const chapters = [
    ['0:00:00.00','0:00:34.00','📌 CHAPTER 01: THE 15-YEAR-OLD DECISION'],
    ['0:00:34.00','0:00:50.00','📌 CHAPTER 02: 3:00 AM CODING & FAILED ORDERS'],
    ['0:00:50.00','0:01:40.00','📌 CHAPTER 03: THE ₨2,000 RESELLER ARBITRAGE'],
    ['0:01:40.00','0:02:22.00','📌 CHAPTER 04: THE ZERO-CAPITAL HUSTLE'],
    ['0:02:22.00','0:02:59.00','📌 CHAPTER 05: SOLVING PAKISTAN PAYMENTS'],
    ['0:02:59.00','0:03:40.00','📌 CHAPTER 06: 2:30 AM CRISIS & AUTO-FAILOVER'],
    ['0:03:40.00','0:04:20.89','📌 CHAPTER 07: VEXAROSMM.COM LAUNCH & BONUS'],
  ];

  const chapterLines = chapters.map(([s, e, t]) =>
    `Dialogue: 1,${s},${e},Chapter,,0,0,0,,{\\c&HBAFF00&}${t}{\\c&HFFFFFF&}`
  );

  // Subtitle dialogue lines (Layer 0)
  const subLines = blocks.map(b => {
    const coloured = colourText(b.text);
    return `Dialogue: 0,${b.start},${b.end},Default,,0,0,0,,${coloured}`;
  });

  return [header, ...chapterLines, ...subLines].join('\n') + '\n';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log('Reading SRT:', SRT_PATH);
const srtRaw = fs.readFileSync(SRT_PATH, 'utf8');
console.log(`SRT file size: ${srtRaw.length} bytes`);

const blocks = parseSRT(srtRaw);
console.log(`Parsed ${blocks.length} subtitle blocks`);
if (blocks.length > 0) {
  console.log(`  First: [${blocks[0].start} → ${blocks[0].end}] "${blocks[0].text.slice(0,50)}"`);
  console.log(`  Last:  [${blocks[blocks.length-1].start} → ${blocks[blocks.length-1].end}]`);
}

const assContent = buildASS(blocks);
fs.writeFileSync(OUT_PATH, assContent, 'utf8');
console.log(`\n✅ Written: ${OUT_PATH}`);
console.log(`   Blocks: ${blocks.length} subtitle lines + 7 chapter HUD lines`);
console.log('\nNow delete intermediate files and re-run the render.');
