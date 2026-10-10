const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

console.log('=== VEXARO SMM MASTER VIDEO RENDER ENGINE ===');
console.log('Using FFmpeg binary at:', ffmpegPath);

const baseDir = 'C:\\Users\\HASSAN GAMERZ\\Downloads\\Assests of video editing';
const voiceoverPath = path.join(baseDir, 'i built smm in 15 yeats if age', 'I Built a SMM Panel At 15.m4a');
const musicPath = path.join(baseDir, 'Music', 'Alias - Anno Domini Beats.mp3');
const sfxDir = path.join(baseDir, 'Sound effects');
const brollDir = path.join(baseDir, 'Assests');
const cardsDir = path.join(__dirname, '..', 'public', 'video_cards');
const avatarVideo = path.join(__dirname, '..', 'public', 'avatar', 'full_avatar_talking_1080p.mp4');

const outputDir = path.join(__dirname, '..', 'public', 'render_temp');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const finalOutput = 'C:\\Users\\HASSAN GAMERZ\\Downloads\\I_Built_SMM_Panel_At_15_Master_1080p.mp4';
const desktopOutput = 'C:\\Users\\HASSAN GAMERZ\\Desktop\\I_Built_SMM_Panel_At_15_Master_1080p.mp4';

// Total voiceover duration is 260.89 seconds
const TOTAL_DURATION = 260.89;

// SFX files
const sfxBass = path.join(sfxDir, '169335__vibeenterprise__cinematic-deep-bass-hit.mp3');
const sfxWhoosh = path.join(sfxDir, 'transition-whoosh.mp3');
const sfxTyping = path.join(sfxDir, 'keyboard-typing-sound-effect_TjJiXOI.mp3');
const sfxPop = path.join(sfxDir, 'pop-button.mp3');
const sfxWhatsapp = path.join(sfxDir, 'web_whatsapp.mp3');

// Define scene timeline (total exactly 260.89s)
const scenes = [
  { id: 1, type: 'avatar', duration: 12.0, label: 'Avatar Intro' },
  { id: 2, type: 'broll', file: '12040-236265335.mp4', duration: 10.0, label: 'Student Homework' },
  { id: 3, type: 'avatar', duration: 10.0, label: 'Avatar Speech' },
  { id: 4, type: 'broll', file: '12903134_1920_1080_25fps.mp4', duration: 9.0, label: '3 AM Alarm Clock' },
  { id: 5, type: 'broll', file: '13522186-uhd_3840_2160_25fps.mp4', duration: 14.0, label: 'Laptop Coding' },
  { id: 6, type: 'avatar', duration: 17.0, label: 'Avatar Speech' },
  { id: 7, type: 'broll', file: '1085656-uhd_3840_2160_25fps.mp4', duration: 18.0, label: 'Datacenter Server Network' },
  { id: 8, type: 'card', file: 'card_comparison.png', duration: 18.0, label: 'Reseller vs Vexaro Card' },
  { id: 9, type: 'broll', file: '6266288-uhd_3840_2160_25fps.mp4', duration: 6.0, label: 'Cash Counter Machine' },
  { id: 10, type: 'avatar', duration: 24.0, label: 'Avatar Speech' },
  { id: 11, type: 'broll', file: '1085656-uhd_3840_2160_25fps.mp4', duration: 18.0, label: 'Server API Cables' },
  { id: 12, type: 'avatar', duration: 20.0, label: 'Avatar Speech' },
  { id: 13, type: 'card', file: 'card_payments.png', duration: 22.0, label: 'SadaPay Easypaisa Card' },
  { id: 14, type: 'avatar', duration: 20.0, label: 'Avatar Speech' },
  { id: 15, type: 'broll', file: '13522186-uhd_3840_2160_25fps.mp4', duration: 14.0, label: 'Night Coding' },
  { id: 16, type: 'card', file: 'card_bonus.png', duration: 14.0, label: 'Rs 50 Bonus Card' },
  { id: 17, type: 'avatar', duration: 14.89, label: 'Avatar Outro' },
];

console.log('Total scenes:', scenes.length);
const sumDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
console.log('Sum duration:', sumDuration.toFixed(2), 'seconds (Target:', TOTAL_DURATION, ')');

// Step 1: Render each scene video clip
const clipFiles = [];
scenes.forEach((s, idx) => {
  const clipOut = path.join(outputDir, `scene_${String(idx + 1).padStart(2, '0')}.mp4`);
  clipFiles.push(clipOut);

  if (fs.existsSync(clipOut)) {
    console.log(`[Scene ${idx + 1}] Already exists: ${path.basename(clipOut)}`);
    return;
  }

  console.log(`[Scene ${idx + 1}/${scenes.length}] Rendering ${s.label} (${s.duration}s)...`);

  let args = [];
  if (s.type === 'avatar') {
    // Loop avatar smoothly for s.duration
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
  } else if (s.type === 'card') {
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
  }

  execFileSync(ffmpegPath, args, { stdio: 'pipe' });
  console.log(`✓ Completed: ${path.basename(clipOut)}`);
});

// Step 2: Concatenate all video clips
console.log('Concatenating all video scenes...');
const concatListFile = path.join(outputDir, 'concat_list.txt');
const concatContent = clipFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
fs.writeFileSync(concatListFile, concatContent);

const concatenatedVideo = path.join(outputDir, 'video_concatenated.mp4');
console.log('Running concat demuxer...');
execFileSync(ffmpegPath, [
  '-f', 'concat',
  '-safe', '0',
  '-i', concatListFile,
  '-c', 'copy',
  '-y', concatenatedVideo
], { stdio: 'pipe' });
console.log('✓ Video concatenated successfully!');

// Step 3: Composite Master Audio Track
console.log('Compositing master audio (voiceover + background music + sound effects)...');

// Calculate whoosh and sound timestamps in ms for adelay
// Whooshes at scene boundaries
const whooshTimes = [12.0, 32.0, 55.0, 72.0, 90.0, 108.0, 114.0, 138.0, 156.0, 176.0, 198.0, 218.0, 232.0, 246.0];
const popTimes = [3.0, 91.0, 177.0, 233.0];

// Build complex filter for audio
// [0:a] = Master voiceover
// [1:a] = Background music (looped, volume 0.08, fade out)
// [2:a] = Bass hit (at 0s, volume 0.7)
// [3:a] = Whoosh SFX
// [4:a] = Pop SFX
// [5:a] = Typing SFX (at 41s, volume 0.35)
// [6:a] = WhatsApp SFX (at 182s, volume 0.6)

const masterAudio = path.join(outputDir, 'audio_master.m4a');

console.log('Rendering audio mix...');
execFileSync(ffmpegPath, [
  '-i', voiceoverPath,
  '-stream_loop', '-1', '-i', musicPath,
  '-i', sfxBass,
  '-i', sfxWhoosh,
  '-i', sfxPop,
  '-i', sfxTyping,
  '-i', sfxWhatsapp,
  '-filter_complex',
  `
    [0:a]volume=1.0[voice];
    [1:a]volume=0.08,atrim=0:${TOTAL_DURATION},afade=t=out:st=256:d=4[bgm];
    [2:a]volume=0.7[bass];
    [5:a]volume=0.35,adelay=41000|41000[typing];
    [6:a]volume=0.6,adelay=182000|182000[whatsapp];
    [3:a]volume=0.5,adelay=12000|12000[w1];
    [3:a]volume=0.5,adelay=72000|72000[w2];
    [3:a]volume=0.5,adelay=90000|90000[w3];
    [3:a]volume=0.5,adelay=176000|176000[w4];
    [3:a]volume=0.5,adelay=232000|232000[w5];
    [4:a]volume=0.55,adelay=91000|91000[p1];
    [4:a]volume=0.55,adelay=233000|233000[p2];
    [voice][bgm][bass][typing][whatsapp][w1][w2][w3][w4][w5][p1][p2]amix=inputs=12:duration=first:dropout_transition=2[outa]
  `,
  '-map', '[outa]',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-y', masterAudio
], { stdio: 'pipe' });
console.log('✓ Master audio rendered successfully!');

// Step 4: Final Mux (Video + Audio)
console.log('Muxing final 1080p 60FPS master video...');
execFileSync(ffmpegPath, [
  '-i', concatenatedVideo,
  '-i', masterAudio,
  '-c:v', 'copy',
  '-c:a', 'copy',
  '-movflags', '+faststart',
  '-y', finalOutput
], { stdio: 'pipe' });

console.log('✓ Master video saved to:', finalOutput);

// Also copy to desktop
fs.copyFileSync(finalOutput, desktopOutput);
console.log('✓ Also copied to Desktop:', desktopOutput);

console.log('=== VIDEO PRODUCTION FINISHED SUCCESSFULLY ===');
