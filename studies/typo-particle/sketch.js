/**
 * TYPO PARTICLE (no font file needed)
 * - Click: 단어 바꾸기
 * - Mouse move: 바람(밀어내기)
 * - Wheel: 글자 크기
 * - R: 리셋 / S: 이미지 저장
 */

let WORDS = ["BREATHE", "TRACE", "PAUSE", "PULSE", "WAVE"];

let cfg = {
  fontSize: 220,       // 기본 글자 크기
  step: 6,             // 글자 픽셀 샘플링 간격 (작을수록 점 많아짐)
  particleCount: 1400, // 파티클 수 (성능 따라 조절)
  attract: 0.09,       // 타겟(글자 점)으로 끌리는 힘
  mouseForce: 900,     // 마우스 반발 힘 (클수록 더 밀림)
  friction: 0.86,      // 감쇠(0~1)
  jitter: 0.35,        // 미세 흔들림
  trailAlpha: 18,      // 잔상 강도(0~255) 낮을수록 오래 남음
  edgePad: 80          // 화면 밖 리셋 여유
};

let pg, points = [];
let particles = [];
let wordIndex = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  pg = createGraphics(width, height);
  rebuildTextPoints();
  rebuildParticles();
  background(10);
}

function draw() {
  // 잔상
  noStroke();
  fill(10, cfg.trailAlpha);
  rect(0, 0, width, height);

  // 파티클 업데이트/렌더
  stroke(240, 180);
  strokeWeight(1);

  for (let p of particles) {
    p.update();
    point(p.x, p.y);
  }
}

function rebuildTextPoints() {
  pg.clear();
  pg.pixelDensity(1);
  pg.background(0);
  pg.fill(255);
  pg.noStroke();
  pg.textAlign(CENTER, CENTER);
  pg.textSize(cfg.fontSize);

  // 기본 폰트로도 충분히 예쁘게 나오도록 약간 볼드 느낌
  pg.textStyle(BOLD);

  const txt = WORDS[wordIndex];
  pg.text(txt, width / 2, height / 2);

  pg.loadPixels();
  points = [];

  // 텍스트가 찍힌 픽셀을 샘플링해서 점 좌표 만들기
  for (let y = 0; y < height; y += cfg.step) {
    for (let x = 0; x < width; x += cfg.step) {
      const idx = 4 * (y * width + x);
      const r = pg.pixels[idx]; // 흰색 글자면 r이 높음
      if (r > 30) points.push({ x, y });
    }
  }

  // 점이 너무 적으면 step을 자동 조정
  if (points.length < 400) {
    cfg.step = max(3, cfg.step - 1);
    rebuildTextPoints();
  }
}

function rebuildParticles() {
  particles = [];
  if (points.length === 0) return;

  const n = min(cfg.particleCount, points.length);
  for (let i = 0; i < n; i++) {
    const t = points[(i * 37) % points.length]; // 퍼지게 매핑
    particles.push(new Particle(random(width), random(height), t));
  }
}

function nextWord() {
  wordIndex = (wordIndex + 1) % WORDS.length;
  rebuildTextPoints();
  // 타겟만 새로 배정
  for (let i = 0; i < particles.length; i++) {
    particles[i].target = points[(i * 37) % points.length];
  }
}

function mousePressed() {
  nextWord();
}

function mouseWheel(e) {
  cfg.fontSize = constrain(cfg.fontSize + (e.delta > 0 ? -18 : 18), 80, 420);
  rebuildTextPoints();
  // 타겟만 갱신
  for (let i = 0; i < particles.length; i++) {
    particles[i].target = points[(i * 37) % points.length];
  }
  return false; // 페이지 스크롤 방지
}

function keyPressed() {
  if (key === "r" || key === "R") {
    background(10);
    rebuildTextPoints();
    rebuildParticles();
  }
  if (key === "s" || key === "S") saveCanvas("typo_particle", "png");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  rebuildTextPoints();
  rebuildParticles();
  background(10);
}

class Particle {
  constructor(x, y, target) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.target = target;
    this.seed = random(1000);
  }

  update() {
    // 타겟으로 끌림
    const tx = this.target.x;
    const ty = this.target.y;

    const ax = (tx - this.x) * cfg.attract;
    const ay = (ty - this.y) * cfg.attract;

    // 마우스 반발(바람)
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const d2 = dx * dx + dy * dy + 1;
    const mf = cfg.mouseForce / d2;

    // 미세 흔들림
    const jx = (noise(this.seed, frameCount * 0.01) - 0.5) * cfg.jitter;
    const jy = (noise(this.seed + 100, frameCount * 0.01) - 0.5) * cfg.jitter;

    this.vx += ax + dx * mf + jx;
    this.vy += ay + dy * mf + jy;

    // 감쇠
    this.vx *= cfg.friction;
    this.vy *= cfg.friction;

    this.x += this.vx;
    this.y += this.vy;

    // 화면 밖으로 너무 나가면 근처로 복귀
    if (this.x < -cfg.edgePad || this.x > width + cfg.edgePad ||
        this.y < -cfg.edgePad || this.y > height + cfg.edgePad) {
      this.x = random(width);
      this.y = random(height);
      this.vx = this.vy = 0;
    }
  }
}

