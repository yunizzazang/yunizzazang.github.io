/**
 * STUDY 03 — Two Tone Rhythm
 * - Only 2 colors (A/B)
 * - Brightness rhythm (sin wave loop)
 * - Mouse: local emphasis
 * - Click: change phase / rhythm offset
 * - Wheel: density
 * - S: save
 */

let cfg = {
  cell: 18,          // grid spacing (wheel to change)
  amp: 0.85,         // rhythm amplitude
  speed: 0.012,      // rhythm speed
  trail: 16,         // afterimage strength (lower = longer trails)
  noiseScale: 0.015, // micro drift
  mouseBoost: 220,   // mouse emphasis radius
  seed: 1
};

let phase = 0;

// 딱 2가지 컬러만
const COL_A = [240, 240, 240];  // 밝은
const COL_B = [20, 20, 20];     // 어두운(배경과 구분되는 거의 블랙)

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cfg.seed = floor(random(1e9));
  noiseSeed(cfg.seed);
  randomSeed(cfg.seed);
  background(11);
}

function draw() {
  // 잔상
  noStroke();
  fill(11, cfg.trail);
  rect(0, 0, width, height);

  // 시간(리듬)
  const t = frameCount * cfg.speed + phase;

  // 그리드 그리기
  const cell = max(10, cfg.cell);
  const margin = cell * 1.5;

  // 약간의 기울어진 느낌(딱딱한 그리드 피하기)
  const tilt = 0.12;

  for (let y = -margin; y < height + margin; y += cell) {
    for (let x = -margin; x < width + margin; x += cell) {

      // 위치별로 조금씩 다른 박자(리듬의 위상)
      const local = (x * 0.008 + y * 0.006);

      // 리듬: -1~1
      const wave = sin(t + local);

      // 두 톤 스위치(리듬의 부호로 A/B 선택)
      const useA = wave > 0;
      const base = useA ? COL_A : COL_B;

      // 밝기(알파) 리듬: 0~1
      const a01 = 0.08 + (abs(wave) * cfg.amp);

      // 마우스 근처는 리듬이 더 “또렷”
      const dx = x - mouseX;
      const dy = y - mouseY;
      const d = sqrt(dx*dx + dy*dy);
      const m = smoothstep(cfg.mouseBoost, 0, d); // 0~1 (가까울수록 1)
      const a = 255 * constrain(a01 + m * 0.55, 0, 1);

      stroke(base[0], base[1], base[2], a);
      strokeWeight(1);

      // 미세 흔들림(노이즈) + 리듬에 따른 길이 변화
      const n = noise(x * cfg.noiseScale, y * cfg.noiseScale, t * 0.4);
      const ang = (n * TWO_PI) + (wave * tilt);

      // 짧은 선 길이(리듬으로 “숨 쉬는” 느낌)
      const len = cell * (0.18 + 0.42 * abs(wave));

      const x2 = x + cos(ang) * len;
      const y2 = y + sin(ang) * len;

      line(x, y, x2, y2);
    }
  }
}

// 부드러운 보간 함수(가까울수록 1)
function smoothstep(edge0, edge1, x) {
  const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mousePressed() {
  // 클릭: 박자(phase) 바꿔서 “다른 리듬”처럼
  phase += random(0.8, 2.4);
}

function mouseWheel(e) {
  // 휠: 밀도(셀 크기)
  cfg.cell = constrain(cfg.cell + (e.delta > 0 ? 2 : -2), 10, 42);
  return false;
}

function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('study_03_two_tone_rhythm', 'png');
  if (key === 'r' || key === 'R') {
    cfg.seed = floor(random(1e9));
    noiseSeed(cfg.seed);
    randomSeed(cfg.seed);
    phase = 0;
    background(11);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(11);
}
