const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ffmpegPath = require('ffmpeg-static');
console.log('Using ffmpeg from:', ffmpegPath);

const avatarDir = path.join(__dirname, '..', 'public', 'avatar');
const outputMp4 = path.join(avatarDir, 'vexaro_talking_avatar_30s.mp4');

// The 5 frame files
const frames = {
  open: path.join(avatarDir, 'frame1_open.jpg').replace(/\\/g, '/'),
  closed: path.join(avatarDir, 'frame2_closed.jpg').replace(/\\/g, '/'),
  blink: path.join(avatarDir, 'frame3_blink.jpg').replace(/\\/g, '/'),
  o: path.join(avatarDir, 'frame4_o.jpg').replace(/\\/g, '/'),
  smile: path.join(avatarDir, 'frame5_smile.jpg').replace(/\\/g, '/'),
};

// Generate realistic speech timeline for 30 seconds
const speechPhonemes = ['open', 'o', 'smile', 'closed', 'open', 'smile', 'o', 'closed'];
const totalTargetDuration = 30.0; // 30 seconds seamless loop

let timeline = [];
let currentTime = 0;
let nextBlinkTime = 3.5;

while (currentTime < totalTargetDuration) {
  // Check if it's time to blink
  if (currentTime >= nextBlinkTime) {
    timeline.push({ file: frames.blink, duration: 0.13 });
    currentTime += 0.13;
    nextBlinkTime = currentTime + (3.0 + Math.random() * 2.5); // next blink in 3-5.5s
    continue;
  }

  // Pick next phoneme
  const phoneme = speechPhonemes[Math.floor(Math.random() * speechPhonemes.length)];
  const duration = Number((0.11 + Math.random() * 0.14).toFixed(3)); // 110ms to 250ms

  timeline.push({ file: frames[phoneme], duration: duration });
  currentTime += duration;
}

// Add final frame entry for concat demuxer
if (timeline.length > 0) {
  timeline.push({ file: timeline[timeline.length - 1].file });
}

// Write concat file
const concatFilePath = path.join(avatarDir, 'timeline_concat.txt');
let concatContent = '';
for (let i = 0; i < timeline.length; i++) {
  const item = timeline[i];
  concatContent += `file '${item.file}'\n`;
  if (item.duration !== undefined) {
    concatContent += `duration ${item.duration}\n`;
  }
}

fs.writeFileSync(concatFilePath, concatContent, 'utf8');
console.log(`Generated timeline with ${timeline.length} cuts (~${currentTime.toFixed(1)}s total)`);

console.log('Rendering 1080p 60FPS MP4 video with ffmpeg...');
const args = [
  '-f', 'concat',
  '-safe', '0',
  '-i', concatFilePath,
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-r', '60',
  '-an', // Ensure NO AUDIO
  '-movflags', '+faststart',
  '-y',
  outputMp4
];

try {
  execFileSync(ffmpegPath, args, { stdio: 'inherit' });
  console.log(`\nSUCCESS! Video created at:\n${outputMp4}`);

  // Also create a 10s shorter loop
  const output10s = path.join(avatarDir, 'vexaro_talking_avatar_10s.mp4');
  execFileSync(ffmpegPath, [
    '-ss', '0',
    '-t', '10',
    '-i', outputMp4,
    '-c', 'copy',
    '-an',
    '-y',
    output10s
  ], { stdio: 'inherit' });
  console.log(`SUCCESS! 10s version created at:\n${output10s}`);
} catch (err) {
  console.error('Error rendering video:', err);
  process.exit(1);
}
