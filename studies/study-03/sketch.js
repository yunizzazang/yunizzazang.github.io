/**
 * STUDY 03 — Two Tone Pulse Grid (cleaner)
 * - 2 colors only
 * - soft pulse (brightness rhythm)
 * - subtle mouse focus
 * - Click: shift rhythm
 * - Wheel: scale
 */

let cfg = {
  cell: 22,          // spacing
  speed: 0.018,      // rhythm speed
  trail: 22,         // afterimage (higher = less trail)
  focusR: 180,       // mouse focus radius
  seed: 0
};

// 딱 2색 (잉크/종이 느낌)
const INK  = [235, 232, 225]; // 밝은 점/선
const DARK = [12, 12, 12];    // 배경(거의 검정)

let phase = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cfg.seed = floor(random(1e9));
  noiseSeed(cfg.seed);
  background(DARK[0], DARK[1], DARK[2]);
}

function draw() {
  // 잔상(호흡)
  noStroke();
  fill(DARK[0], DARK[1], DARK[2], cfg.trail);
  rect(0, 0, width, height);

  const t = frameCount * cfg.speed + phase;

  // 화면 중앙 기준, 더 차분한 구성
  const cell = cfg.cell;
  const cols = floor(width / cell);
  const rows = floor(height / cell);

  // 그리드가 화면 가운데 오도록 오프셋
  const ox = (width - cols * cell) * 0.5 + cell * 0.5;
  const oy = (height - rows * cell) * 0.5 + cell * 0.5;

  strokeWeight(1);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = ox + i * cell;
      const y = oy + j * cell;

      // 리듬: 전체 + 좌표 기반 미세 위상 차
      const local = i * 0.22 + j * 0.18;
      const w = sin(t + local);

      // 알파: 0~255 (깜빡임 말고 “숨”)
      let a = 18 + 160 * pow(abs(w), 1.6);

      // 마우스 근처는 살짝 또렷
      const d = dist(x, y, mouseX, mouseY);
      const m = smoothstep(cfg.focusR, 0, d); // 가까울수록 1
      a += m * 70;

      // “점”만 찍으면 너무 밋밋해서: 1/4 확률로 아주 짧은 선
      const n = noise(i * 0.08, j * 0.08, t * 0.35);
      const useLine = n > 0.78;

      stroke(INK[0], INK[1], INK[2], constrain(a, 0, 210));

      if (useLine) {
        // 선 방향도 노이즈로
        const ang = n * TWO_PI * 2;
        const len = cell * (0.12 + 0.22 * abs(w));
        line(x, y, x + cos(ang) * len, y + sin(ang) * len);
      } else {
        point(x, y);
      }
    }
  }
}

function smoothstep(edge0, edge1, x) {
  const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mousePressed() {
  // 클릭: 리듬 위상 이동(장면이 바뀌는 느낌)
  phase += random(0.9, 2.2);
}

function mouseWheel(e) {
  // 휠: 스케일 조절
  cfg.cell = constrain(cfg.cell + (e.delta > 0 ? 2 : -2), 14, 42);
  return false;
}

function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('study_03_pulse_grid', 'png');
  if (key === 'r' || key === 'R') {
    cfg.seed = floor(random(1e9));
    noiseSeed(cfg.seed);
    phase = 0;
    background(DARK[0], DARK[1], DARK[2]);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(DARK[0], DARK[1], DARK[2]);
}
