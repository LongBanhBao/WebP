(() => {
  "use strict";

  const canvas = document.querySelector("#universe");
  const ctx = canvas.getContext("2d", { alpha: true });
  const experience = document.querySelector("#experience");
  const prompt = document.querySelector("#prompt");
  const promptText = document.querySelector("#promptText");
  const subPrompt = document.querySelector("#subPrompt");
  const liveStatus = document.querySelector("#liveStatus");
  const awakeningArt = document.querySelector(".art--awakening");
  const finaleArt = document.querySelector(".art--finale");

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
  let epilogueStarted = false;
  let screenFlash = 0;
  let cameraKick = 0;
  let interactiveFirework = 0;
  let lastMagicAt = 0;
  let lastCometAt = 0;
  let hiddenAt = 0;
  let promptTimer = 0;
  let starSeed = 91802;

  const stars = [];
  const particles = [];
  const ripples = [];
  const fireworks = [];
  const zoomWhales = [];
  const babyWhales = [];
  const comets = [];
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
    if (phase === "finale" || phase === "epilogue") {
      generateTitleParticles(phase === "epilogue" || performance.now() - phaseStarted > 3200);
    }
    if (currentWish) locateWish(currentWish);
  }

  function buildStarField() {
    const desired = Math.round(
      clamp((width * height) / (reducedMotion ? 9000 : 5600), 90, reducedMotion ? 180 : 330),
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
    awakeningArt.classList.add("is-visible");
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
    awakeningArt.classList.remove("is-visible");
    awakeningArt.classList.add("is-distant");
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
    whale.targetX = currentWish.x - currentWish.approachFacing * 90 * whaleScale();
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
      finaleArt.style.backgroundImage = 'url("assets/birthday-finale.png")';
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
    setPrompt("Giữ vào cánh cổng ngân hà", "Đừng buông tay cho đến khi ánh sáng đầy vòng tròn");
    liveStatus.textContent = "Giữ chuột, ngón tay, phím Enter hoặc phím cách để nạp cánh cổng.";
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
      triggerFinale();
    } else {
      setPrompt("Ánh sáng vẫn đang chờ", "Giữ lâu thêm một chút");
    }
  }

  function triggerFinale() {
    phase = "finale";
    phaseStarted = performance.now();
    screenFlash = reducedMotion ? 0.25 : 1;
    cameraKick = reducedMotion ? 0 : 1;
    prepareFinaleArt();
    finaleArt.classList.add("is-visible");
    awakeningArt.classList.remove("is-distant");
    setPrompt("", "");
    generateTitleParticles();
    fireworks.length = 0;
    finaleEvents.forEach((event) => {
      event.played = false;
    });
    epilogueStarted = false;
    audio.finale();
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
    const mask = document.createElement("canvas");
    mask.width = width;
    mask.height = height;
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    const firstSize = Math.min(width * 0.088, height * 0.065, 76);
    const nameSize = Math.min(width * 0.185, height * 0.125, 142);
    const firstY = height * (height > width ? 0.355 : 0.32);
    const nameY = height * (height > width ? 0.48 : 0.5);
    maskContext.strokeStyle = "#fff";
    maskContext.lineJoin = "round";
    maskContext.lineCap = "round";
    maskContext.textAlign = "center";
    maskContext.textBaseline = "middle";
    maskContext.font = `900 ${firstSize}px Arial, sans-serif`;
    maskContext.lineWidth = Math.max(3, firstSize * 0.065);
    maskContext.strokeText("HAPPY BIRTHDAY", width / 2, firstY);
    maskContext.font = `900 ${nameSize}px Arial, sans-serif`;
    maskContext.lineWidth = Math.max(4, nameSize * 0.055);
    maskContext.strokeText("PASTIE", width / 2, nameY);
    const nameWidth = maskContext.measureText("PASTIE").width;
    titleGlow = document.createElement("canvas");
    titleGlow.width = width;
    titleGlow.height = height;
    const glowContext = titleGlow.getContext("2d");
    glowContext.filter = `blur(${reducedMotion ? 5 : 9}px)`;
    glowContext.drawImage(mask, 0, 0);

    const image = maskContext.getImageData(0, 0, width, height).data;
    const step = reducedMotion ? 7 : width < 520 ? 4 : 5;
    const points = [];
    const startY = Math.max(0, Math.floor(firstY - firstSize * 0.7));
    const endY = Math.min(height, Math.ceil(nameY + nameSize * 0.68));
    const maximum = reducedMotion ? 650 : width < 520 ? 1500 : 2100;
    let previousInRow = -1;

    for (let y = startY; y < endY && points.length < maximum; y += step) {
      previousInRow = -1;
      for (let x = 0; x < width && points.length < maximum; x += step) {
        const alpha = image[(y * width + x) * 4 + 3];
        if (alpha > 75 && Math.random() > 0.04) {
          const point = {
            x: settled ? x : portal.x + (Math.random() - 0.5) * 46,
            y: settled ? y : portal.y + (Math.random() - 0.5) * 46,
            tx: x + (Math.random() - 0.5) * 1.8,
            ty: y + (Math.random() - 0.5) * 1.8,
            vx: (Math.random() - 0.5) * 65,
            vy: (Math.random() - 0.5) * 65,
            delay: settled ? 0 : 1.15 + Math.random() * 1.25,
            size: 0.72 + Math.random() * 1.25,
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
      top: nameY - nameSize * 0.62,
      bottom: nameY + nameSize * 0.7,
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
      whale.targetX = currentWish.x - currentWish.approachFacing * 90 * whaleScale();
      whale.targetY = currentWish.y;
    } else if (phase === "portal") {
      const speed = 0.9 + hold.progress * 3.9;
      portal.spin += dt * speed;
      const radiusX = lerp(Math.min(width, height) * 0.2, 72, hold.progress);
      const radiusY = radiusX * 0.48;
      whale.targetX = portal.x + Math.cos(portal.spin) * radiusX;
      whale.targetY = portal.y + Math.sin(portal.spin) * radiusY;
    } else if (phase === "finale" || phase === "epilogue") {
      const finaleAge = (now - phaseStarted) / 1000;
      if (phase === "finale" && finaleAge < 1.1) {
        whale.targetX = portal.x + width * 0.7;
        whale.targetY = portal.y - height * 0.38;
      } else {
        const orbitTime = now * 0.0002;
        const settle = clamp((finaleAge - 4.5) / 4, 0, 1);
        const orbitX = width / 2 + Math.cos(orbitTime * TAU) * width * 0.32;
        const orbitY = height * 0.48 + Math.sin(orbitTime * TAU) * height * 0.22;
        whale.targetX = lerp(orbitX, width * 0.5, settle);
        whale.targetY = lerp(orbitY, height * 0.69, settle);
      }
    }

    const dx = whale.targetX - whale.x;
    const dy = whale.targetY - whale.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    const maxSpeed = phase === "portal" ? 320 + hold.progress * 170 : phase === "finale" ? 430 : 265;
    const arrival = clamp(dist / Math.max(80, Math.min(width, height) * 0.18), 0.12, 1);
    const desiredX = (dx / dist) * maxSpeed * arrival;
    const desiredY = (dy / dist) * maxSpeed * arrival;
    const steer = phase === "portal" ? 3.4 : 2.15;
    whale.vx += (desiredX - whale.vx) * clamp(dt * steer, 0, 1);
    whale.vy += (desiredY - whale.vy) * clamp(dt * steer, 0, 1);
    whale.x += whale.vx * dt;
    whale.y += whale.vy * dt;

    if (phase === "hunt") {
      const marginX = 100 * whaleScale();
      const marginY = 68 * whaleScale();
      whale.x = clamp(whale.x, marginX, width - marginX);
      whale.y = clamp(whale.y, marginY, height - marginY - 52);
    }

    if (Math.abs(dx) > 22) whale.facing = dx >= 0 ? 1 : -1;
    const desiredTilt = clamp(Math.atan2(dy, Math.max(45, Math.abs(dx))), -0.75, 0.75);
    whale.tilt = lerp(whale.tilt, desiredTilt, clamp(dt * 2.8, 0, 1));
    whale.trailClock += dt;

    if (whale.reveal > 0.35 && whale.trailClock > (reducedMotion ? 0.09 : 0.035)) {
      whale.trailClock = 0;
      const scale = whaleScale();
      const tailX = whale.x - whale.facing * 95 * scale;
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
      const headX = whale.x + currentWish.approachFacing * 90 * whaleScale();
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
    const finalMode = phase === "finale" || phase === "epilogue";
    const darkness = phase === "seed" ? 0.95 : finalMode ? 0.47 : 0.72 - energy * 0.12;
    ctx.fillStyle = `rgba(1, 4, 15, ${darkness})`;
    ctx.fillRect(0, 0, width, height);

    const parallaxX = (pointer.x - width / 2) / width;
    const parallaxY = (pointer.y - height / 2) / height;
    const visibility = phase === "seed" ? 0.35 : 0.62 + energy * 0.38;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const star of stars) {
      let x = star.nx * width + parallaxX * 12 * star.z;
      let y = star.ny * height + parallaxY * 10 * star.z;
      const finaleAge = finalMode ? (now - phaseStarted) / 1000 : 99;
      if (finalMode && finaleAge < 1.25 && !reducedMotion) {
        const dx = x - portal.x;
        const dy = y - portal.y;
        const boost = (1.25 - finaleAge) * 0.24;
        x += dx * boost;
        y += dy * boost;
        ctx.strokeStyle = `hsla(${star.hue}, 95%, 72%, ${0.22 * visibility})`;
        ctx.lineWidth = star.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx * 0.08, y + dy * 0.08);
        ctx.stroke();
      }
      const alpha = visibility * (0.34 + Math.sin(now * 0.001 * star.speed + star.phase) * 0.27);
      ctx.fillStyle = `hsla(${star.hue}, 100%, 78%, ${Math.max(0.08, alpha)})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size * (finalMode ? 1.15 : 1), 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (energy > 0.03 || finalMode) drawNebula(finalMode ? Math.max(energy, 1) : energy, now);
  }

  function drawNebula(amount, now) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const bloom = phase === "finale" ? 1 + clamp((performance.now() - phaseStarted) / 1600, 0, 1) : 1;
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

  function drawWhale(x, y, scale, facing, tilt, alpha, now, constellationOnly = false) {
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
    drawWhale(whale.x, whale.y, whaleScale(), 1, -0.18, whale.reveal, now, whale.reveal < 0.55);
  }

  function drawPortal(now) {
    const base = Math.min(width, height);
    const radius = base * (0.075 + hold.progress * 0.055);
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < 7; index += 1) {
      const spin = portal.spin * (index % 2 ? -1 : 1) + index * 0.78;
      const ringRadius = radius + index * 8;
      ctx.rotate(0.13);
      ctx.strokeStyle = `rgba(${index % 2 ? "173, 102, 255" : "75, 230, 255"}, ${0.16 + hold.progress * 0.09})`;
      ctx.lineWidth = 1 + (index % 3) * 0.5;
      ctx.setLineDash([9 + index * 2, 8 + index]);
      ctx.lineDashOffset = -spin * 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, ringRadius * (0.34 + index * 0.025), spin * 0.06, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8);
    glow.addColorStop(0, `rgba(255, 244, 203, ${0.6 + hold.progress * 0.35})`);
    glow.addColorStop(0.18, `rgba(74, 232, 255, ${0.42 + hold.progress * 0.4})`);
    glow.addColorStop(0.56, `rgba(135, 75, 255, ${0.15 + hold.progress * 0.2})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.8, 0, TAU);
    ctx.fill();

    for (let index = 0; index < 5; index += 1) {
      const angle = now * 0.001 * (0.7 + hold.progress * 3) + (index / 5) * TAU;
      const orbit = radius * (1.35 - hold.progress * 0.48);
      drawGlowStar(Math.cos(angle) * orbit, Math.sin(angle) * orbit * 0.48, 2.5, COLORS[index], 0.8);
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 14, -Math.PI / 2, -Math.PI / 2 + TAU * hold.progress);
    ctx.stroke();
    ctx.restore();
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
    if (titleGlow && age > 2.05) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp((age - 2.05) * 0.055, 0, 0.16);
      ctx.drawImage(titleGlow, 0, 0);
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (age > 2.4) {
      ctx.strokeStyle = `rgba(105, 225, 255, ${Math.min(0.15, (age - 2.4) * 0.04)})`;
      ctx.lineWidth = 0.65;
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
      const visible = clamp((age - particle.delay) * 1.8, 0, 1);
      ctx.globalAlpha = visible * (0.68 + Math.sin(particle.phase) * 0.25);
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
    drawSpace(now);

    ctx.save();
    if ((phase === "finale" || phase === "epilogue") && !reducedMotion) {
      const age = (now - phaseStarted) / 1000;
      const zoom = age < 1.25
        ? lerp(1.08, 0.88, easeOutCubic(clamp(age / 1.25, 0, 1)))
        : lerp(0.88, 1, easeOutCubic(clamp((age - 1.25) / 2.6, 0, 1)));
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);
    }
    if (cameraKick > 0 && !reducedMotion) {
      const shake = cameraKick * 7;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    drawPlanets(now);
    drawRipples(now);
    if (phase === "seed") drawSeed(now);
    if (phase === "awakening") drawBirth(now);
    if (phase === "hunt") drawWish(now);
    if (phase === "portal") drawPortal(now);
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
      const finalSettle = phase === "epilogue" ? 1.18 : 1;
      drawWhale(whale.x, whale.y, whaleScale() * finalSettle, whale.facing, whale.tilt, whale.reveal, now);
    }

    if (phase === "finale" || phase === "epilogue") {
      drawTitle(now);
      drawFireworks(now);
    }
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
