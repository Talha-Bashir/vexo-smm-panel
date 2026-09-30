const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const avatarDir = path.join(__dirname, '..', 'public', 'avatar');
const inputMp4 = path.join(avatarDir, 'vexaro_talking_avatar_10s.mp4');
const outputSmooth = path.join(avatarDir, 'vexaro_talking_avatar_smooth.mp4');

console.log('Rendering motion-interpolated smooth morphing video...');

// minterpolate creates AI-like optical flow in-between morphing frames
const args = [
  '-i', inputMp4,
  '-filter:v', "tblend=all_mode=average,framerate=fps=60",
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-an',
  '-y',
  outputSmooth
];

try {
  execFileSync(ffmpegPath, args, { stdio: 'inherit' });
  console.log('Smooth video generated at:', outputSmooth);
} catch (e) {
  console.error('Error:', e);
}
