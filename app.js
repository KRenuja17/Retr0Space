const worlds = [...document.querySelectorAll('.world')];
const chapterButtons = [...document.querySelectorAll('.chapter')];
const atlasCards = [...document.querySelectorAll('.atlas-card')];
const dialogs = [...document.querySelectorAll('dialog')];
const stage = document.querySelector('#stage');
const canvas = document.querySelector('#particles');
const ctx = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const names = ['The Pale Frontier', 'The Sleeping Sun', 'The Lunar Shore', 'The Crimson Oath', 'The Blue Hour'];
const colors = ['#203d35', '#493b31', '#e5e6d0', '#a12d2b', '#e1e4cc'];
const themes = ['#c5d3c8', '#d4a088', '#335f70', '#dad5c3', '#142d2e'];
const duration = 14000;
let current = 0;
let busy = false;
let queued = null;
let motionPaused = reducedMotion.matches;
let drifting = false;
let driftStarted = 0;
let driftTimer;
let frame;
let previousFrame = 0;
let lastDraw = 0;
let lastWheel = 0;
let pointer = { x: 0, y: 0 };
let camera = { x: 0, y: 0 };
let width = 0;
let height = 0;
let particles = [];
let visited = new Set([0]);
try {
  const stored = JSON.parse(localStorage.getItem('otherwhere-visited') || '[]');
  if (Array.isArray(stored)) stored.filter(x => Number.isInteger(x) && x >= 0 && x < 5).forEach(x => visited.add(x));
} catch { /* Storage is optional, including in private browsing. */ }

function remember(index) {
  visited.add(index);
  try { localStorage.setItem('otherwhere-visited', JSON.stringify([...visited])); } catch { /* Keep the session usable. */ }
}

function updateNavigation() {
  chapterButtons.forEach((button, index) => {
    const active = current === index;
    button.classList.toggle('selected', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  atlasCards.forEach((card, index) => {
    card.querySelector('.card-visit').textContent = index === current ? 'Currently here' : visited.has(index) ? 'Wandered here' : '';
    if (index === current) card.setAttribute('aria-current', 'true');
    else card.removeAttribute('aria-current');
  });
  document.querySelector('#current-number').textContent = String(current + 1).padStart(2, '0');
  document.body.dataset.world = current;
  document.querySelector('meta[name="theme-color"]').content = themes[current];
}

function transitionFor(index) {
  if (motionPaused || reducedMotion.matches) return { keyframes: [{ opacity: 0 }, { opacity: 1 }], duration: 180 };
  const transitions = [
    { keyframes: [{ clipPath: 'polygon(0% 0%, 0% 0%, -20% 100%, 0% 100%)' }, { clipPath: 'polygon(0% 0%, 120% 0%, 100% 100%, 0% 100%)' }], duration: 1200 },
    { keyframes: [{ clipPath: 'ellipse(0% 0% at 74% 52%)' }, { clipPath: 'ellipse(150% 150% at 74% 52%)' }], duration: 1450 },
    { keyframes: [{ clipPath: 'circle(0% at 72% 46%)' }, { clipPath: 'circle(140% at 72% 46%)' }], duration: 1500 },
    { keyframes: [{ clipPath: 'polygon(100% 0%, 100% 0%, 140% 100%, 100% 100%)' }, { clipPath: 'polygon(-40% 0%, 100% 0%, 140% 100%, 0% 100%)' }], duration: 1150 },
    { keyframes: [{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)' }], duration: 1800 }
  ];
  return transitions[index];
}

async function travel(index, { manual = true, hash = true, instant = false } = {}) {
  index = (index + worlds.length) % worlds.length;
  if (manual) setDrifting(false);
  if (busy) { queued = { index, manual, hash }; return; }
  if (index === current) return;
  busy = true;
  const outgoing = worlds[current];
  const incoming = worlds[index];
  // Wait for the actual image, so a transition never reveals an unloaded frame.
  try { await incoming.querySelector('.artwork').decode(); } catch { /* An alt description remains available if an asset fails. */ }
  current = index;
  remember(index);
  outgoing.classList.remove('current');
  outgoing.classList.add('leaving');
  outgoing.inert = true;
  incoming.classList.add('entering');
  incoming.inert = false;
  updateNavigation();
  if (hash) history.replaceState(null, '', `#world-${String(index + 1).padStart(2, '0')}`);
  retuneAudio();
  resetParticles();
  draw(0);
  const transition = transitionFor(index);
  const animation = incoming.animate(transition.keyframes, { duration: instant ? 1 : transition.duration, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'both' });
  if (!motionPaused && !reducedMotion.matches && !instant) {
    incoming.querySelectorAll('.scene-content h1>span,.scene-content h2>span').forEach((line, i) => {
      line.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 1150, delay: 260 + i * 95, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
  }
  try { await animation.finished; } catch { /* A cancelled animation still settles to a complete world. */ }
  outgoing.classList.remove('leaving');
  incoming.classList.remove('entering');
  incoming.classList.add('current');
  animation.cancel();
  document.querySelector('#announcement').textContent = `${String(current + 1).padStart(2, '0')} of 05. ${names[current]}.`;
  busy = false;
  if (queued) { const next = queued; queued = null; travel(next.index, next); }
}

function setDrifting(value) {
  drifting = value;
  clearInterval(driftTimer);
  document.body.classList.toggle('drifting', value);
  document.querySelectorAll('.drift-label').forEach(label => { label.textContent = value ? 'Pause drifting' : 'Begin drifting'; });
  document.querySelectorAll('[data-drift]').forEach(button => button.setAttribute('aria-pressed', String(value)));
  document.documentElement.style.setProperty('--drift', value ? '0' : '.18');
  if (value) {
    driftStarted = performance.now();
    driftTimer = setInterval(() => {
      if (!document.hidden && !dialogs.some(d => d.open) && !busy) {
        driftStarted = performance.now();
        travel(current + 1, { manual: false });
      }
    }, duration);
  }
}

function setMotion(paused) {
  motionPaused = paused;
  document.body.classList.toggle('motion-paused', paused);
  const button = document.querySelector('#motion');
  button.setAttribute('aria-pressed', String(paused));
  button.setAttribute('aria-label', paused ? 'Resume motion' : 'Pause motion');
  button.title = paused ? 'Resume motion' : 'Pause motion';
  if (paused) {
    setDrifting(false);
    cancelAnimationFrame(frame);
    camera = { x: 0, y: 0 };
    document.documentElement.style.setProperty('--px', '0');
    document.documentElement.style.setProperty('--py', '0');
    draw(0);
  } else startFrames();
}

document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.select);
  dialogs.forEach(dialog => { if (dialog.open) dialog.close(); });
  travel(index);
}));
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => travel(current + Number(button.dataset.step))));
document.querySelectorAll('[data-drift]').forEach(button => button.addEventListener('click', () => setDrifting(!drifting)));
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  setDrifting(false);
  document.querySelector(`#${button.dataset.open}`).showModal();
}));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
dialogs.forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog && dialog.id === 'notes') dialog.close(); }));
document.querySelector('#motion').addEventListener('click', () => setMotion(!motionPaused));
reducedMotion.addEventListener('change', () => setMotion(reducedMotion.matches));
document.querySelector('.wordmark').addEventListener('click', event => { event.preventDefault(); travel(0); });

document.addEventListener('keydown', event => {
  if (dialogs.some(d => d.open) || event.altKey || event.ctrlKey || event.metaKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'Home') travel(0);
    else if (event.key === 'End') travel(4);
    else travel(current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1));
  }
});
stage.addEventListener('wheel', event => {
  if (event.ctrlKey || dialogs.some(d => d.open)) return;
  event.preventDefault();
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const now = performance.now();
  if (Math.abs(delta) > 22 && now - lastWheel > 1900 && !busy) {
    lastWheel = now;
    travel(current + Math.sign(delta));
  }
}, { passive: false });
let touchStart;
stage.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY }; });
stage.addEventListener('pointerup', event => {
  if (!touchStart || event.pointerType !== 'touch') return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3 && !busy) travel(current + (dx < 0 ? 1 : -1));
});
stage.addEventListener('pointercancel', () => { touchStart = null; });
stage.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || motionPaused) return;
  pointer = { x: (event.clientX / innerWidth - .5) * 2, y: (event.clientY / stage.clientHeight - .5) * 2 };
});
stage.addEventListener('pointerleave', () => { pointer = { x: 0, y: 0 }; });
window.addEventListener('hashchange', () => {
  const id = Number(location.hash.match(/^#world-0([1-5])$/)?.[1]);
  if (id) travel(id - 1, { hash: false });
});

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
    draw(Math.min(time - lastDraw || dt, 60), time);
    lastDraw = time;
    if (drifting) document.documentElement.style.setProperty('--drift', String(Math.min((time - driftStarted) / duration, 1)));
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
    setDrifting(false);
    cancelAnimationFrame(frame);
    if (audio) audio.suspend();
  } else {
    startFrames();
    if (soundOn && audio) audio.resume().catch(() => {});
  }
});

updateNavigation();
setMotion(motionPaused);
resize();
const initial = Number(location.hash.match(/^#world-0([1-5])$/)?.[1]);
if (initial && initial !== 1) travel(initial - 1, { instant: true, hash: false });
// Warm all five images without delaying the opening view.
worlds.forEach(world => world.querySelector('.artwork').decode().catch(() => {}));
