(() => {
  "use strict";

  const canvas = document.querySelector("#universe");
  const ctx = canvas.getContext("2d", { alpha: true });
  const experience = document.querySelector("#experience");
  const prompt = document.querySelector("#prompt");
  const promptText = document.querySelector("#promptText");
  const subPrompt = document.querySelector("#subPrompt");
  const liveStatus = document.querySelector("#liveStatus");
  const finaleBlurArt = document.querySelector(".art--finale-blur");
  const finaleArt = document.querySelector(".art--finale");
  const whaleSprite = new Image();
  whaleSprite.decoding = "async";
  whaleSprite.src = "assets/cosmic-whale.png";

  const TAU = Math.PI * 2;
  const COLORS = ["#54efff", "#168cff", "#9a62ff", "#ff78bd", "#ffd78c"];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionPreference.matches;
  let maxParticles = reducedMotion ? 520 : 1500;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;
  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastFrame = performance.now();
  let phase = "seed";
  let phaseStarted = lastFrame;
  let collected = 0;
  let energy = 0;
  let energyTarget = 0;
  let nextWishAt = 0;
  let currentWish = null;
  let birthParticles = [];
  let titleParticles = [];
  let titleBounds = null;
  let cosmicBackdrop = null;
  let epilogueStarted = false;
  let screenFlash = 0;
  let cameraKick = 0;
  let interactiveFirework = 0;
  let lastMagicAt = 0;
  let lastCometAt = 0;
  let hiddenAt = 0;
  let promptTimer = 0;
  let starSeed = 91802;
  let transitionBurst = false;
  let transitionReveal = false;

  const stars = [];
  const particles = [];
  const ripples = [];
  const fireworks = [];
  const zoomWhales = [];
  const babyWhales = [];
  const comets = [];
  const vortexDust = [];
  const warpStreaks = [];
  let titleCore = null;
  let titleGlow = null;
  const finaleEvents = [
    { time: 0.75, nx: 0.22, ny: 0.3, style: "burst", depth: 0.7, played: false },
    { time: 1.18, nx: 0.78, ny: 0.27, style: "spiral", depth: 0.82, played: false },
    { time: 1.72, nx: 0.34, ny: 0.68, style: "tail", depth: 1, played: false },
    { time: 2.15, nx: 0.7, ny: 0.62, style: "burst", depth: 1.08, played: false },
    { time: 2.85, nx: 0.5, ny: 0.22, style: "burst", depth: 1.2, played: false },
    { time: 3.45, nx: 0.17, ny: 0.52, style: "spiral", depth: 0.82, played: false },
    { time: 3.9, nx: 0.84, ny: 0.49, style: "tail", depth: 0.82, played: false },
  ];

  const pointer = {
    x: 0,
    y: 0,
    down: false,
    id: null,
  };

  const seed = { x: 0, y: 0 };
  const portal = { x: 0, y: 0, spin: 0 };
  const hold = { active: false, progress: 0, ready: false };
  const moon = { nx: 0.82, ny: 0.24, rotation: 0, spin: 0, hit: false };

  const whale = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
    facing: 1,
    tilt: -0.16,
    reveal: 0,
    trailClock: 0,
  };

  const wishMap = [
    { nx: 0.2, ny: 0.28, escapes: 0 },
    { nx: 0.78, ny: 0.38, escapes: 1 },
    { nx: 0.77, ny: 0.22, escapes: 0 },
    { nx: 0.25, ny: 0.67, escapes: 2 },
    { nx: 0.52, ny: 0.32, escapes: 0 },
  ];

  const milestoneCopy = [
    ["Tinh vân đã thức giấc", "Một điều ước đã sáng lên"],
    ["Những hành tinh mở mắt", "Hai điều ước đang bay cùng Pastie"],
    ["Quỹ đạo bắt đầu hát", "Mặt trăng hơi chóng mặt rồi đấy"],
    ["Một đàn cá voi con xuất hiện", "Chỉ còn một ngôi sao cuối cùng"],
    ["Cánh cổng ngân hà đã mở", "Giữ lấy ánh sáng để đánh thức bầu trời"],
  ];

  function seededRandom() {
    starSeed |= 0;
    starSeed = (starSeed + 0x6d2b79f5) | 0;
    let value = Math.imul(starSeed ^ (starSeed >>> 15), 1 | starSeed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  class CosmicAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.chargeOscillator = null;
      this.chargeGain = null;
    }

    unlock() {
      if (this.context) {
        this.context.resume().catch(() => {});
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      try {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.context.destination);
        this.startAmbient();
      } catch {
        this.context = null;
      }
    }

    startAmbient() {
      const now = this.context.currentTime;
      const bed = this.context.createGain();
      const low = this.context.createOscillator();
      const high = this.context.createOscillator();
      const lfo = this.context.createOscillator();
      const lfoGain = this.context.createGain();

      bed.gain.setValueAtTime(0.0001, now);
      bed.gain.exponentialRampToValueAtTime(0.08, now + 2.4);
      low.type = "sine";
      low.frequency.value = 43;
      high.type = "triangle";
      high.frequency.value = 64.5;
      lfo.frequency.value = 0.085;
      lfoGain.gain.value = 8;

      lfo.connect(lfoGain);
      lfoGain.connect(high.detune);
      low.connect(bed);
      high.connect(bed);
      bed.connect(this.master);
      low.start();
      high.start();
      lfo.start();
    }

    tone(frequency, duration = 1, volume = 0.14, type = "sine", delay = 0) {
      if (!this.context || !this.master) return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
    }

    chime(index = 0) {
      const notes = [261.63, 329.63, 392, 523.25, 659.25];
      const note = notes[index % notes.length];
      this.tone(note, 1.15, 0.2, "sine");
      this.tone(note * 2.01, 0.72, 0.07, "sine", 0.04);
    }

    ripple() {
      this.tone(176, 0.6, 0.08, "sine");
      this.tone(352, 0.95, 0.06, "triangle", 0.08);
    }

    whaleCall() {
      if (!this.context || !this.master) return;
      const now = this.context.currentTime + 0.25;
      const oscillator = this.context.createOscillator();
      const modulator = this.context.createOscillator();
      const modulation = this.context.createGain();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(118, now);
      oscillator.frequency.exponentialRampToValueAtTime(52, now + 2.8);
      modulator.frequency.value = 4.2;
      modulation.gain.value = 13;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.17, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);
      modulator.connect(modulation);
      modulation.connect(oscillator.detune);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      modulator.start(now);
      oscillator.stop(now + 3.2);
      modulator.stop(now + 3.2);
    }

    beginCharge() {
      if (!this.context || this.chargeOscillator) return;
      const now = this.context.currentTime;
      this.chargeOscillator = this.context.createOscillator();
      this.chargeGain = this.context.createGain();
      this.chargeOscillator.type = "sine";
      this.chargeOscillator.frequency.value = 88;
      this.chargeGain.gain.setValueAtTime(0.0001, now);
      this.chargeGain.gain.exponentialRampToValueAtTime(0.1, now + 0.2);
      this.chargeOscillator.connect(this.chargeGain);
      this.chargeGain.connect(this.master);
      this.chargeOscillator.start();
    }

    updateCharge(progress) {
      if (!this.context || !this.chargeOscillator) return;
      const now = this.context.currentTime;
      this.chargeOscillator.frequency.setTargetAtTime(88 + progress * 330, now, 0.08);
      this.chargeGain.gain.setTargetAtTime(0.06 + progress * 0.1, now, 0.08);
    }

    endCharge() {
      if (!this.context || !this.chargeOscillator) return;
      const now = this.context.currentTime;
      const oscillator = this.chargeOscillator;
      this.chargeGain.gain.cancelScheduledValues(now);
      this.chargeGain.gain.setTargetAtTime(0.0001, now, 0.06);
      oscillator.stop(now + 0.35);
      this.chargeOscillator = null;
      this.chargeGain = null;
    }

    finale() {
      [130.81, 164.81, 196, 261.63].forEach((note, index) => {
        this.tone(note, 4.5, 0.12, index % 2 ? "triangle" : "sine", index * 0.06);
        this.tone(note * 2, 2.8, 0.045, "sine", 0.45 + index * 0.08);
      });
    }
  }

  const audio = new CosmicAudio();

  function setPrompt(main, detail = "", autoHide = 0) {
    window.clearTimeout(promptTimer);
    promptText.textContent = main;
    subPrompt.textContent = detail;
    prompt.classList.toggle("prompt--visible", Boolean(main));
    subPrompt.classList.toggle("sub-prompt--visible", Boolean(detail));
    if (main) liveStatus.textContent = `${main}. ${detail}`;
    if (autoHide > 0) {
      promptTimer = window.setTimeout(() => {
        prompt.classList.remove("prompt--visible");
        subPrompt.classList.remove("sub-prompt--visible");
      }, autoHide);
    }
  }

  function resize() {
    const oldWidth = width || window.innerWidth;
    const oldHeight = height || window.innerHeight;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, reducedMotion ? 1.25 : 1.8);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sx = width / oldWidth;
    const sy = height / oldHeight;
    whale.x *= sx;
    whale.y *= sy;
    whale.targetX *= sx;
    whale.targetY *= sy;
    portal.x *= sx;
    portal.y *= sy;
    birthParticles.forEach((particle) => {
      particle.sx *= sx;
      particle.sy *= sy;
      particle.tx *= sx;
      particle.ty *= sy;
    });
    babyWhales.forEach((baby) => {
      baby.x *= sx;
      baby.y *= sy;
      baby.vx *= sx;
      baby.vy *= sy;
    });
    ripples.forEach((ripple) => {
      ripple.x *= sx;
      ripple.y *= sy;
      ripple.maxRadius *= Math.min(sx, sy);
    });
    particles.forEach((particle) => {
      particle.x *= sx;
      particle.y *= sy;
      particle.vx *= sx;
      particle.vy *= sy;
    });
    fireworks.forEach((particle) => {
      particle.x *= sx;
      particle.y *= sy;
      particle.vx *= sx;
      particle.vy *= sy;
      particle.trail.forEach((point) => {
        point.x *= sx;
        point.y *= sy;
      });
    });
    [...zoomWhales, ...comets].forEach((item) => {
      item.x *= sx;
      item.y *= sy;
    });
    seed.x = width * 0.5;
    seed.y = height * 0.53;

    buildStarField();
    buildCosmicBackdrop();
    if (phase === "portal" || phase === "transition") buildVortexDust();
    if (phase === "transition") buildWarpStreaks();
    if (phase === "finale" || phase === "epilogue") {
      generateTitleParticles(phase === "epilogue" || performance.now() - phaseStarted > 3200);
    }
    if (currentWish) locateWish(currentWish);
  }

  function buildStarField() {
    const desired = Math.round(
      clamp((width * height) / (reducedMotion ? 8500 : 4700), 110, reducedMotion ? 200 : 430),
    );
    starSeed = 91802;
    stars.length = 0;
    for (let index = 0; index < desired; index += 1) {
      stars.push({
        nx: seededRandom(),
        ny: seededRandom(),
        z: 0.35 + seededRandom() * 1.65,
        size: 0.35 + seededRandom() * 1.45,
        phase: seededRandom() * TAU,
        speed: 0.35 + seededRandom() * 1.25,
        hue: seededRandom() > 0.82 ? 270 : 200 + seededRandom() * 20,
      });
    }
  }

  function buildCosmicBackdrop() {
    cosmicBackdrop = document.createElement("canvas");
    const scale = Math.min(1, 980 / Math.max(width, height));
    cosmicBackdrop.width = Math.max(320, Math.round(width * scale));
    cosmicBackdrop.height = Math.max(480, Math.round(height * scale));
    const backdropContext = cosmicBackdrop.getContext("2d");
    const backdropWidth = cosmicBackdrop.width;
    const backdropHeight = cosmicBackdrop.height;
    let localSeed = 0x51f15e;
    const random = () => {
      localSeed = Math.imul(localSeed ^ (localSeed >>> 15), 1 | localSeed);
      localSeed ^= localSeed + Math.imul(localSeed ^ (localSeed >>> 7), 61 | localSeed);
      return ((localSeed ^ (localSeed >>> 14)) >>> 0) / 4294967296;
    };

    backdropContext.clearRect(0, 0, backdropWidth, backdropHeight);
    backdropContext.globalCompositeOperation = "screen";
    const clouds = [
      [0.08, 0.24, 0.48, "23, 89, 255", 0.32],
      [0.34, 0.45, 0.52, "102, 42, 255", 0.28],
      [0.69, 0.55, 0.46, "0, 191, 255", 0.24],
      [0.9, 0.76, 0.5, "214, 54, 255", 0.27],
      [0.47, 0.86, 0.38, "255, 62, 176", 0.16],
    ];
    clouds.forEach(([nx, ny, nr, color, alpha]) => {
      const x = nx * backdropWidth;
      const y = ny * backdropHeight;
      const radius = Math.max(backdropWidth, backdropHeight) * nr;
      const gradient = backdropContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
      gradient.addColorStop(0.26, `rgba(${color}, ${alpha * 0.54})`);
      gradient.addColorStop(0.62, `rgba(${color}, ${alpha * 0.13})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      backdropContext.fillStyle = gradient;
      backdropContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });

    backdropContext.save();
    backdropContext.translate(backdropWidth / 2, backdropHeight / 2);
    backdropContext.rotate(-0.48);
    const bandLength = Math.hypot(backdropWidth, backdropHeight) * 1.45;
    const bandWidth = Math.min(backdropWidth, backdropHeight) * 0.38;
    const band = backdropContext.createLinearGradient(0, -bandWidth / 2, 0, bandWidth / 2);
    band.addColorStop(0, "rgba(25, 48, 160, 0)");
    band.addColorStop(0.24, "rgba(53, 67, 255, 0.08)");
    band.addColorStop(0.48, "rgba(98, 218, 255, 0.2)");
    band.addColorStop(0.55, "rgba(196, 105, 255, 0.16)");
    band.addColorStop(0.78, "rgba(74, 39, 181, 0.07)");
    band.addColorStop(1, "rgba(14, 26, 90, 0)");
    backdropContext.fillStyle = band;
    backdropContext.fillRect(-bandLength / 2, -bandWidth / 2, bandLength, bandWidth);
    backdropContext.restore();

    const dustCount = reducedMotion ? 360 : 920;
    const angle = -0.48;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    backdropContext.globalCompositeOperation = "lighter";
    for (let index = 0; index < dustCount; index += 1) {
      const along = (random() - 0.5) * Math.hypot(backdropWidth, backdropHeight) * 1.35;
      const spread = (random() + random() + random() - 1.5) * Math.min(backdropWidth, backdropHeight) * 0.27;
      const x = backdropWidth / 2 + along * cos - spread * sin;
      const y = backdropHeight / 2 + along * sin + spread * cos;
      const bright = random();
      const size = bright > 0.97 ? 1.8 : 0.35 + random() * 0.8;
      backdropContext.fillStyle = bright > 0.88
        ? `rgba(179, 231, 255, ${0.3 + random() * 0.55})`
        : `rgba(${random() > 0.5 ? "105, 154, 255" : "185, 101, 255"}, ${0.08 + random() * 0.28})`;
      backdropContext.beginPath();
      backdropContext.arc(x, y, size, 0, TAU);
      backdropContext.fill();
    }
  }

  function locateWish(wish) {
    const gutter = Math.max(56, Math.min(width, height) * 0.1);
    wish.x = clamp(wish.nx * width, gutter, width - gutter);
    wish.y = clamp(wish.ny * height, gutter, height - gutter - 80);
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function addRipple(x, y, color = "#55efff", delay = 0, strength = 1) {
    ripples.push({
      x,
      y,
      color,
      born: performance.now() + delay,
      life: 1050 + strength * 350,
      maxRadius: Math.min(width, height) * (0.15 + strength * 0.18),
    });
  }

  function emitParticles(x, y, count, options = {}) {
    const available = Math.max(0, maxParticles - particles.length);
    const amount = Math.min(count, available);
    const palette = options.palette || COLORS;
    const minSpeed = options.minSpeed ?? 20;
    const maxSpeed = options.maxSpeed ?? 150;
    for (let index = 0; index < amount; index += 1) {
      const angle = options.angle ?? Math.random() * TAU;
      const spread = options.spread ?? TAU;
      const direction = angle + (Math.random() - 0.5) * spread;
      const speed = lerp(minSpeed, maxSpeed, Math.random());
      particles.push({
        x,
        y,
        vx: Math.cos(direction) * speed + (options.vx || 0),
        vy: Math.sin(direction) * speed + (options.vy || 0),
        age: 0,
        life: lerp(options.minLife || 0.7, options.maxLife || 1.8, Math.random()),
        drag: options.drag ?? 0.965,
        gravity: options.gravity ?? 0,
        size: lerp(options.minSize || 0.8, options.maxSize || 2.8, Math.random()),
        color: palette[Math.floor(Math.random() * palette.length)],
        twinkle: Math.random() * TAU,
        diamond: options.diamond || Math.random() > 0.91,
      });
    }
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += dt;
      if (particle.age >= particle.life) {
        particles.splice(index, 1);
        continue;
      }
      const drag = Math.pow(particle.drag, dt * 60);
      particle.vx *= drag;
      particle.vy = particle.vy * drag + particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.twinkle += dt * 5;
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of particles) {
      const life = 1 - particle.age / particle.life;
      const alpha = life * (0.62 + Math.sin(particle.twinkle) * 0.22);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = particle.color;
      if (particle.diamond) {
        const size = particle.size * (0.7 + life);
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y - size * 2.4);
        ctx.lineTo(particle.x + size, particle.y);
        ctx.lineTo(particle.x, particle.y + size * 2.4);
        ctx.lineTo(particle.x - size, particle.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * life, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function buildWhaleConstellation(centerX, centerY) {
    const scale = whaleScale();
    const nodes = [
      [-112, -2], [-92, -17], [-65, -30], [-30, -38], [6, -40], [42, -35], [75, -25],
      [103, -10], [113, 2], [92, 17], [59, 29], [22, 37], [-17, 34], [-54, 25],
      [-88, 13], [-126, -19], [-151, -30], [-137, 1], [-155, 25], [-122, 15],
      [18, 26], [7, 60], [37, 42], [64, 18], [-12, -31], [-35, -12], [20, 5], [61, -8],
    ];
    birthParticles = nodes.map(([nx, ny], index) => ({
      sx: seed.x + (Math.random() - 0.5) * 24,
      sy: seed.y + (Math.random() - 0.5) * 24,
      tx: centerX + nx * scale,
      ty: centerY + ny * scale,
      delay: 0.18 + index * 0.034 + Math.random() * 0.45,
      size: 1.2 + Math.random() * 2.7,
      phase: Math.random() * TAU,
    }));
  }

  function whaleScale() {
    return clamp(Math.min(width, height) / 690, 0.5, 1.18);
  }

  function whaleHeadReach(scale = whaleScale()) {
    return (whaleSprite.complete && whaleSprite.naturalWidth ? 185 : 90) * scale;
  }

  function whaleTailReach(scale = whaleScale()) {
    return (whaleSprite.complete && whaleSprite.naturalWidth ? 190 : 95) * scale;
  }

  function whaleBodyHalfWidth(scale = whaleScale()) {
    return (whaleSprite.complete && whaleSprite.naturalWidth ? 210 : 100) * scale;
  }

  function triggerAwakening(x, y) {
    phase = "awakening";
    phaseStarted = performance.now();
    seed.x = x;
    seed.y = y;
    whale.x = width * 0.5;
    whale.y = height * 0.44;
    whale.targetX = whale.x;
    whale.targetY = whale.y;
    whale.vx = 0;
    whale.vy = 0;
    whale.reveal = 0;
    setPrompt("Một nhịp thở giữa ngân hà", "Pastie vừa đánh thức người dẫn đường", 3200);
    liveStatus.textContent = "Ngôi sao tỏa sóng ánh sáng và đánh thức một cá voi chòm sao.";
    [0, 180, 390, 660].forEach((delay, index) => addRipple(x, y, COLORS[index], delay, 0.72 + index * 0.18));
    emitParticles(x, y, reducedMotion ? 45 : 115, {
      angle: -Math.PI / 2,
      spread: Math.PI * 0.7,
      minSpeed: 45,
      maxSpeed: 230,
      minLife: 1.2,
      maxLife: 2.7,
      gravity: -18,
    });
    buildWhaleConstellation(whale.x, whale.y);
    audio.ripple();
    audio.whaleCall();
  }

  function enterHunt() {
    phase = "hunt";
    phaseStarted = performance.now();
    whale.reveal = 1;
    whale.targetX = width * 0.62;
    whale.targetY = height * 0.52;
    activateWish();
  }

  function activateWish() {
    const data = wishMap[collected];
    currentWish = {
      index: collected,
      nx: data.nx,
      ny: data.ny,
      escapes: data.escapes,
      escaped: 0,
      selected: false,
      born: performance.now(),
      phase: Math.random() * TAU,
    };
    locateWish(currentWish);
    setPrompt(
      collected === 0 ? "Chạm vào ngôi sao điều ước" : "Ngôi sao tiếp theo đang gọi",
      `${collected} / 5 điều ước đã sáng`,
    );
    liveStatus.textContent = `Ngôi sao điều ước thứ ${collected + 1} đã xuất hiện.`;
  }

  function escapeWish() {
    if (!currentWish || currentWish.escaped >= currentWish.escapes) return false;
    currentWish.escaped += 1;
    const oldX = currentWish.x;
    const oldY = currentWish.y;
    const gutterX = Math.max(62, width * 0.12);
    const gutterY = Math.max(72, height * 0.12);
    currentWish.x = clamp(
      width - oldX + (Math.random() - 0.5) * width * 0.22,
      gutterX,
      width - gutterX,
    );
    currentWish.y = clamp(
      oldY + (Math.random() - 0.5) * height * 0.28,
      gutterY,
      height - gutterY - 90,
    );
    currentWish.nx = currentWish.x / width;
    currentWish.ny = currentWish.y / height;
    addRipple(oldX, oldY, "#ff78bd", 0, 0.55);
    emitParticles(oldX, oldY, reducedMotion ? 18 : 38, {
      palette: ["#ff78bd", "#9a62ff", "#55efff"],
      minSpeed: 55,
      maxSpeed: 165,
      minLife: 0.45,
      maxLife: 1.1,
    });
    audio.chime(4);
    setPrompt("Ơ kìa… ngôi sao biết trốn", "Dẫn cá voi đuổi theo nó", 1800);
    return true;
  }

  function selectWish() {
    if (!currentWish || escapeWish()) return;
    currentWish.selected = true;
    currentWish.approachFacing = currentWish.x >= whale.x ? 1 : -1;
    whale.targetX = currentWish.x - currentWish.approachFacing * whaleHeadReach();
    whale.targetY = currentWish.y;
    setPrompt("Cá voi đang đuổi theo ánh sáng", "Chờ thêm một nhịp nhé", 1400);
  }

  function collectWish(now) {
    if (!currentWish) return;
    const x = currentWish.x;
    const y = currentWish.y;
    const index = currentWish.index;
    emitParticles(x, y, reducedMotion ? 44 : 110, {
      minSpeed: 45,
      maxSpeed: 250,
      minLife: 0.75,
      maxLife: 2.1,
      palette: [COLORS[index], "#ffffff", "#55efff", "#ffd78c"],
    });
    [0, 160, 320].forEach((delay) => addRipple(x, y, COLORS[index], delay, 0.65));
    audio.chime(index);
    collected += 1;
    energyTarget = collected / 5;
    portal.x = x;
    portal.y = y;
    currentWish = null;
    setPrompt(milestoneCopy[index][0], milestoneCopy[index][1], collected === 5 ? 0 : 1850);
    liveStatus.textContent = `${milestoneCopy[index][0]}. Đã thu thập ${collected} trên 5 ngôi sao.`;

    if (collected === 4) {
      if (babyWhales.length === 0) createBabyWhales();
      prepareFinaleArt();
    }
    nextWishAt = now + (reducedMotion ? 520 : 1100);
  }

  function prepareFinaleArt() {
    if (!finaleArt.style.backgroundImage) {
      const image = 'url("assets/birthday-finale.png")';
      finaleBlurArt.style.backgroundImage = image;
      finaleArt.style.backgroundImage = image;
    }
  }

  function bumpMoon() {
    if (moon.hit) return;
    moon.hit = true;
    moon.spin = reducedMotion ? 2.4 : 8.5;
    const moonX = moon.nx * width;
    const moonY = moon.ny * height;
    emitParticles(moonX, moonY, reducedMotion ? 35 : 90, {
      palette: ["#fff3b0", "#ff8dc7", "#74eaff"],
      minSpeed: 55,
      maxSpeed: 230,
      gravity: 18,
      diamond: true,
    });
    addRipple(moonX, moonY, "#ffd78c", 0, 0.75);
    audio.chime(3);
    setPrompt("Ui! Mặt trăng quay tít rồi", "Cá voi giả vờ như không biết gì", 1900);
  }

  function enterPortal() {
    phase = "portal";
    phaseStarted = performance.now();
    hold.active = false;
    hold.progress = 0;
    hold.ready = false;
    portal.x = clamp(portal.x, width * 0.25, width * 0.75);
    portal.y = clamp(portal.y, height * 0.25, height * 0.68);
    buildVortexDust();
    setPrompt("Giữ vào cánh cổng ngân hà", "Đừng buông tay cho đến khi ánh sáng đầy vòng tròn");
    liveStatus.textContent = "Giữ chuột, ngón tay, phím Enter hoặc phím cách để nạp cánh cổng.";
  }

  function buildVortexDust() {
    vortexDust.length = 0;
    const count = reducedMotion ? 90 : 260;
    const maxRadius = Math.hypot(width, height) * 0.56;
    for (let index = 0; index < count; index += 1) {
      vortexDust.push({
        angle: Math.random() * TAU,
        radius: lerp(Math.min(width, height) * 0.12, maxRadius, Math.pow(Math.random(), 0.72)),
        speed: 0.35 + Math.random() * 1.25,
        depth: 0.3 + Math.random() * 0.7,
        size: 0.55 + Math.random() * 2.1,
        phase: Math.random() * TAU,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  function buildWarpStreaks() {
    warpStreaks.length = 0;
    const count = reducedMotion ? 45 : 150;
    for (let index = 0; index < count; index += 1) {
      warpStreaks.push({
        angle: Math.random() * TAU,
        offset: Math.random(),
        speed: 0.55 + Math.random() * 1.8,
        length: 0.035 + Math.random() * 0.12,
        width: 0.45 + Math.random() * 1.7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  function beginHolding(x, y) {
    hold.active = true;
    hold.ready = hold.progress >= 1;
    portal.x = clamp(x, 70, width - 70);
    portal.y = clamp(y, 90, height - 130);
    experience.classList.add("is-charging");
    audio.beginCharge();
    addRipple(portal.x, portal.y, "#ffd78c", 0, 0.8);
    setPrompt("Đang gom ánh sáng…", "Giữ tay ở đó");
  }

  function releaseHolding() {
    if (!hold.active) return;
    hold.active = false;
    experience.classList.remove("is-charging");
    audio.endCharge();
    if (hold.ready) {
      startTransition();
    } else {
      setPrompt("Ánh sáng vẫn đang chờ", "Giữ lâu thêm một chút");
    }
  }

  function startTransition() {
    phase = "transition";
    phaseStarted = performance.now();
    transitionBurst = false;
    transitionReveal = false;
    cameraKick = 0;
    screenFlash = 0;
    hold.progress = 1;
    buildWarpStreaks();
    prepareFinaleArt();
    [finaleBlurArt, finaleArt].forEach((layer) => layer.classList.remove("is-visible", "is-revealing"));
    setPrompt("", "");
    liveStatus.textContent = "Cả tinh vân đang co vào một điểm. Cá voi chuẩn bị lao xuyên cánh cổng.";
  }

  function triggerFinale() {
    phase = "finale";
    phaseStarted = performance.now();
    screenFlash = reducedMotion ? 0.16 : 0.38;
    cameraKick = reducedMotion ? 0 : 0.42;
    prepareFinaleArt();
    [finaleBlurArt, finaleArt].forEach((layer) => {
      layer.classList.remove("is-revealing");
      layer.classList.add("is-visible");
    });
    setPrompt("", "");
    generateTitleParticles();
    fireworks.length = 0;
    finaleEvents.forEach((event) => {
      event.played = false;
    });
    epilogueStarted = false;
    whale.x = -whaleBodyHalfWidth(whaleScale() * 1.3);
    whale.y = height * 0.78;
    whale.vx = width * 0.22;
    whale.vy = -height * 0.03;
    emitParticles(portal.x, portal.y, reducedMotion ? 85 : 240, {
      minSpeed: 110,
      maxSpeed: 540,
      minLife: 1.1,
      maxLife: 3.1,
      drag: 0.982,
      palette: COLORS,
    });
    [0, 100, 220, 380].forEach((delay, index) => {
      addRipple(portal.x, portal.y, COLORS[(index + 1) % COLORS.length], delay, 1.2 + index * 0.2);
    });
    liveStatus.textContent = "Cánh cổng mở. Cả ngân hà đang kết thành lời chúc sinh nhật dành cho Pastie.";
  }

  function generateTitleParticles(settled = false) {
    if (!width || !height) return;
    const portrait = height > width * 1.05;
    const lines = portrait
      ? [
          { text: "HAPPY", size: Math.min(width * 0.15, height * 0.075, 104), y: height * 0.305 },
          { text: "BIRTHDAY", size: Math.min(width * 0.125, height * 0.064, 88), y: height * 0.405 },
          { text: "PASTIE", size: Math.min(width * 0.18, height * 0.098, 136), y: height * 0.515 },
        ]
      : [
          { text: "HAPPY", size: Math.min(width * 0.085, height * 0.09, 92), y: height * 0.27 },
          { text: "BIRTHDAY", size: Math.min(width * 0.072, height * 0.082, 84), y: height * 0.39 },
          { text: "PASTIE", size: Math.min(width * 0.11, height * 0.14, 132), y: height * 0.52 },
        ];
    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    maskContext.strokeStyle = "#fff";
    maskContext.lineJoin = "round";
    maskContext.lineCap = "round";
    maskContext.textAlign = "center";
    maskContext.textBaseline = "middle";
    lines.forEach((line) => {
      maskContext.font = `900 ${line.size}px Arial, sans-serif`;
      maskContext.lineWidth = Math.max(3.2, line.size * 0.055);
      maskContext.strokeText(line.text, width / 2, line.y);
    });

    titleCore = document.createElement("canvas");
    titleCore.width = width;
    titleCore.height = height;
    const coreContext = titleCore.getContext("2d");
    coreContext.textAlign = "center";
    coreContext.textBaseline = "middle";
    coreContext.lineJoin = "round";
    lines.forEach((line, index) => {
      coreContext.font = `900 ${line.size}px Arial, sans-serif`;
      coreContext.fillStyle = index === lines.length - 1 ? "rgba(197, 242, 255, 0.86)" : "rgba(227, 249, 255, 0.78)";
      coreContext.strokeStyle = index === lines.length - 1 ? "rgba(74, 201, 255, 0.92)" : "rgba(156, 196, 255, 0.8)";
      coreContext.lineWidth = Math.max(1.2, line.size * 0.025);
      coreContext.fillText(line.text, width / 2, line.y);
      coreContext.strokeText(line.text, width / 2, line.y);
    });

    const nameLine = lines[lines.length - 1];
    coreContext.font = `900 ${nameLine.size}px Arial, sans-serif`;
    const nameWidth = coreContext.measureText("PASTIE").width;
    titleGlow = document.createElement("canvas");
    titleGlow.width = width;
    titleGlow.height = height;
    const glowContext = titleGlow.getContext("2d");
    glowContext.filter = `blur(${reducedMotion ? 6 : 12}px)`;
    glowContext.drawImage(titleCore, 0, 0);

    const image = maskContext.getImageData(0, 0, width, height).data;
    const step = reducedMotion ? 6 : width < 560 ? 3 : 4;
    const points = [];
    const startY = Math.max(0, Math.floor(lines[0].y - lines[0].size * 0.7));
    const endY = Math.min(height, Math.ceil(nameLine.y + nameLine.size * 0.68));
    const maximum = reducedMotion ? 850 : width < 560 ? 2300 : 3000;
    let previousInRow = -1;

    for (let y = startY; y < endY && points.length < maximum; y += step) {
      previousInRow = -1;
      for (let x = 0; x < width && points.length < maximum; x += step) {
        const alpha = image[(y * width + x) * 4 + 3];
        if (alpha > 62) {
          const point = {
            x: settled ? x : portal.x + (Math.random() - 0.5) * 46,
            y: settled ? y : portal.y + (Math.random() - 0.5) * 46,
            tx: x + (Math.random() - 0.5) * 1.8,
            ty: y + (Math.random() - 0.5) * 1.8,
            vx: (Math.random() - 0.5) * 65,
            vy: (Math.random() - 0.5) * 65,
            delay: settled ? 0 : 0.32 + Math.random() * 0.95,
            size: 0.78 + Math.random() * 1.35,
            phase: Math.random() * TAU,
            link: previousInRow,
          };
          points.push(point);
          previousInRow = points.length - 1;
        } else if (alpha <= 110) {
          previousInRow = -1;
        }
      }
    }

    titleParticles = points;
    titleBounds = {
      left: width / 2 - nameWidth / 2 - 18,
      right: width / 2 + nameWidth / 2 + 18,
      top: nameLine.y - nameLine.size * 0.62,
      bottom: nameLine.y + nameLine.size * 0.7,
    };
  }

  function createBabyWhales() {
    const amount = reducedMotion ? 3 : 5;
    for (let index = 0; index < amount; index += 1) {
      babyWhales.push({
        x: whale.x - 30 - index * 22,
        y: whale.y + 40 + index * 14,
        vx: 0,
        vy: 0,
        phase: Math.random() * TAU,
        scale: 0.13 + Math.random() * 0.07,
        confused: index === 1 ? 1 : 0,
        facing: 1,
      });
    }
  }

  function updateWhale(dt, now) {
    if (phase === "hunt" && currentWish?.selected) {
      whale.targetX = currentWish.x - currentWish.approachFacing * whaleHeadReach();
      whale.targetY = currentWish.y;
    } else if (phase === "portal") {
      const speed = 0.9 + hold.progress * 3.9;
      portal.spin += dt * speed;
      const radiusX = lerp(Math.min(width, height) * 0.2, 72, hold.progress);
      const radiusY = radiusX * 0.48;
      whale.targetX = portal.x + Math.cos(portal.spin) * radiusX;
      whale.targetY = portal.y + Math.sin(portal.spin) * radiusY;
    } else if (phase === "transition") {
      const transitionAge = (now - phaseStarted) / 1000;
      if (transitionAge < 0.52) {
        portal.spin += dt * 8.5;
        const collapse = easeOutCubic(clamp(transitionAge / 0.52, 0, 1));
        const radiusX = lerp(76, 20, collapse);
        whale.targetX = portal.x + Math.cos(portal.spin) * radiusX;
        whale.targetY = portal.y + Math.sin(portal.spin) * radiusX * 0.42;
      } else {
        const launch = easeOutCubic(clamp((transitionAge - 0.52) / 1.05, 0, 1));
        whale.targetX = lerp(portal.x, width * 1.26, launch);
        whale.targetY = lerp(portal.y, -height * 0.18, launch);
      }
    } else if (phase === "finale" || phase === "epilogue") {
      const finaleAge = (now - phaseStarted) / 1000;
      const settle = easeOutCubic(clamp(finaleAge / 2.6, 0, 1));
      const guardianX = width * (height > width ? 0.56 : 0.66);
      const guardianY = height * (height > width ? 0.7 : 0.78);
      const livingX = guardianX + Math.cos(now * 0.00042) * width * 0.035;
      const livingY = guardianY + Math.sin(now * 0.00058) * height * 0.018;
      whale.targetX = lerp(width * 0.18, livingX, settle);
      whale.targetY = lerp(height * 0.81, livingY, settle);
    }

    const dx = whale.targetX - whale.x;
    const dy = whale.targetY - whale.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    const maxSpeed = phase === "transition"
      ? 760
      : phase === "portal"
        ? 320 + hold.progress * 170
        : phase === "finale"
          ? 480
          : 265;
    const arrival = clamp(dist / Math.max(80, Math.min(width, height) * 0.18), 0.12, 1);
    const desiredX = (dx / dist) * maxSpeed * arrival;
    const desiredY = (dy / dist) * maxSpeed * arrival;
    const steer = phase === "transition" ? 5.4 : phase === "portal" ? 3.4 : 2.15;
    whale.vx += (desiredX - whale.vx) * clamp(dt * steer, 0, 1);
    whale.vy += (desiredY - whale.vy) * clamp(dt * steer, 0, 1);
    whale.x += whale.vx * dt;
    whale.y += whale.vy * dt;

    if (phase === "hunt") {
      const marginX = whaleBodyHalfWidth();
      const marginY = 92 * whaleScale();
      whale.x = clamp(whale.x, marginX, width - marginX);
      whale.y = clamp(whale.y, marginY, height - marginY - 52);
    }

    if (phase === "finale" || phase === "epilogue" || (phase === "transition" && now - phaseStarted > 420)) {
      whale.facing = 1;
    } else if (Math.abs(dx) > 22) {
      whale.facing = dx >= 0 ? 1 : -1;
    }
    const desiredTilt = clamp(Math.atan2(dy, Math.max(45, Math.abs(dx))), -0.75, 0.75);
    whale.tilt = lerp(whale.tilt, desiredTilt, clamp(dt * 2.8, 0, 1));
    whale.trailClock += dt;

    if (whale.reveal > 0.35 && whale.trailClock > (reducedMotion ? 0.09 : 0.035)) {
      whale.trailClock = 0;
      const scale = whaleScale();
      const tailX = whale.x - whale.facing * whaleTailReach(scale);
      const tailY = whale.y + Math.sin(now * 0.006) * 12 * scale;
      emitParticles(tailX, tailY, reducedMotion ? 1 : 3, {
        palette: ["#55efff", "#168cff", "#9a62ff"],
        minSpeed: 8,
        maxSpeed: 42,
        vx: -whale.facing * Math.abs(whale.vx) * 0.22,
        minLife: 0.55,
        maxLife: 1.35,
        minSize: 0.5,
        maxSize: 2.1,
        drag: 0.955,
      });
    }

    if (phase === "hunt" && currentWish?.selected) {
      const headX = whale.x + currentWish.approachFacing * whaleHeadReach();
      const headY = whale.y + whale.tilt * 22 * whaleScale();
      if (
        collected === 2 &&
        !moon.hit &&
        distance(headX, headY, moon.nx * width, moon.ny * height) < 48 * whaleScale() + 24
      ) {
        bumpMoon();
      }
      if (distance(headX, headY, currentWish.x, currentWish.y) < 30 + whaleScale() * 18) {
        collectWish(now);
      }
    }
  }

  function updateBabyWhales(dt, now) {
    babyWhales.forEach((baby, index) => {
      let targetX;
      let targetY;
      if (phase === "epilogue" && comets.length) {
        const comet = comets[index % comets.length];
        targetX = comet.x - Math.sign(comet.vx) * (35 + index * 12);
        targetY = comet.y + Math.sin(now * 0.004 + baby.phase) * 26;
      } else if (phase === "finale" || phase === "epilogue") {
        const orbit = now * (0.00024 + index * 0.000014) + baby.phase;
        targetX = width / 2 + Math.cos(orbit * TAU) * width * (0.25 + index * 0.025);
        targetY = height * 0.55 + Math.sin(orbit * TAU) * height * (0.16 + index * 0.01);
      } else if (phase === "hunt" && currentWish && index % 2 === 0) {
        targetX = currentWish.x - 24 - index * 8;
        targetY = currentWish.y + Math.sin(now * 0.005 + baby.phase) * 34;
      } else if (baby.confused > 0 && now % 9000 < 1800) {
        targetX = width - whale.x;
        targetY = height - whale.y;
      } else {
        targetX = whale.x - whale.facing * (85 + index * 38) * whaleScale();
        targetY = whale.y + Math.sin(now * 0.0018 + baby.phase) * (52 + index * 9);
      }
      const dx = targetX - baby.x;
      const dy = targetY - baby.y;
      baby.vx += dx * dt * 1.7;
      baby.vy += dy * dt * 1.7;
      baby.vx *= Math.pow(0.935, dt * 60);
      baby.vy *= Math.pow(0.935, dt * 60);
      baby.x += baby.vx * dt;
      baby.y += baby.vy * dt;
      if (Math.abs(dx) > 5) baby.facing = dx >= 0 ? 1 : -1;
    });
  }

  function updateRipples(now) {
    for (let index = ripples.length - 1; index >= 0; index -= 1) {
      if (now - ripples[index].born > ripples[index].life) ripples.splice(index, 1);
    }
  }

  function updateTitle(dt, now) {
    if (!titleParticles.length) return;
    const age = (now - phaseStarted) / 1000;
    for (const particle of titleParticles) {
      if (age < particle.delay) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= Math.pow(0.97, dt * 60);
        particle.vy *= Math.pow(0.97, dt * 60);
        continue;
      }
      particle.vx += (particle.tx - particle.x) * dt * 22;
      particle.vy += (particle.ty - particle.y) * dt * 22;
      const damping = Math.pow(0.86, dt * 60);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.phase += dt * 3.5;
    }
  }

  function spawnFirework(x, y, style = "burst", depth = 1) {
    const requested = reducedMotion ? 24 : style === "burst" ? 74 : 96;
    const count = Math.max(0, Math.min(requested, 800 - fireworks.length));
    if (!count) return;
    const palette = COLORS.slice();
    if (style === "spiral") {
      for (let index = 0; index < count; index += 1) {
        const arm = index % 2;
        const angle = (index / count) * Math.PI * 5 + arm * Math.PI;
        const speed = 45 + (index / count) * 220;
        fireworks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 1.8 + Math.random() * 1.2,
          color: palette[index % palette.length],
          size: (1.1 + Math.random() * 2.2) * depth,
          trail: [],
        });
      }
    } else if (style === "tail") {
      for (let index = 0; index < count; index += 1) {
        const side = index % 2 ? 1 : -1;
        const progress = (index / count) * Math.PI;
        const vx = side * (50 + Math.sin(progress) * 210);
        const vy = -175 + Math.cos(progress) * 155 + Math.random() * 26;
        fireworks.push({
          x,
          y,
          vx,
          vy,
          age: 0,
          life: 1.45 + Math.random() * 0.9,
          color: palette[(index + 2) % palette.length],
          size: (1.1 + Math.random() * 2.2) * depth,
          trail: [],
        });
      }
    } else {
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * TAU + Math.random() * 0.08;
        const speed = (85 + Math.random() * 245) * depth;
        fireworks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 1.15 + Math.random() * 1.3,
          color: palette[Math.floor(Math.random() * palette.length)],
          size: (0.9 + Math.random() * 2.4) * depth,
          trail: [],
        });
      }
    }
  }

  function spawnWhalePod(x, y) {
    const amount = Math.max(0, Math.min(reducedMotion ? 4 : 8, 28 - zoomWhales.length));
    for (let index = 0; index < amount; index += 1) {
      zoomWhales.push({
        x: x + (Math.random() - 0.5) * width * 0.45,
        y: y + (Math.random() - 0.5) * height * 0.3,
        age: 0,
        life: 1.6 + Math.random() * 0.8,
        scale: 0.04 + Math.random() * 0.06,
        speed: 0.4 + Math.random() * 0.65,
        facing: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  function spawnComet() {
    if (comets.length >= (reducedMotion ? 1 : 3)) return;
    const fromLeft = Math.random() > 0.5;
    const speed = 115 + Math.random() * 85;
    comets.push({
      x: fromLeft ? -40 : width + 40,
      y: height * (0.16 + Math.random() * 0.54),
      vx: (fromLeft ? 1 : -1) * speed,
      vy: -22 - Math.random() * 32,
      age: 0,
      life: width / speed + 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      trail: [],
    });
  }

  function updateFireworks(dt) {
    for (let index = fireworks.length - 1; index >= 0; index -= 1) {
      const particle = fireworks[index];
      particle.age += dt;
      if (particle.age >= particle.life) {
        fireworks.splice(index, 1);
        continue;
      }
      if (!reducedMotion && particle.trail.length < 4) {
        particle.trail.unshift({ x: particle.x, y: particle.y });
      } else if (!reducedMotion) {
        particle.trail.pop();
        particle.trail.unshift({ x: particle.x, y: particle.y });
      }
      particle.vx *= Math.pow(0.975, dt * 60);
      particle.vy = particle.vy * Math.pow(0.975, dt * 60) + 14 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }

    for (let index = zoomWhales.length - 1; index >= 0; index -= 1) {
      const item = zoomWhales[index];
      item.age += dt;
      item.scale += dt * item.speed;
      item.y -= dt * 25;
      if (item.age >= item.life) zoomWhales.splice(index, 1);
    }

    for (let index = comets.length - 1; index >= 0; index -= 1) {
      const comet = comets[index];
      comet.age += dt;
      comet.trail.unshift({ x: comet.x, y: comet.y });
      if (comet.trail.length > (reducedMotion ? 4 : 11)) comet.trail.pop();
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      if (comet.age >= comet.life) comets.splice(index, 1);
    }
  }

  function update(dt, now) {
    energy = lerp(energy, energyTarget, clamp(dt * 0.9, 0, 1));
    updateParticles(dt);
    updateRipples(now);
    updateFireworks(dt);
    moon.rotation += moon.spin * dt;
    moon.spin *= Math.pow(0.975, dt * 60);
    screenFlash = Math.max(0, screenFlash - dt * 0.8);
    cameraKick = Math.max(0, cameraKick - dt * 0.72);

    if (phase === "awakening") {
      const duration = reducedMotion ? 1800 : 3900;
      const age = now - phaseStarted;
      whale.reveal = clamp((age - duration * 0.24) / (duration * 0.58), 0, 1);
      if (age >= duration) enterHunt();
    }

    if (phase !== "seed" && phase !== "awakening") {
      updateWhale(dt, now);
      updateBabyWhales(dt, now);
    }

    if (phase === "hunt" && !currentWish && nextWishAt && now >= nextWishAt) {
      nextWishAt = 0;
      if (collected >= 5) enterPortal();
      else activateWish();
    }

    if (phase === "portal") {
      if (hold.active) {
        hold.progress = clamp(hold.progress + dt / (reducedMotion ? 0.9 : 1.75), 0, 1);
        audio.updateCharge(hold.progress);
        if (hold.progress >= 1 && !hold.ready) {
          hold.ready = true;
          screenFlash = 0.24;
          if (navigator.vibrate) navigator.vibrate(28);
          setPrompt("Ánh sáng đã đầy", "Thả tay để mở cả ngân hà");
        }
      } else if (!hold.ready) {
        hold.progress = Math.max(0, hold.progress - dt * 0.12);
      }
    }

    if (phase === "transition") {
      const age = (now - phaseStarted) / 1000;
      const burstAt = reducedMotion ? 0.24 : 0.52;
      const revealAt = reducedMotion ? 0.42 : 0.92;
      const finishAt = reducedMotion ? 1.15 : 2.75;
      hold.progress = age < burstAt ? 1 - easeOutCubic(age / burstAt) * 0.72 : 0;
      portal.spin += dt * (8 + age * 7);

      if (!transitionBurst && age >= burstAt) {
        transitionBurst = true;
        screenFlash = reducedMotion ? 0.42 : 1.72;
        cameraKick = reducedMotion ? 0 : 1.55;
        [finaleBlurArt, finaleArt].forEach((layer) => layer.classList.add("is-revealing"));
        emitParticles(portal.x, portal.y, reducedMotion ? 75 : 230, {
          minSpeed: 170,
          maxSpeed: 720,
          minLife: 0.8,
          maxLife: 2.4,
          drag: 0.985,
          palette: ["#ffffff", "#55efff", "#9a62ff", "#ffd78c"],
        });
        [0, 110, 240].forEach((delay, index) => {
          addRipple(portal.x, portal.y, COLORS[(index + 1) % COLORS.length], delay, 1.8 + index * 0.35);
        });
        audio.finale();
      }

      if (!transitionReveal && age >= revealAt) {
        transitionReveal = true;
        [finaleBlurArt, finaleArt].forEach((layer) => {
          layer.classList.remove("is-revealing");
          layer.classList.add("is-visible");
        });
      }

      if (age >= finishAt) triggerFinale();
    }

    if (phase === "finale" || phase === "epilogue") {
      updateTitle(dt, now);
      const age = (now - phaseStarted) / 1000;
      finaleEvents.forEach((event, index) => {
        if (age >= event.time && !event.played) {
          event.played = true;
          spawnFirework(width * event.nx, height * event.ny, event.style, event.depth);
          audio.chime(index % 5);
        }
      });

      if (age > 4.6 && !epilogueStarted) {
        epilogueStarted = true;
        phase = "epilogue";
        setPrompt("Chạm vào Pastie", "Mỗi lần chạm là một phép màu khác", 6500);
        liveStatus.textContent = "Happy Birthday Pastie. Chạm vào tên Pastie để tạo thêm pháo hoa.";
      }
      if (phase === "epilogue" && now - lastCometAt > (reducedMotion ? 3600 : 1900)) {
        lastCometAt = now;
        spawnComet();
      }
    }
  }

  function drawSpace(now) {
    const transitionMode = phase === "transition";
    const finalMode = transitionMode || phase === "finale" || phase === "epilogue";
    const transitionAge = transitionMode ? (now - phaseStarted) / 1000 : 0;
    const darkness = phase === "seed"
      ? 0.91
      : transitionMode
        ? lerp(0.65, 0.12, clamp((transitionAge - 0.6) / 1.35, 0, 1))
        : finalMode
          ? 0.16
          : 0.69 - energy * 0.14;
    ctx.fillStyle = `rgba(1, 4, 15, ${darkness})`;
    ctx.fillRect(0, 0, width, height);

    if (cosmicBackdrop) {
      const backdropAlpha = phase === "seed" ? 0.24 : finalMode ? 0.72 : 0.4 + energy * 0.3;
      const driftX = Math.sin(now * 0.000045) * 7;
      const driftY = Math.cos(now * 0.000038) * 6;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = backdropAlpha;
      ctx.drawImage(cosmicBackdrop, -10 + driftX, -10 + driftY, width + 20, height + 20);
      ctx.restore();
    }

    const parallaxX = (pointer.x - width / 2) / width;
    const parallaxY = (pointer.y - height / 2) / height;
    const visibility = phase === "seed" ? 0.48 : 0.7 + energy * 0.36;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const star of stars) {
      let x = star.nx * width + parallaxX * 12 * star.z;
      let y = star.ny * height + parallaxY * 10 * star.z;
      const originalX = x;
      const originalY = y;
      if (phase === "portal" && hold.progress > 0.02) {
        const dx = portal.x - x;
        const dy = portal.y - y;
        const proximity = 1 - clamp(Math.hypot(dx, dy) / Math.hypot(width, height), 0, 1);
        const pull = hold.progress * hold.progress * (0.05 + proximity * 0.18);
        x += dx * pull;
        y += dy * pull;
        ctx.strokeStyle = `hsla(${star.hue}, 100%, 76%, ${hold.progress * 0.2})`;
        ctx.lineWidth = Math.max(0.35, star.size * 0.45);
        ctx.beginPath();
        ctx.moveTo(originalX, originalY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      if (transitionMode && transitionAge < 1.75 && !reducedMotion) {
        const dx = x - portal.x;
        const dy = y - portal.y;
        const boost = easeOutCubic(clamp((transitionAge - 0.45) / 1.3, 0, 1)) * 0.58;
        x += dx * boost;
        y += dy * boost;
        ctx.strokeStyle = `hsla(${star.hue}, 95%, 78%, ${0.38 * visibility})`;
        ctx.lineWidth = Math.max(0.5, star.size * 0.85);
        ctx.beginPath();
        ctx.moveTo(originalX, originalY);
        ctx.lineTo(x + dx * 0.16, y + dy * 0.16);
        ctx.stroke();
      }
      const alpha = visibility * (0.34 + Math.sin(now * 0.001 * star.speed + star.phase) * 0.27);
      ctx.fillStyle = `hsla(${star.hue}, 100%, 78%, ${Math.max(0.08, alpha)})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size * (finalMode ? 1.15 : 1), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    drawNebula(finalMode ? Math.max(energy, 1) : Math.max(0.14, energy), now);
  }

  function drawNebula(amount, now) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const bloom = phase === "transition"
      ? 1 + clamp((performance.now() - phaseStarted) / 1700, 0, 1) * 1.7
      : phase === "finale" || phase === "epilogue"
        ? 1.45
        : 1;
    const clouds = [
      [0.17, 0.36, 0.42, "64, 63, 255", 0.18],
      [0.82, 0.62, 0.48, "176, 42, 255", 0.16],
      [0.54, 0.18, 0.32, "0, 174, 255", 0.14],
      [0.48, 0.82, 0.4, "255, 71, 176", 0.1],
    ];
    clouds.forEach((cloud, index) => {
      const driftX = Math.sin(now * 0.00008 + index) * width * 0.025;
      const driftY = Math.cos(now * 0.00007 + index) * height * 0.018;
      const x = cloud[0] * width + driftX;
      const y = cloud[1] * height + driftY;
      const radius = Math.max(width, height) * cloud[2] * bloom;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${cloud[3]}, ${cloud[4] * amount})`);
      gradient.addColorStop(0.38, `rgba(${cloud[3]}, ${cloud[4] * amount * 0.38})`);
      gradient.addColorStop(1, `rgba(${cloud[3]}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
    ctx.restore();
  }

  function drawPlanets(now) {
    if (energy < 0.23) return;
    const appearance = clamp((energy - 0.23) / 0.2, 0, 1);
    const planets = [
      { nx: 0.12, ny: 0.19, r: 29, colors: ["#132c60", "#6d8bdc"] },
      { nx: 0.88, ny: 0.72, r: 38, colors: ["#321b50", "#d271ad"] },
      { nx: 0.68, ny: 0.13, r: 15, colors: ["#183d65", "#37b9cf"] },
    ];

    ctx.save();
    planets.forEach((planet, index) => {
      const x = planet.nx * width;
      const y = planet.ny * height;
      const radius = planet.r * clamp(Math.min(width, height) / 600, 0.65, 1.25) * appearance;
      const gradient = ctx.createRadialGradient(
        x - radius * 0.35,
        y - radius * 0.38,
        radius * 0.06,
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, planet.colors[1]);
      gradient.addColorStop(0.5, planet.colors[0]);
      gradient.addColorStop(1, "#01030a");
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.5 + energy * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
      if (index === 1) {
        ctx.strokeStyle = "rgba(255, 187, 217, 0.42)";
        ctx.lineWidth = Math.max(1, radius * 0.09);
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 1.8, radius * 0.42, -0.26, 0, TAU);
        ctx.stroke();
      }
    });

    const moonX = moon.nx * width;
    const moonY = moon.ny * height;
    const moonRadius = 32 * clamp(Math.min(width, height) / 600, 0.7, 1.2) * appearance;
    ctx.translate(moonX, moonY);
    ctx.rotate(moon.rotation);
    const moonGradient = ctx.createRadialGradient(-moonRadius * 0.35, -moonRadius * 0.4, 1, 0, 0, moonRadius);
    moonGradient.addColorStop(0, "rgba(245, 253, 255, 0.92)");
    moonGradient.addColorStop(0.48, "rgba(116, 170, 214, 0.74)");
    moonGradient.addColorStop(1, "rgba(18, 32, 67, 0.65)");
    ctx.fillStyle = moonGradient;
    ctx.beginPath();
    ctx.arc(0, 0, moonRadius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(3, 15, 38, 0.24)";
    [[-0.28, -0.12, 0.16], [0.3, 0.22, 0.22], [0.14, -0.35, 0.1]].forEach((crater) => {
      ctx.beginPath();
      ctx.arc(crater[0] * moonRadius, crater[1] * moonRadius, crater[2] * moonRadius, 0, TAU);
      ctx.fill();
    });
    ctx.restore();

    if (energy > 0.43) drawOrbits(now, clamp((energy - 0.43) / 0.2, 0, 1));
  }

  function drawOrbits(now, alpha) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.12);
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < 4; index += 1) {
      const rx = width * (0.19 + index * 0.105);
      const ry = height * (0.08 + index * 0.045);
      ctx.strokeStyle = `rgba(${index % 2 ? "161, 99, 255" : "61, 218, 255"}, ${0.12 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, index * 0.08, 0, TAU);
      ctx.stroke();
      const angle = now * (0.00022 + index * 0.000035) + index * 1.7;
      const px = Math.cos(angle) * rx;
      const py = Math.sin(angle) * ry;
      ctx.fillStyle = index % 2 ? "#b16bff" : "#66efff";
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, 1.6 + index * 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRipples(now) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ripple of ripples) {
      if (now < ripple.born) continue;
      const progressValue = clamp((now - ripple.born) / ripple.life, 0, 1);
      const radius = easeOutCubic(progressValue) * ripple.maxRadius;
      ctx.globalAlpha = Math.pow(1 - progressValue, 2) * 0.74;
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 1.5 + (1 - progressValue) * 1.4;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, radius, radius * 0.34, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGlowStar(x, y, radius, color, pulse = 1) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 4.8);
    gradient.addColorStop(0, "rgba(255,255,255,0.98)");
    gradient.addColorStop(0.12, color);
    gradient.addColorStop(0.4, color.replace("#", "#") + "55");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = pulse;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 4.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 2.6);
    ctx.lineTo(x + radius * 0.52, y - radius * 0.5);
    ctx.lineTo(x + radius * 2.6, y);
    ctx.lineTo(x + radius * 0.52, y + radius * 0.5);
    ctx.lineTo(x, y + radius * 2.6);
    ctx.lineTo(x - radius * 0.52, y + radius * 0.5);
    ctx.lineTo(x - radius * 2.6, y);
    ctx.lineTo(x - radius * 0.52, y - radius * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSeed(now) {
    const pulse = 0.83 + Math.sin(now * 0.0024) * 0.17;
    drawGlowStar(seed.x, seed.y, 4.5 + pulse * 1.8, "#21dfff", pulse);
    ctx.save();
    ctx.strokeStyle = `rgba(61, 220, 255, ${0.1 + pulse * 0.13})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(seed.x, seed.y + 4, 34 + pulse * 8, 9 + pulse * 2, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawWish(now) {
    if (!currentWish) return;
    const born = clamp((now - currentWish.born) / 650, 0, 1);
    const pulse = 0.78 + Math.sin(now * 0.004 + currentWish.phase) * 0.22;
    const radius = (5.2 + currentWish.index * 0.45) * easeOutCubic(born);
    drawGlowStar(currentWish.x, currentWish.y, radius, COLORS[currentWish.index], pulse);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(105, 234, 255, ${0.16 * born})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ctx.beginPath();
    ctx.arc(currentWish.x, currentWish.y, 24 + pulse * 8, now * 0.0003, now * 0.0003 + Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
  }

  function drawWhaleVector(x, y, scale, facing, tilt, alpha, now, constellationOnly = false) {
    if (alpha <= 0) return;
    const swimPhase = now * 0.0065;
    const spineY = (localX) => {
      const transmission = clamp((108 - localX) / 224, 0, 1);
      return Math.sin(swimPhase - transmission * 2.65) * (1.2 + transmission * 10.8);
    };
    const tailY = spineY(-110);
    const tailTipY = Math.sin(swimPhase - 3.25) * 16;
    const fin = Math.sin(now * 0.0042 + 0.7) * 7 + tilt * 7;
    ctx.save();
    ctx.translate(x, y + Math.sin(now * 0.0017) * 3 * scale);
    ctx.rotate(facing === 1 ? tilt : -tilt);
    ctx.scale(facing * scale, scale);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";

    if (!constellationOnly) {
      const spine = [
        { x: 115, y: spineY(115), half: 16 },
        { x: 91, y: spineY(91), half: 31 },
        { x: 57, y: spineY(57), half: 39 },
        { x: 17, y: spineY(17), half: 43 },
        { x: -27, y: spineY(-27), half: 38 },
        { x: -67, y: spineY(-67), half: 27 },
        { x: -106, y: tailY, half: 8 },
      ];
      const top = spine.map((point) => ({ x: point.x, y: point.y - point.half }));
      const bottom = spine.map((point) => ({ x: point.x, y: point.y + point.half })).reverse();
      const body = new Path2D();
      body.moveTo(top[0].x, top[0].y);
      for (let index = 1; index < top.length - 1; index += 1) {
        const midpointX = (top[index].x + top[index + 1].x) / 2;
        const midpointY = (top[index].y + top[index + 1].y) / 2;
        body.quadraticCurveTo(top[index].x, top[index].y, midpointX, midpointY);
      }
      body.lineTo(top[top.length - 1].x, top[top.length - 1].y);
      body.quadraticCurveTo(-120, tailY, bottom[0].x, bottom[0].y);
      for (let index = 1; index < bottom.length - 1; index += 1) {
        const midpointX = (bottom[index].x + bottom[index + 1].x) / 2;
        const midpointY = (bottom[index].y + bottom[index + 1].y) / 2;
        body.quadraticCurveTo(bottom[index].x, bottom[index].y, midpointX, midpointY);
      }
      body.lineTo(bottom[bottom.length - 1].x, bottom[bottom.length - 1].y);
      body.quadraticCurveTo(132, spineY(115), top[0].x, top[0].y);
      body.closePath();

      const gradient = ctx.createLinearGradient(-120, -30, 120, 28);
      gradient.addColorStop(0, "rgba(20, 108, 210, 0.16)");
      gradient.addColorStop(0.48, "rgba(17, 171, 255, 0.32)");
      gradient.addColorStop(1, "rgba(77, 234, 255, 0.46)");
      ctx.fillStyle = gradient;
      ctx.strokeStyle = "rgba(100, 238, 255, 0.92)";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#168cff";
      ctx.shadowBlur = 18;
      ctx.fill(body);
      ctx.stroke(body);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(36, 156, 255, 0.25)";
      ctx.strokeStyle = "rgba(101, 232, 255, 0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-106, tailY);
      ctx.bezierCurveTo(-132, -10 + tailTipY, -151, -34 + tailTipY, -166, -29 + tailTipY);
      ctx.bezierCurveTo(-162, -11 + tailTipY, -146, 2 + tailTipY, -116, 8 + tailY);
      ctx.bezierCurveTo(-145, 10 + tailTipY, -160, 30 + tailTipY, -164, 44 + tailTipY);
      ctx.bezierCurveTo(-142, 44 + tailTipY, -124, 25 + tailY, -106, tailY);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(25, 155, 255, 0.23)";
      ctx.beginPath();
      ctx.moveTo(19, spineY(19) + 26);
      ctx.bezierCurveTo(7, 44 + fin, 4, 68 + fin, 13, 75 + fin);
      ctx.bezierCurveTo(36, 59 + fin, 48, spineY(48) + 39, 51, spineY(51) + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(165, 245, 255, 0.52)";
      ctx.lineWidth = 1;
      for (let index = 0; index < 6; index += 1) {
        ctx.beginPath();
        const lineX = 46 + index * 8;
        ctx.moveTo(lineX, spineY(lineX) - 28 + index * 1.9);
        ctx.quadraticCurveTo(79 + index * 4, spineY(79) + 4, 79 + index * 5, spineY(79) + 25 - index * 1.2);
        ctx.stroke();
      }
      ctx.fillStyle = "#d9ffff";
      ctx.beginPath();
      ctx.arc(85, spineY(85) - 12, 2.6, 0, TAU);
      ctx.fill();
    }

    const rawNodes = [
      [-111, 1], [-84, -17], [-52, -31], [-12, -39], [28, -39], [66, -28], [101, -11],
      [95, 12], [62, 29], [24, 36], [-17, 32], [-58, 22], [-91, 10], [-151, -28],
      [-155, 38], [9, 28], [13, 66 + fin], [48, 23], [-22, -7], [29, 4], [69, -4],
    ];
    const nodes = rawNodes.map(([nodeX, nodeY]) => [
      nodeX,
      nodeY + (nodeX < -125 ? tailTipY : spineY(nodeX)),
    ]);
    const links = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,0],[0,13],[0,14],[10,15],[15,16],[15,17],[2,18],[18,19],[19,20],[20,6],[18,10]];
    ctx.strokeStyle = constellationOnly ? "rgba(102, 236, 255, 0.74)" : "rgba(113, 235, 255, 0.28)";
    ctx.lineWidth = constellationOnly ? 2.2 : 0.75;
    links.forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(nodes[from][0], nodes[from][1]);
      ctx.lineTo(nodes[to][0], nodes[to][1]);
      ctx.stroke();
    });
    nodes.forEach((node, index) => {
      const glow = index % 5 === 0 ? 2.5 : 1.45;
      ctx.fillStyle = index % 4 ? "#65eaff" : "#ffffff";
      ctx.beginPath();
      ctx.arc(node[0], node[1], glow, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawWhaleSprite(x, y, scale, facing, tilt, alpha, now) {
    const sourceX = 26;
    const sourceY = 154;
    const sourceWidth = 1623;
    const sourceHeight = 683;
    const displayWidth = 420 * scale;
    const displayHeight = displayWidth * (sourceHeight / sourceWidth);
    const swim = now * 0.0056;

    ctx.save();
    ctx.translate(x, y + Math.sin(now * 0.0017) * 4 * scale);
    ctx.rotate(facing === 1 ? tilt : -tilt);
    ctx.scale(facing, 1);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * 0.2;
    ctx.filter = `blur(${Math.max(5, 10 * scale)}px)`;
    ctx.drawImage(
      whaleSprite,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -displayWidth / 2,
      -displayHeight / 2,
      displayWidth,
      displayHeight,
    );
    ctx.restore();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha * (reducedMotion ? 1 : 0.28);
    ctx.drawImage(
      whaleSprite,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -displayWidth / 2,
      -displayHeight / 2,
      displayWidth,
      displayHeight,
    );

    if (!reducedMotion) {
      const slices = 12;
      ctx.globalAlpha = alpha * 0.82;
      for (let index = 0; index < slices; index += 1) {
        const normalized = index / (slices - 1);
        const tailInfluence = Math.pow(1 - normalized, 1.75);
        const sliceSourceWidth = sourceWidth / slices;
        const sliceDisplayWidth = displayWidth / slices;
        const offsetY = Math.sin(swim - tailInfluence * 2.6) * 8.5 * scale * tailInfluence;
        ctx.drawImage(
          whaleSprite,
          sourceX + index * sliceSourceWidth,
          sourceY,
          sliceSourceWidth + 2,
          sourceHeight,
          -displayWidth / 2 + index * sliceDisplayWidth - 0.6,
          -displayHeight / 2 + offsetY,
          sliceDisplayWidth + 1.5,
          displayHeight,
        );
      }
    }

    ctx.restore();
  }

  function drawWhale(x, y, scale, facing, tilt, alpha, now, constellationOnly = false) {
    if (constellationOnly || !whaleSprite.complete || !whaleSprite.naturalWidth) {
      drawWhaleVector(x, y, scale, facing, tilt, alpha, now, constellationOnly);
      return;
    }
    drawWhaleSprite(x, y, scale, facing, tilt, alpha, now);
  }

  function drawBirth(now) {
    const age = (now - phaseStarted) / 1000;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    birthParticles.forEach((particle) => {
      const local = clamp((age - particle.delay) / 1.65, 0, 1);
      if (local <= 0) return;
      const eased = 1 - Math.pow(1 - local, 4);
      const bend = Math.sin(local * Math.PI) * (40 + particle.phase * 5);
      const x = lerp(particle.sx, particle.tx, eased) + Math.cos(particle.phase) * bend;
      const y = lerp(particle.sy, particle.ty, eased) - Math.sin(particle.phase) * bend - Math.sin(local * Math.PI) * 72;
      ctx.globalAlpha = 0.5 + local * 0.5;
      ctx.fillStyle = local > 0.75 ? "#ffffff" : "#42dfff";
      ctx.beginPath();
      ctx.arc(x, y, particle.size * (0.7 + local * 0.45), 0, TAU);
      ctx.fill();
    });
    ctx.restore();
    drawWhale(whale.x, whale.y, whaleScale() * 1.18, 1, -0.18, whale.reveal, now, whale.reveal < 0.55);
  }

  function drawPortal(now) {
    const base = Math.min(width, height);
    const transitionAge = phase === "transition" ? (now - phaseStarted) / 1000 : 0;
    const collapse = phase === "transition" ? 1 - easeOutCubic(clamp(transitionAge / 0.54, 0, 1)) : 1;
    const charge = phase === "transition" ? 1 : hold.progress;
    const radius = base * (0.07 + charge * 0.072) * Math.max(0.08, collapse);

    if (charge > 0.05) {
      ctx.save();
      const vignetteRadius = Math.max(width, height) * 0.78;
      const vignette = ctx.createRadialGradient(portal.x, portal.y, radius, portal.x, portal.y, vignetteRadius);
      vignette.addColorStop(0, "rgba(0, 4, 18, 0)");
      vignette.addColorStop(0.42, `rgba(1, 2, 18, ${charge * 0.08})`);
      vignette.addColorStop(1, `rgba(0, 1, 10, ${charge * 0.48})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.globalCompositeOperation = "lighter";

    for (const mote of vortexDust) {
      const spiral = mote.angle + portal.spin * mote.speed * (1.2 + charge * 4.8) + Math.sin(now * 0.0009 + mote.phase) * 0.18;
      const compressedRadius = mote.radius * (1 - charge * 0.76) * Math.max(0.025, collapse);
      const x = Math.cos(spiral) * compressedRadius;
      const y = Math.sin(spiral) * compressedRadius * (0.42 + mote.depth * 0.14);
      const previousAngle = spiral - (0.012 + charge * 0.045) * mote.speed;
      const previousX = Math.cos(previousAngle) * (compressedRadius + 5 + charge * 12);
      const previousY = Math.sin(previousAngle) * (compressedRadius + 5 + charge * 12) * (0.42 + mote.depth * 0.14);
      ctx.globalAlpha = (0.22 + charge * 0.66) * mote.depth * collapse;
      ctx.strokeStyle = mote.color;
      ctx.lineWidth = Math.max(0.45, mote.size * 0.72);
      ctx.beginPath();
      ctx.moveTo(previousX, previousY);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (mote.size > 1.5) {
        ctx.fillStyle = mote.color;
        ctx.beginPath();
        ctx.arc(x, y, mote.size * 0.62, 0, TAU);
        ctx.fill();
      }
    }

    ctx.globalAlpha = collapse;
    for (let index = 0; index < 12; index += 1) {
      const spin = portal.spin * (index % 2 ? -1 : 1) + index * 0.62;
      const ringRadius = radius + index * (5 + charge * 2.6);
      const ringColor = index > 8 && charge > 0.72
        ? "255, 215, 140"
        : index % 2
          ? "173, 102, 255"
          : "75, 230, 255";
      ctx.strokeStyle = `rgba(${ringColor}, ${0.12 + charge * 0.2})`;
      ctx.lineWidth = 0.8 + (index % 4) * 0.65 + charge * 0.7;
      ctx.setLineDash(index % 3 === 0 ? [5 + index, 8 + index] : []);
      ctx.lineDashOffset = -spin * (18 + charge * 14);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, ringRadius * (0.28 + index * 0.018), spin * 0.055, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const glow = ctx.createRadialGradient(0, 0, radius * 0.04, 0, 0, radius * 2.25);
    glow.addColorStop(0, charge > 0.82 ? "rgba(255, 251, 223, 1)" : "rgba(0, 2, 15, 0.95)");
    glow.addColorStop(0.11, `rgba(255, 242, 196, ${0.16 + charge * 0.76})`);
    glow.addColorStop(0.24, `rgba(74, 232, 255, ${0.34 + charge * 0.52})`);
    glow.addColorStop(0.52, `rgba(135, 75, 255, ${0.18 + charge * 0.28})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.25, 0, TAU);
    ctx.fill();

    for (let index = 0; index < 5; index += 1) {
      const angle = now * 0.001 * (0.7 + charge * 4.6) + (index / 5) * TAU;
      const orbit = radius * (1.46 - charge * 0.62);
      const starX = Math.cos(angle) * orbit;
      const starY = Math.sin(angle) * orbit * 0.42;
      ctx.strokeStyle = `rgba(126, 231, 255, ${0.12 + charge * 0.22})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(starX, starY);
      ctx.quadraticCurveTo(starX * 0.42 - Math.sin(angle) * 18, starY * 0.32, 0, 0);
      ctx.stroke();
      drawGlowStar(starX, starY, 2.8 + charge * 0.8, COLORS[index], 0.84 * collapse);
    }

    if (phase === "portal") {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.58 + charge * 0.38})`;
      ctx.lineWidth = 2.6 + charge * 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 15, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTransition(now) {
    if (phase !== "transition") return;
    const age = (now - phaseStarted) / 1000;
    const burstProgress = clamp((age - (reducedMotion ? 0.18 : 0.48)) / (reducedMotion ? 0.55 : 1.25), 0, 1);
    if (burstProgress > 0) {
      const maxRadius = Math.hypot(width, height) * 0.78;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const streak of warpStreaks) {
        const travel = (streak.offset + burstProgress * streak.speed) % 1;
        const radius = easeOutCubic(travel) * maxRadius;
        const tailRadius = Math.max(0, radius - maxRadius * streak.length * (0.35 + burstProgress));
        const cos = Math.cos(streak.angle);
        const sin = Math.sin(streak.angle);
        ctx.globalAlpha = Math.sin(travel * Math.PI) * (0.22 + burstProgress * 0.7);
        ctx.strokeStyle = streak.color;
        ctx.lineWidth = streak.width * (0.7 + travel * 1.8);
        ctx.beginPath();
        ctx.moveTo(portal.x + cos * tailRadius, portal.y + sin * tailRadius);
        ctx.lineTo(portal.x + cos * radius, portal.y + sin * radius);
        ctx.stroke();
      }

      const shockRadius = easeOutCubic(burstProgress) * maxRadius;
      ctx.globalAlpha = Math.pow(1 - burstProgress, 1.7) * 0.9;
      ctx.strokeStyle = "#d8fbff";
      ctx.lineWidth = 5 + (1 - burstProgress) * 8;
      ctx.beginPath();
      ctx.arc(portal.x, portal.y, shockRadius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    if (!reducedMotion && age > 0.42 && age < 0.54) {
      const impact = Math.sin(((age - 0.42) / 0.12) * Math.PI);
      ctx.fillStyle = `rgba(0, 0, 7, ${impact * 0.72})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawProgress(now) {
    if (phase !== "hunt" && phase !== "portal") return;
    const spacing = 20;
    const startX = width / 2 - spacing * 2;
    const y = Math.max(34, height * 0.055);
    for (let index = 0; index < 5; index += 1) {
      const active = index < collected;
      const pulse = active ? 0.8 + Math.sin(now * 0.003 + index) * 0.2 : 0.25;
      drawGlowStar(startX + index * spacing, y, active ? 2.05 : 1.05, active ? COLORS[index] : "#426079", pulse);
    }
  }

  function drawTitle(now) {
    if (!titleParticles.length) return;
    const age = (now - phaseStarted) / 1000;
    if (titleGlow && age > 0.28) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp((age - 0.28) * 0.24, 0, 0.34);
      ctx.drawImage(titleGlow, 0, 0);
      ctx.restore();
    }
    if (titleCore && age > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp((age - 0.5) * 0.2, 0, 0.2);
      ctx.drawImage(titleCore, 0, 0);
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (age > 1.05) {
      ctx.strokeStyle = `rgba(105, 225, 255, ${Math.min(0.24, (age - 1.05) * 0.12)})`;
      ctx.lineWidth = 0.8;
      for (let index = 0; index < titleParticles.length; index += 1) {
        const particle = titleParticles[index];
        if (particle.link < 0 || index % 2) continue;
        const linked = titleParticles[particle.link];
        if (!linked || distance(particle.x, particle.y, linked.x, linked.y) > 18) continue;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(linked.x, linked.y);
        ctx.stroke();
      }
    }

    for (let index = 0; index < titleParticles.length; index += 1) {
      const particle = titleParticles[index];
      const visible = clamp((age - particle.delay) * 2.4, 0, 1);
      ctx.globalAlpha = visible * (0.88 + Math.sin(particle.phase) * 0.1);
      ctx.fillStyle = index % 17 === 0 ? "#ffdca0" : index % 7 === 0 ? "#ffffff" : "#81eaff";
      const size = particle.size * (index % 17 === 0 ? 1.8 : 1);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, TAU);
      ctx.fill();
      if (index % 41 === 0 && visible > 0.8) {
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(particle.x - size * 3.5, particle.y);
        ctx.lineTo(particle.x + size * 3.5, particle.y);
        ctx.moveTo(particle.x, particle.y - size * 3.5);
        ctx.lineTo(particle.x, particle.y + size * 3.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawFireworks(now) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of fireworks) {
      const life = 1 - particle.age / particle.life;
      ctx.globalAlpha = life;
      ctx.strokeStyle = particle.color;
      ctx.fillStyle = particle.color;
      ctx.lineWidth = Math.max(0.5, particle.size * life * 0.8);
      if (particle.trail.length) {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        particle.trail.forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (0.45 + life), 0, TAU);
      ctx.fill();
    }
    for (const comet of comets) {
      const life = Math.sin(clamp(comet.age / comet.life, 0, 1) * Math.PI);
      ctx.globalAlpha = 0.25 + life * 0.75;
      ctx.strokeStyle = comet.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(comet.x, comet.y);
      comet.trail.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(comet.x, comet.y, 2.7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    zoomWhales.forEach((item) => {
      const alpha = Math.sin(clamp(item.age / item.life, 0, 1) * Math.PI) * 0.8;
      drawWhale(item.x, item.y, item.scale, item.facing, -0.12, alpha, now, true);
    });
  }

  function render(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (phase === "transition" && !reducedMotion) {
      const age = (now - phaseStarted) / 1000;
      const zoom = age < 0.54
        ? lerp(1, 1.12, easeOutCubic(clamp(age / 0.54, 0, 1)))
        : age < 1.55
          ? lerp(1.12, 0.84, easeOutCubic(clamp((age - 0.54) / 1.01, 0, 1)))
          : lerp(0.84, 1, easeOutCubic(clamp((age - 1.55) / 1.15, 0, 1)));
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
    } else if ((phase === "finale" || phase === "epilogue") && !reducedMotion) {
      const age = (now - phaseStarted) / 1000;
      const zoom = lerp(0.94, 1, easeOutCubic(clamp(age / 1.6, 0, 1)));
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
    }
    if (cameraKick > 0 && !reducedMotion) {
      const shake = cameraKick * 7;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawSpace(now);
    drawPlanets(now);
    drawRipples(now);
    if (phase === "seed") drawSeed(now);
    if (phase === "awakening") drawBirth(now);
    if (phase === "hunt") drawWish(now);
    if (phase === "portal" || phase === "transition") drawPortal(now);
    drawParticles();

    if (phase !== "seed" && phase !== "awakening") {
      babyWhales.forEach((baby) => {
        drawWhale(
          baby.x,
          baby.y,
          baby.scale,
          baby.facing,
          Math.sin(now * 0.001 + baby.phase) * 0.22,
          0.56,
          now + baby.phase * 100,
          true,
        );
      });
      const transitionScale = phase === "transition"
        ? 1 + easeOutCubic(clamp(((now - phaseStarted) / 1000 - 0.45) / 1.1, 0, 1)) * 0.42
        : phase === "finale" || phase === "epilogue"
          ? height > width
            ? 1.34
            : 1.05
          : 1;
      drawWhale(whale.x, whale.y, whaleScale() * transitionScale, whale.facing, whale.tilt, whale.reveal, now);
    }

    if (phase === "finale" || phase === "epilogue") {
      drawTitle(now);
      drawFireworks(now);
    }
    drawTransition(now);
    drawProgress(now);
    ctx.restore();

    if (screenFlash > 0) {
      ctx.fillStyle = `rgba(210, 248, 255, ${screenFlash * 0.32})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    update(dt, now);
    render(now);
    requestAnimationFrame(frame);
  }

  function actionAt(x, y) {
    audio.unlock();
    pointer.x = x;
    pointer.y = y;

    if (phase === "seed") {
      const hitRadius = Math.max(72, Math.min(width, height) * 0.16);
      if (distance(x, y, seed.x, seed.y) <= hitRadius) triggerAwakening(x, y);
      else {
        addRipple(x, y, "#285c80", 0, 0.35);
        setPrompt("Ngôi sao đang chờ ở giữa vũ trụ", "Chạm vào ánh sáng xanh", 1500);
      }
      return;
    }

    if (phase === "hunt") {
      addRipple(x, y, "#55efff", 0, 0.32);
      whale.targetX = x;
      whale.targetY = y;
      if (currentWish && distance(x, y, currentWish.x, currentWish.y) <= Math.max(58, width * 0.065)) {
        selectWish();
      }
      return;
    }

    if (phase === "portal" && !hold.active) {
      beginHolding(x, y);
      return;
    }

    if ((phase === "finale" || phase === "epilogue") && epilogueStarted) {
      const insideTitle = titleBounds && x >= titleBounds.left && x <= titleBounds.right && y >= titleBounds.top && y <= titleBounds.bottom;
      if (!insideTitle) {
        addRipple(x, y, COLORS[interactiveFirework % COLORS.length], 0, 0.42);
        return;
      }
      const now = performance.now();
      if (now - lastMagicAt < 280) return;
      lastMagicAt = now;
      const style = ["tail", "spiral", "pod"][interactiveFirework % 3];
      interactiveFirework += 1;
      if (style === "pod") spawnWhalePod(x, y);
      else spawnFirework(x, y, style, 1.15);
      emitParticles(x, y, reducedMotion ? 24 : 58, { minSpeed: 40, maxSpeed: 210, palette: COLORS });
      audio.chime(interactiveFirework % 5);
      setPrompt(
        style === "tail" ? "Một chiếc đuôi cá voi" : style === "spiral" ? "Một vòng xoắn ngân hà" : "Cả đàn cá voi đến chúc mừng",
        "Chạm vào Pastie lần nữa",
        2200,
      );
    }
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || pointer.down) return;
    pointer.down = true;
    pointer.id = event.pointerId;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    experience.setPointerCapture?.(event.pointerId);
    actionAt(pointer.x, pointer.y);
  }

  function handlePointerMove(event) {
    if (!event.isPrimary) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (phase === "hunt" && pointer.down && !currentWish?.selected) {
      whale.targetX = pointer.x;
      whale.targetY = pointer.y;
    }
  }

  function handlePointerUp(event) {
    if (!event.isPrimary || pointer.id !== event.pointerId) return;
    pointer.down = false;
    pointer.id = null;
    releaseHolding();
  }

  function handleKeyboardDown(event) {
    if (!['Enter', ' '].includes(event.key) || event.repeat) return;
    event.preventDefault();
    pointer.down = true;
    if (phase === "seed") actionAt(seed.x, seed.y);
    else if (phase === "hunt" && currentWish) actionAt(currentWish.x, currentWish.y);
    else if (phase === "portal") actionAt(portal.x, portal.y);
    else if ((phase === "finale" || phase === "epilogue") && titleBounds) {
      actionAt(width / 2, (titleBounds.top + titleBounds.bottom) / 2);
    }
  }

  function handleKeyboardUp(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    pointer.down = false;
    releaseHolding();
  }

  function cancelActiveInput() {
    pointer.down = false;
    pointer.id = null;
    if (hold.active) {
      hold.active = false;
      hold.ready = hold.progress >= 1;
      experience.classList.remove("is-charging");
      audio.endCharge();
      if (phase === "portal") {
        setPrompt(
          hold.ready ? "Ánh sáng đã đầy" : "Ánh sáng vẫn đang chờ",
          hold.ready ? "Chạm giữ rồi thả để mở ngân hà" : "Giữ lâu thêm một chút",
        );
      }
    }
  }

  function handleVisibilityChange() {
    const now = performance.now();
    if (document.hidden) {
      hiddenAt = now;
      cancelActiveInput();
      if (audio.context) audio.context.suspend().catch(() => {});
      return;
    }

    if (hiddenAt) {
      const hiddenDuration = now - hiddenAt;
      phaseStarted += hiddenDuration;
      if (nextWishAt) nextWishAt += hiddenDuration;
      if (currentWish) currentWish.born += hiddenDuration;
      ripples.forEach((ripple) => {
        ripple.born += hiddenDuration;
      });
      lastCometAt += hiddenDuration;
      hiddenAt = 0;
    }
    lastFrame = now;
    if (audio.context) audio.context.resume().catch(() => {});
  }

  function handleMotionPreference(event) {
    reducedMotion = event.matches;
    maxParticles = reducedMotion ? 520 : 1500;
    if (particles.length > maxParticles) particles.splice(0, particles.length - maxParticles);
    resize();
  }

  experience.addEventListener("pointerdown", handlePointerDown);
  experience.addEventListener("pointermove", handlePointerMove);
  experience.addEventListener("pointerup", handlePointerUp);
  experience.addEventListener("pointercancel", handlePointerUp);
  experience.addEventListener("lostpointercapture", cancelActiveInput);
  experience.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("keydown", handleKeyboardDown);
  window.addEventListener("keyup", handleKeyboardUp);
  window.addEventListener("blur", cancelActiveInput);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  if (motionPreference.addEventListener) motionPreference.addEventListener("change", handleMotionPreference);
  else motionPreference.addListener(handleMotionPreference);

  resize();
  pointer.x = width / 2;
  pointer.y = height / 2;
  whale.x = width * 0.5;
  whale.y = height * 0.5;
  whale.targetX = whale.x;
  whale.targetY = whale.y;
  requestAnimationFrame(frame);
})();
