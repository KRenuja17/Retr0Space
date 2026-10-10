import { initObservatory } from './observatory.js';
const worlds = [...document.querySelectorAll('.world')];
const dialogs = [...document.querySelectorAll('dialog')];
const stage = document.querySelector('#stage');
const canvas = document.querySelector('#particles');
const ctx = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const themes = ['#c5d3c8', '#d4a088', '#335f70', '#dad5c3', '#142d2e'];
let current = 0;
let motionPaused = reducedMotion.matches;
let frame, previousFrame = 0, lastDraw = 0;
let pointer = { x: 0, y: 0 }, camera = { x: 0, y: 0 };
let width = 0, height = 0, particles = [];

async function travel(index) {
  const incoming = worlds[index];
  try { await incoming.querySelector('.artwork').decode(); } catch {}
  worlds.forEach((world, i) => {
    world.classList.toggle('current', i === index);
    world.inert = i !== index;
  });
  current = index;
  document.body.dataset.world = index;
  document.querySelector('meta[name="theme-color"]').content = themes[index];
  retuneAudio();
  resetParticles();
  draw(0);
}

function setMotion(paused) {
  motionPaused = paused;
  document.body.classList.toggle('motion-paused', paused);
  const button = document.querySelector('#motion');
  button.setAttribute('aria-pressed', String(paused));
  button.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  button.title = paused ? 'Resume motion' : 'Pause motion';
  if (paused) {
    cancelAnimationFrame(frame);
    camera = { x: 0, y: 0 };
    document.documentElement.style.setProperty('--px', '0');
    document.documentElement.style.setProperty('--py', '0');
    document.documentElement.style.setProperty('--push', '0');
    draw(0);
  } else startFrames();
}
document.querySelector('#motion').addEventListener('click', () => setMotion(!motionPaused));
reducedMotion.addEventListener('change', () => setMotion(reducedMotion.matches));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  dialogs.forEach(dialog => { if (dialog.open) dialog.close(); });
  document.querySelector('#' + button.dataset.open).showModal();
}));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
dialogs.forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
stage.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || motionPaused) return;
  pointer = { x: (event.clientX / innerWidth - .5) * 2, y: (event.clientY / stage.clientHeight - .5) * 2 };
});
stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });

// Atmosphere is a light canvas layer, with a different behavior in every world.
function resetParticles() {
  const count = innerWidth < 600 ? 34 : 72;
  particles = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.5 + .35, v: Math.random() * .65 + .15, phase: Math.random() * Math.PI * 2 }));
}
function resize() {
  width = stage.clientWidth;
  height = stage.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  resetParticles();
  draw(0);
}
function draw(dt, time = 0) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  for (const p of particles) {
    if (current === 3) {
      p.x -= dt * .018 * p.v;
      p.y += dt * .036 * p.v;
      ctx.strokeStyle = `rgba(136,37,33,${.08 + p.v * .17})`;
      ctx.lineWidth = .65;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 10 * p.r, p.y - 21 * p.r); ctx.stroke();
    } else if (current === 4) {
      p.x += Math.sin(time * .00022 + p.phase) * dt * .004;
      p.y -= dt * .0018 * p.v;
      const glow = .17 + (Math.sin(time * .001 + p.phase) + 1) * .14;
      ctx.fillStyle = `rgba(212,228,173,${glow})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .8, 0, Math.PI * 2); ctx.fill();
    } else if (current === 2) {
      p.x += dt * .004 * p.v;
      p.y += Math.sin(time * .0004 + p.phase) * dt * .001;
      ctx.fillStyle = `rgba(231,238,213,${.09 + p.v * .17})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .7, 0, Math.PI * 2); ctx.fill();
    } else {
      p.x += dt * (current === 0 ? .016 : -.008) * p.v;
      p.y -= dt * (current === 1 ? .011 : .002) * p.v;
      ctx.fillStyle = current === 0 ? `rgba(239,238,213,${.12 + p.v * .2})` : `rgba(255,224,192,${.15 + p.v * .2})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * (current === 0 ? 2 : 1), p.r * .55, -.35, 0, Math.PI * 2); ctx.fill();
    }
    if (p.x > width + 30) p.x = -20;
    if (p.x < -30) p.x = width + 20;
    if (p.y < -30) p.y = height + 20;
    if (p.y > height + 30) p.y = -20;
  }
}
function tick(time) {
  if (motionPaused || document.hidden) return;
  const dt = Math.min(time - previousFrame || 16, 50);
  previousFrame = time;
  if (time - lastDraw > 32) {
    camera.x += (pointer.x - camera.x) * .055;
    camera.y += (pointer.y - camera.y) * .055;
    document.documentElement.style.setProperty('--px', camera.x.toFixed(3));
    document.documentElement.style.setProperty('--py', camera.y.toFixed(3));
    const push = (Math.sin(time * .00007) + 1) * .0075;
    document.documentElement.style.setProperty('--push', push.toFixed(4));
    draw(Math.min(time - lastDraw || dt, 60), time);
    lastDraw = time;
  }
  frame = requestAnimationFrame(tick);
}
function startFrames() {
  cancelAnimationFrame(frame);
  previousFrame = 0;
  lastDraw = 0;
  if (!motionPaused && !document.hidden) frame = requestAnimationFrame(tick);
}
new ResizeObserver(resize).observe(stage);

// A quiet, original soundscape. No audio download and no autoplay.
let audio;
let master;
let tones = [];
let noiseFilter;
let soundOn = false;
let suspendTimer;
const roots = [110, 130.81, 98, 82.41, 73.42];
function createAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('Audio unavailable');
  audio = new Audio();
  master = audio.createGain();
  master.gain.value = 0;
  master.connect(audio.destination);
  [1, 1.4983, 2.002].forEach((ratio, i) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = roots[current] * ratio;
    gain.gain.value = [.25, .11, .055][i];
    oscillator.connect(gain).connect(master);
    oscillator.start();
    tones.push({ oscillator, ratio });
  });
  const buffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .13;
  const noise = audio.createBufferSource();
  noise.buffer = buffer; noise.loop = true;
  noiseFilter = audio.createBiquadFilter();
  noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 650;
  noise.connect(noiseFilter).connect(master);
  noise.start();
}
function retuneAudio() {
  if (!audio) return;
  tones.forEach(({ oscillator, ratio }) => oscillator.frequency.setTargetAtTime(roots[current] * ratio, audio.currentTime, 1.3));
  noiseFilter.frequency.setTargetAtTime([650, 400, 800, 1100, 240][current], audio.currentTime, 1.4);
}
document.querySelector('#sound').addEventListener('click', async () => {
  const button = document.querySelector('#sound');
  const label = document.querySelector('#sound-label');
  clearTimeout(suspendTimer);
  try {
    if (!audio) createAudio();
    soundOn = !soundOn;
    button.setAttribute('aria-pressed', String(soundOn));
    button.setAttribute('aria-label', soundOn ? 'Mute ambient sound' : 'Enable ambient sound');
    label.textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) await audio.resume();
    master.gain.setTargetAtTime(soundOn ? .12 : 0, audio.currentTime, .25);
    if (!soundOn) suspendTimer = setTimeout(() => audio.suspend(), 1400);
  } catch {
    soundOn = false;
    label.textContent = 'Unavailable';
    button.setAttribute('aria-pressed', 'false');
    button.disabled = true;
    document.querySelector('#announcement').textContent = 'Ambient sound is unavailable in this browser.';
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(frame);
    if (audio) audio.suspend();
  } else {
    startFrames();
    if (soundOn && audio) audio.resume().catch(() => {});
  }
});


setMotion(motionPaused);
resize();
worlds.forEach(world => world.querySelector('.artwork').decode().catch(() => {}));
initObservatory({ travel, paused: () => motionPaused, reduced: () => reducedMotion.matches, current: () => current }).catch(error => {
  console.error('Observatory:', error);
  document.querySelector('#map-status').textContent = 'The observatory could not open. Please reload.';
});
