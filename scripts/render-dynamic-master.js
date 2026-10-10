const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

console.log('======================================================');
console.log('🚀 VEXARO SMM HIGH-RETENTION ENGINE 3.0 (LOGO + SYNC)');
console.log('======================================================');
console.log('Using FFmpeg at:', ffmpegPath);

const baseDir = 'C:\\Users\\HASSAN GAMERZ\\Downloads\\Assests of video editing';
const voiceoverPath = path.join(baseDir, 'i built smm in 15 yeats if age', 'I Built a SMM Panel At 15.m4a');
const musicPath = path.join(baseDir, 'Music', 'Alias - Anno Domini Beats.mp3');
const sfxDir = path.join(baseDir, 'Sound effects');
const brollDir = path.join(baseDir, 'Assests');
const cardsDir = path.join(__dirname, '..', 'public', 'video_cards');
const avatarVideo = path.join(__dirname, '..', 'public', 'avatar', 'full_avatar_talking_1080p.mp4');
const watermarkPng = path.join(__dirname, '..', 'public', 'watermark_logo.png');
const subtitleAss = path.join(__dirname, '..', 'public', 'subtitles_master.ass');

const tempDir = path.join(__dirname, '..', 'public', 'render_temp_v3');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const finalDesktop = 'C:\\Users\\HASSAN GAMERZ\\Desktop\\I_Built_SMM_Panel_At_15_Master_1080p.mp4';
const finalDownloads = 'C:\\Users\\HASSAN GAMERZ\\Downloads\\I_Built_SMM_Panel_At_15_Master_1080p.mp4';

// 35 Scenes Timeline (Exact Total: 260.89 seconds)
const scenes = [
  { id: 1, type: 'avatar', duration: 2.80, label: '01 Avatar Intro' },
  { id: 2, type: 'broll', file: '12040-236265335.mp4', duration: 6.14, label: '02 Student Homework Cutscene' },
  { id: 3, type: 'broll_phone', file: '11267667-hd_1080_1920_30fps.mp4', duration: 7.17, label: '03 TikTok Scroll Phone Mockup' },
  { id: 4, type: 'avatar_zoom', duration: 9.82, label: '04 Punch-In The 15yo Path' },
  { id: 5, type: 'avatar_popup', popup: 'popup_choice.png', duration: 3.27, label: '05 Avatar + Choice Popup' },
  { id: 6, type: 'avatar_popup', popup: 'popup_founder.png', duration: 4.57, label: '06 Avatar + Founder Popup' },
  { id: 7, type: 'avatar', duration: 3.99, label: '07 Wide Avatar Growth' },
  { id: 8, type: 'avatar_zoom', duration: 3.72, label: '08 Punch-In Hard Truth' },
  { id: 9, type: 'broll', file: '12903134_1920_1080_25fps.mp4', duration: 7.47, label: '09 3 AM Alarm Clock Cutscene' },
  { id: 10, type: 'broll', file: '13522186-uhd_3840_2160_25fps.mp4', duration: 6.15, label: '10 Night Coding Cutscene' },
  { id: 11, type: 'avatar_zoom', duration: 6.24, label: '11 Punch-In Arbitrage Intro' },
  { id: 12, type: 'broll', file: '1085656-uhd_3840_2160_25fps.mp4', duration: 9.55, label: '12 Server Fibers Cutscene' },
  { id: 13, type: 'avatar', duration: 7.75, label: '13 Wide Avatar Provider World' },
  { id: 14, type: 'avatar_popup', popup: 'popup_arbitrage.png', duration: 6.10, label: '14 Avatar + Arbitrage Math Popup' },
  { id: 15, type: 'broll', file: '6266288-uhd_3840_2160_25fps.mp4', duration: 6.53, label: '15 Cash Counter Machine Cutscene' },
  { id: 16, type: 'avatar_zoom', duration: 8.32, label: '16 Punch-In Build My Own' },
  { id: 17, type: 'avatar', duration: 9.72, label: '17 Wide Avatar No Lakhs Capital' },
  { id: 18, type: 'broll', file: '13522186-uhd_3840_2160_25fps.mp4', duration: 4.36, label: '18 Old Laptop & YouTube Cutscene' },
  { id: 19, type: 'broll', file: '12040-236265335.mp4', duration: 7.17, label: '19 Physics Maths & 4 AM Cutscene' },
  { id: 20, type: 'card', file: 'card_struggle_mom.png', duration: 7.34, label: '20 Mom 3 AM Quote Card' },
  { id: 21, type: 'avatar_zoom', duration: 5.93, label: '21 Punch-In Junoon Passion' },
  { id: 22, type: 'avatar', duration: 6.89, label: '22 Wide Avatar Cyber Decision' },
  { id: 23, type: 'broll', file: '1085656-uhd_3840_2160_25fps.mp4', duration: 10.54, label: '23 Dark Cyber Servers Cutscene' },
  { id: 24, type: 'broll', file: '7033779-uhd_3840_2160_25fps.mp4', duration: 8.72, label: '24 Pakistan Payments Dilemma Cutscene' },
  { id: 25, type: 'avatar_popup', popup: 'popup_payments.png', duration: 10.58, label: '25 Avatar + 0% Payments Popup' },
  { id: 26, type: 'avatar_zoom', duration: 7.60, label: '26 Punch-In Classroom Phone Vibration' },
  { id: 27, type: 'avatar', duration: 11.39, label: '27 Wide Avatar Auto Deposit Breakthrough' },
  { id: 28, type: 'avatar_zoom', duration: 5.26, label: '28 Punch-In 2:30 AM Disaster Swell' },
  { id: 29, type: 'avatar_popup', popup: 'popup_panic.png', duration: 11.55, label: '29 Avatar + WhatsApp Police Threat Popup' },
  { id: 30, type: 'avatar_zoom', duration: 8.04, label: '30 Punch-In Apology & Cold Sweat' },
  { id: 31, type: 'avatar_popup', popup: 'popup_failover.png', duration: 7.98, label: '31 Avatar + Failover System Popup' },
  { id: 32, type: 'broll', file: '1085656-uhd_3840_2160_25fps.mp4', duration: 4.46, label: '32 Server Cables Flawless Delivery' },
  { id: 33, type: 'card', file: 'card_launch_stats.png', duration: 10.00, label: '33 VexaroSMM.com 500+ Services Launch Card' },
  { id: 34, type: 'avatar_zoom', duration: 8.83, label: '34 Punch-In Execution Over Age Speech' },
  { id: 35, type: 'avatar_popup', popup: 'popup_bonus.png', duration: 14.94, label: '35 Avatar + ₨50 Free Balance Bonus Popup' },
];

const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
console.log(`Total scenes: ${scenes.length} | Total runtime: ${totalDuration.toFixed(2)}s (Target: 260.89s)`);

// ----------------------------------------------------
// STEP 1: Render All Scene Video Clips
// ----------------------------------------------------
console.log('\n--- STEP 1: RENDERING SCENE CLIPS ---');
const clipFiles = [];

scenes.forEach((s, idx) => {
  const clipOut = path.join(tempDir, `scene_${String(idx + 1).padStart(2, '0')}.mp4`);
  clipFiles.push(clipOut);

  if (fs.existsSync(clipOut)) {
    console.log(`[Scene ${idx + 1}/${scenes.length}] Already rendered: ${path.basename(clipOut)}`);
    return;
  }

  console.log(`[Scene ${idx + 1}/${scenes.length}] Rendering ${s.label} (${s.duration}s)...`);

  let args = [];
  if (s.type === 'avatar') {
    // Wide full avatar talking
    args = [
      '-stream_loop', '-1',
      '-i', avatarVideo,
      '-t', String(s.duration),
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', clipOut
    ];
  } else if (s.type === 'avatar_zoom') {
    // 1.25x dramatic punch-in zoom on avatar
    args = [
      '-stream_loop', '-1',
      '-i', avatarVideo,
      '-t', String(s.duration),
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1536:864,scale=1920:1080,fps=30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', clipOut
    ];
  } else if (s.type === 'avatar_popup') {
    // Full avatar talking + Transparent floating card over left side!
    const popupPng = path.join(cardsDir, s.popup);
    args = [
      '-stream_loop', '-1',
      '-i', avatarVideo,
      '-loop', '1',
      '-i', popupPng,
      '-t', String(s.duration),
      '-filter_complex', '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[av]; [1:v]scale=840:496[pop]; [av][pop]overlay=50:180[outv]',
      '-map', '[outv]',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', clipOut
    ];
  } else if (s.type === 'card') {
    // Fullscreen graphic card
    const cardPng = path.join(cardsDir, s.file);
    args = [
      '-loop', '1',
      '-i', cardPng,
      '-t', String(s.duration),
      '-vf', 'scale=1920:1080,fps=30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', clipOut
    ];
  } else if (s.type === 'broll') {
    // 4K B-Roll with smooth pan & scale
    const brollMp4 = path.join(brollDir, s.file);
    args = [
      '-stream_loop', '-1',
      '-i', brollMp4,
      '-t', String(s.duration),
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', clipOut
    ];
  } else if (s.type === 'broll_phone') {
    // Vertical smartphone TikTok mockup on blurred background
    const phoneMp4 = path.join(brollDir, s.file);
    args = [
      '-stream_loop', '-1',
      '-i', phoneMp4,
      '-t', String(s.duration),
      '-filter_complex', '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=20:5,eq=brightness=-0.3[bg]; [0:v]scale=540:960,drawbox=x=0:y=0:w=iw:h=ih:color=0xBAFF00@0.8:t=4[phone]; [bg][phone]overlay=(W-w)/2:(H-h)/2[outv]',
      '-map', '[outv]',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-an',
      '-y', clipOut
    ];
  }

  const res = spawnSync(ffmpegPath, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(`[Error] Failed on Scene ${idx + 1}:`, res.stderr);
    process.exit(1);
  }
});

console.log('✓ All 35 scenes rendered successfully!');

// ----------------------------------------------------
// STEP 2: Concatenate All Scenes
// ----------------------------------------------------
console.log('\n--- STEP 2: CONCATENATING SCENES ---');
const concatTxt = path.join(tempDir, 'concat_list.txt');
fs.writeFileSync(concatTxt, clipFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf8');

const videoConcat = path.join(tempDir, 'video_concatenated.mp4');
if (!fs.existsSync(videoConcat)) {
  console.log('Running FFmpeg concat demuxer...');
  const concatRes = spawnSync(ffmpegPath, [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatTxt,
    '-c', 'copy',
    '-y', videoConcat
  ], { encoding: 'utf8' });

  if (concatRes.status !== 0) {
    console.error('Concat error:', concatRes.stderr);
    process.exit(1);
  }
}
console.log('✓ Video concatenated successfully!');

// ----------------------------------------------------
// STEP 3: Overlay Logo Watermark + Burn Synced Subtitles
// ----------------------------------------------------
console.log('\n--- STEP 3: OVERLAYING VEXARO LOGO WATERMARK & SUBTITLES ---');
const videoMasterVisual = path.join(tempDir, 'video_master_visual.mp4');
if (!fs.existsSync(videoMasterVisual)) {
  console.log('Burning Vexaro Logo Watermark + ASS Subtitles...');
  const relAss = 'public/subtitles_master.ass';
  const visualRes = spawnSync(ffmpegPath, [
    '-i', videoConcat,
    '-loop', '1', '-i', watermarkPng,
    '-filter_complex', `[0:v][1:v]overlay=0:0:shortest=1[branded]; [branded]ass=filename='${relAss}'[outv]`,
    '-map', '[outv]',
    '-t', String(totalDuration),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-an',
    '-y', videoMasterVisual
  ], { encoding: 'utf8' });

  if (visualRes.status !== 0) {
    console.error('Visual branding error:', visualRes.stderr);
    process.exit(1);
  }
}
console.log('✓ Logo watermark & synchronized subtitles successfully applied!');

// ----------------------------------------------------
// STEP 4: Build Master Sound Design Mix
// ----------------------------------------------------
console.log('\n--- STEP 4: COMPOSING MULTI-TRACK MASTER AUDIO ---');
const sfxBass = path.join(sfxDir, '169335__vibeenterprise__cinematic-deep-bass-hit.mp3');
const sfxWhoosh = path.join(sfxDir, 'transition-whoosh.mp3');
const sfxTyping = path.join(sfxDir, 'keyboard-typing-sound-effect_TjJiXOI.mp3');
const sfxPop = path.join(sfxDir, 'pop-button.mp3');
const sfxWhatsapp = path.join(sfxDir, 'web_whatsapp.mp3');
const sfxError = path.join(sfxDir, 'error_CDOxCYm.mp3');
const sfxTense = path.join(sfxDir, 'tense-music.mp3');

// Bass hits at: 0.0s, 26.0s, 66.0s, 135.0s, 196.0s, 220.0s, 251.5s
const bassDelays = [0, 26000, 66000, 135000, 196000, 220000, 251500];
// Whooshes at: 16.0s, 41.5s, 55.0s, 85.0s, 100.0s, 129.0s, 144.5s, 207.5s, 228.0s
const whooshDelays = [16000, 41500, 55000, 85000, 100000, 129000, 144500, 207500, 228000];
// Pops at pop-up moments: 26.0s, 29.5s, 78.5s, 161.0s, 207.5s, 220.0s, 251.5s
const popDelays = [26000, 29500, 78500, 161000, 207500, 220000, 251500];
// Typing at: 44.5s, 114.5s
const typingDelays = [44500, 114500];
// WhatsApp at: 172.0s, 207.5s, 251.5s
const waDelays = [172000, 207500, 251500];
// Error at: 207.5s
const errorDelays = [207500];

const buildDelaySplits = (inLabel, delays, prefix, vol = 0.5) => {
  const splits = delays.map((_, i) => `[${prefix}_s${i}]`).join('');
  const splitStr = `[${inLabel}]volume=${vol},asplit=${delays.length}${splits}`;
  const delayStrs = delays.map((d, i) => `[${prefix}_s${i}]adelay=${d}|${d}[${prefix}_${i}]`).join('; ');
  const outLabels = delays.map((_, i) => `[${prefix}_${i}]`).join('');
  return { filter: `${splitStr}; ${delayStrs}`, labels: outLabels, count: delays.length };
};

const b = buildDelaySplits('3:a', bassDelays, 'b', 0.65);
const w = buildDelaySplits('4:a', whooshDelays, 'w', 0.45);
const p = buildDelaySplits('5:a', popDelays, 'p', 0.40);
const t = buildDelaySplits('6:a', typingDelays, 't', 0.22);
const wa = buildDelaySplits('7:a', waDelays, 'wa', 0.55);
const err = buildDelaySplits('8:a', errorDelays, 'err', 0.50);

const totalSfxCount = b.count + w.count + p.count + t.count + wa.count + err.count;
const allSfxLabels = b.labels + w.labels + p.labels + t.labels + wa.labels + err.labels;

const audioFilterComplex = [
  // Voiceover: loudnorm for stable broadcast-level volume (-16 LUFS), dynaudnorm for micro smoothing
  '[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,dynaudnorm=f=150:g=15:p=0.9[voice]',
  '[1:a]volume=0.09,afade=t=out:st=256:d=4.89[bgm]',
  '[2:a]volume=0.18,adelay=190500|190500,afade=t=in:st=190.5:d=2,afade=t=out:st=218:d=2[tense]',
  b.filter,
  w.filter,
  p.filter,
  t.filter,
  wa.filter,
  err.filter,
  `[voice][bgm][tense]${allSfxLabels}amix=inputs=${3 + totalSfxCount}:duration=first:dropout_transition=0[master_a]`
].join('; ');

const masterAudio = path.join(tempDir, 'master_audio.m4a');
if (!fs.existsSync(masterAudio)) {
  console.log('Rendering master mixed audio track with SFX and Ducked BGM...');
  const audioRes = spawnSync(ffmpegPath, [
    '-i', voiceoverPath,
    '-stream_loop', '-1', '-i', musicPath,
    '-stream_loop', '-1', '-i', sfxTense,
    '-i', sfxBass,
    '-i', sfxWhoosh,
    '-i', sfxPop,
    '-i', sfxTyping,
    '-i', sfxWhatsapp,
    '-i', sfxError,
    '-filter_complex', audioFilterComplex,
    '-map', '[master_a]',
    '-t', String(totalDuration),
    '-c:a', 'aac',
    '-b:a', '256k',
    '-ar', '48000',
    '-y', masterAudio
  ], { encoding: 'utf8' });

  if (audioRes.status !== 0) {
    console.error('Audio mix error:', audioRes.stderr);
    process.exit(1);
  }
}
console.log('✓ Master multi-track audio rendered successfully!');

// ----------------------------------------------------
// STEP 5: Final Master Muxing
// ----------------------------------------------------
console.log('\n--- STEP 5: FINAL MASTER MUXING ---');
const finalTemp = path.join(tempDir, 'master_final.mp4');

console.log('Combining subtitled video and master audio...');
const muxRes = spawnSync(ffmpegPath, [
  '-i', videoMasterVisual,
  '-i', masterAudio,
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-c:v', 'copy',
  '-c:a', 'copy',
  '-avoid_negative_ts', 'make_zero',
  '-t', String(totalDuration),
  '-movflags', '+faststart',
  '-y', finalTemp
], { encoding: 'utf8' });

if (muxRes.status !== 0) {
  console.error('Final mux error:', muxRes.stderr);
  process.exit(1);
}

// Copy to Desktop and Downloads
fs.copyFileSync(finalTemp, finalDesktop);
fs.copyFileSync(finalTemp, finalDownloads);

console.log('\n======================================================');
console.log('🎉 MASTER VIDEO RENDER COMPLETE (WITH LOGO & PERFECT SYNC)!');
console.log(`📁 Desktop:   ${finalDesktop}`);
console.log(`📁 Downloads: ${finalDownloads}`);
console.log('======================================================');
