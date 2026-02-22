/**
 * Overlap → Lines (Geometric / Magnetic / Tilt)
 * 1) Shapes only: circle / triangle / rect
 * 2) Cursor circle smaller (60%)
 * 3) Magnetic feel near cursor (spring attraction)
 * 4) Device tilt moves elements (DeviceOrientation)
 *
 * - Click: reshuffle
 * - Wheel: circle size
 * - S: save  /  R: reset
 */

let elems = [];
let cfg = {
  count: 18,
  r: 160 * 0.8,     // ✅ 80% size
  lead: 70,         // circle leads in pointer direction
  ease: 0.14,       // circle smoothing
  bg: [10, 10, 10],

  // magnetic
  magRadius: 260,
  magStrength: 0.035, // spring strength
  magDamp: 0.82,     // velocity damping

  // tilt
  tiltStrength: 1.15, // how much tilt influences motion
};

let pNow, pPrev, cPos, cPrev;
let tilt = { x: 0, y: 0 };
let motionEnabled = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  pNow = createVector(width / 2, height / 2);
  pPrev = pNow.copy();
  cPos = pNow.copy();

  buildElements();
  cPrev = cPos.copy();
}

function draw() {
  background(cfg.bg[0], cfg.bg[1], cfg.bg[2]);

  const px = (touches && touches.length) ? touches[0].x : mouseX;
  const py = (touches && touches.length) ? touches[0].y : mouseY;
  pNow.set(constrain(px, 0, width), constrain(py, 0, height));

  // direction (velocity) for leading circle
  const v = p5.Vector.sub(pNow, pPrev);
  const sp = v.mag();

  let target = pNow.copy();
  if (sp > 0.2) {
    v.normalize();
    target.add(v.mult(cfg.lead));
  }
  cPrev.set(cPos);
  // smooth circle motion
  cPos.x = lerp(cPos.x, target.x, cfg.ease);
  cPos.y = lerp(cPos.y, target.y, cfg.ease);

  // update elements physics (magnetic + tilt)
  updateElementsPhysics();

  // ---- render split: outside = filled, inside = stroked ----
  const ctx = drawingContext;

  ctx.save();
  clipOutsideCircle(ctx, cPos.x, cPos.y, cfg.r);
  drawElementsFilled();
  ctx.restore();

  ctx.save();
  clipInsideCircle(ctx, cPos.x, cPos.y, cfg.r);

  // ✅ 원 안에서 '도형이 없는 부분'을 흰색으로 채우기 (먼저 깔기)
  noStroke();
  fill(245);
  circle(cPos.x, cPos.y, cfg.r * 2);

  // ✅ 그 위에, 원 안에 있는 도형들은 라인으로만
  drawElementsStroked();

  ctx.restore();

  // cursor circle guide (subtle)
  noFill();
  stroke(245, 140);
  strokeWeight(1);
  circle(cPos.x, cPos.y, cfg.r * 2);

  // iOS motion permission hint
  drawMotionHint();

  pPrev.set(pNow);
}

// ---------------- Elements ----------------

function buildElements() {
  elems = [];

  // ✅ 화면 채움용: 화면 크기에 따라 스케일 자동
  const s = min(width, height);

  // ✅ “큰/중간/작은” 크기 범위 (지금보다 확 커짐)
  function pickSize() {
    const roll = random();
    if (roll < 0.30) return random(s * 0.28, s * 0.40); // BIG
    if (roll < 0.80) return random(s * 0.18, s * 0.28); // MID
    return random(s * 0.12, s * 0.18);                  // SMALL
  }

  // ✅ 살짝만 겹치게: 0.88~0.92 사이 추천 (작을수록 더 겹침 허용)
  const overlapFactor = 0.90;

  // 화면 가장자리까지 꽉 채우되 너무 밖으로는 안 나가게
  const pad = 40;

  const palette = [
    [255, 82, 82],
    [255, 214, 0],
    [0, 229, 255],
    [124, 77, 255],
    [0, 230, 118],
    [255, 109, 0],
    [255, 64, 129],
  ];

  // ✅ “겹침 제어”를 위해 기존 요소들과 거리 체크하면서 배치
  const maxAttempts = 5000; // 배치 시도 횟수(충분히 크게)
  let attempts = 0;

  while (elems.length < cfg.count && attempts < maxAttempts) {
    attempts++;

    const size = pickSize();
    const x = random(pad, width - pad);
    const y = random(pad, height - pad);

    // 도형별 대략 반지름(충돌 체크용)
    // rect/tri도 원처럼 근사해서 체크 (디자인에 충분히 자연스러움)
    const r = size * 0.55;

    let ok = true;
    for (const e of elems) {
      const rr = (e.size * 0.55 + r) * overlapFactor;
      const dx = x - e.x;
      const dy = y - e.y;
      if (dx * dx + dy * dy < rr * rr) { ok = false; break; }
    }
    if (!ok) continue;

    const typeRoll = random();
    const type = typeRoll < 0.34 ? "circle" : (typeRoll < 0.67 ? "tri" : "rect");

    elems.push({
      x, y,
      baseX: x, baseY: y,
      vx: 0, vy: 0,
      size,
      rot: random(-PI, PI),
      vr: random(-0.01, 0.01),
      col: random(palette),
      type,
    });
  }

  // 혹시 배치가 덜 채워졌으면(아주 큰 화면/겹침 제한이 강할 때)
  // overlapFactor를 조금 낮추면(0.88) 더 많이 들어감
}


function updateElementsPhysics() {
  for (const e of elems) {
    // 1) base 위치로 아주 약하게 복귀(전체 구도 유지)
    const homeX = (e.baseX - e.x) * 0.004;
    const homeY = (e.baseY - e.y) * 0.004;

    // 커서 원과 거리
    const dx = cPos.x - e.x;
    const dy = cPos.y - e.y;
    const d = sqrt(dx * dx + dy * dy);

    let ax = homeX;
    let ay = homeY;

    // 2) 원이 지나가는 방향으로 "살짝" 밀리고 휘는 탄성
    if (d < cfg.magRadius) {
      const t = 1 - (d / cfg.magRadius); // 0~1 (가까울수록 1)

      // 원의 실제 이동 방향(이전 원 위치 대비)
      const mvx = cPos.x - cPrev.x;
      const mvy = cPos.y - cPrev.y;
      const ms = sqrt(mvx * mvx + mvy * mvy) + 0.0001;

      const ux = mvx / ms;
      const uy = mvy / ms;

      // 강도(가까울수록 더)
      const along = cfg.magStrength * (t * t) * 140;
      const side  = cfg.magStrength * (t * t) * 90;

      // 진행 방향으로 살짝 밀기
      ax += ux * along;
      ay += uy * along;

      // 진행 방향에 수직으로 살짝 휘기
      const sgn = (noise(e.x * 0.01, e.y * 0.01, frameCount * 0.01) > 0.5) ? 1 : -1;
      ax += (-uy) * side * sgn;
      ay += ( ux) * side * sgn;

      // 회전도 아주 미세하게
      e.vr += sgn * 0.00045 * t;
    }

    // 3) 기울기(폰)
    ax += tilt.x * 0.06 * cfg.tiltStrength;
    ay += tilt.y * 0.06 * cfg.tiltStrength;

    // integrate
    e.vx = (e.vx + ax) * cfg.magDamp;
    e.vy = (e.vy + ay) * cfg.magDamp;

    e.x += e.vx;
    e.y += e.vy;

    // rotation damping
    e.vr *= 0.96;
    e.rot += e.vr;

    // 화면 밖으로 너무 나가면 부드럽게 복귀
    const pad = 220;
    if (e.x < -pad || e.x > width + pad || e.y < -pad || e.y > height + pad) {
      e.x = lerp(e.x, width / 2, 0.06);
      e.y = lerp(e.y, height / 2, 0.06);
      e.vx *= 0.3;
      e.vy *= 0.3;
    }
  }
}

// ---------------- Drawing ----------------

function drawElementsFilled() {
  noStroke();
  for (const e of elems) {
    push();
    translate(e.x, e.y);
    rotate(e.rot);
    fill(245, 245, 245, 170);

    if (e.type === "circle") {
      circle(0, 0, e.size);
    } else if (e.type === "rect") {
      rectMode(CENTER);
      rect(0, 0, e.size * 1.1, e.size * 0.8, 22);
    } else { // tri
      drawTriangleFilled(e.size);
    }
    pop();
  }
}

function drawElementsStroked() {
  noFill();
  strokeWeight(1.35);
  for (const e of elems) {
    push();
    translate(e.x, e.y);
    rotate(e.rot);
    stroke(e.col[0], e.col[1], e.col[2], 240);

    if (e.type === "circle") {
      circle(0, 0, e.size);
    } else if (e.type === "rect") {
      rectMode(CENTER);
      rect(0, 0, e.size * 1.1, e.size * 0.8, 22);
    } else {
      drawTriangleStroked(e.size);
    }
    pop();
  }
}

function drawTriangleFilled(s) {
  roundedTriangle(s, 14, true);  // 14 = 라운드 정도(픽셀)
}

function drawTriangleStroked(s) {
  roundedTriangle(s, 14, false);
}

// rounded triangle using quadratic curves
function roundedTriangle(size, radius, filled) {
  // 기본 삼각형 좌표(정삼각 느낌)
  const r = size * 0.58;
  const p1 = createVector(0, -r);
  const p2 = createVector(r * 0.9, r * 0.85);
  const p3 = createVector(-r * 0.9, r * 0.85);
  const pts = [p1, p2, p3];

  beginShape();
  for (let i = 0; i < 3; i++) {
    const a = pts[(i + 2) % 3];
    const b = pts[i];
    const c = pts[(i + 1) % 3];

    // b에서 a 방향, c 방향으로 radius만큼 이동한 점 2개
    const v1 = p5.Vector.sub(a, b).normalize().mult(radius);
    const v2 = p5.Vector.sub(c, b).normalize().mult(radius);

    const pA = p5.Vector.add(b, v1);
    const pC = p5.Vector.add(b, v2);

    if (i === 0) vertex(pA.x, pA.y);
    else vertex(pA.x, pA.y);

    // 꼭지점 b를 둥글게: quadratic curve
    quadraticVertex(b.x, b.y, pC.x, pC.y);
  }
  endShape(CLOSE);
}

// ---------------- Clipping ----------------

function clipOutsideCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip("evenodd"); // circle becomes a hole
}

function clipInsideCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}

// ---------------- Input / UX ----------------

function mouseWheel(e) {
  cfg.r = constrain(cfg.r + (e.delta > 0 ? -12 : 12), 50, 260);
  return false;
}

function mousePressed() {
  // 클릭: 전체 재배치
  buildElements();
  // iOS motion permission 요청도 클릭에서 트리거 가능
  requestMotionPermissionIfNeeded();
}

function keyPressed() {
  if (key === "s" || key === "S") saveCanvas("overlap_lines_geo", "png");
  if (key === "r" || key === "R") {
    buildElements();
    tilt.x = tilt.y = 0;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ---------------- Device Orientation ----------------

function requestMotionPermissionIfNeeded() {
  // iOS Safari는 명시적 권한 요청 필요
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function" && !motionEnabled) {
    D.requestPermission()
      .then((state) => {
        if (state === "granted") enableMotion();
      })
      .catch(() => {});
  } else {
    // Android/데스크톱 등은 그냥 등록하면 되는 경우가 많음
    enableMotion();
  }
}

function enableMotion() {
  if (motionEnabled) return;
  motionEnabled = true;

  window.addEventListener("deviceorientation", (ev) => {
    // gamma: left/right, beta: front/back
    const g = ev.gamma || 0;
    const b = ev.beta || 0;

    // 기울기 값을 작은 범위로 매핑
    tilt.x = constrain(g / 30, -1, 1); // 좌우
    tilt.y = constrain(b / 30, -1, 1); // 상하
  }, { passive: true });
}

function drawMotionHint() {
  // iOS에서 권한이 필요한데 아직 안 켰으면 안내 텍스트
  const D = window.DeviceOrientationEvent;
  const needsPermission = D && typeof D.requestPermission === "function";

  if (needsPermission && !motionEnabled) {
    noStroke();
    fill(255, 180);
    textAlign(CENTER, CENTER);
    textSize(12);
    text("Tap to enable motion (iPhone)", width / 2, height - 22);
  }
}

// 터치 시작 시에도 권한 요청
function touchStarted() {
  requestMotionPermissionIfNeeded();
  return false;
}
