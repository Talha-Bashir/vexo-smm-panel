const fs = require('fs');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const audio = 'C:\\Users\\HASSAN GAMERZ\\Downloads\\Assests of video editing\\i built smm in 15 yeats if age\\I Built a SMM Panel At 15.m4a';

const res = spawnSync(ffmpeg, ['-i', audio, '-af', 'silencedetect=noise=-28dB:d=0.25', '-f', 'null', '-'], { encoding: 'utf8' });
const lines = res.stderr.split('\n').filter(l => l.includes('silence_end'));
console.log('Detected', lines.length, 'silence boundaries:');
const pauses = [];
lines.forEach(l => {
  const match = l.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
  if (match) {
    const end = parseFloat(match[1]);
    const dur = parseFloat(match[2]);
    const start = parseFloat((end - dur).toFixed(2));
    pauses.push({ start, end, dur });
    console.log(`Speech segment ended at ${start}s -> Pause until ${end.toFixed(2)}s (${dur.toFixed(2)}s)`);
  }
});
