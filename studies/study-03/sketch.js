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
  count: 34,
  r: 160 * 0.8,     // ✅ 60% size
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

let pNow, pPrev, cPos;
let tilt = { x: 0, y: 0 };
let motionEnabled = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  pNow = createVector(width / 2, height / 2);
  pPrev = pNow.copy();
  cPos = pNow.copy();

  buildElements();
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
  const pad = 160;

  // 다채로운 팔레트 (원하면 2색 팔레트로도 바꿀 수 있음)
  const palette = [
    [255, 82, 82],
    [255, 214, 0],
    [0, 229, 255],
    [124, 77, 255],
    [0, 230, 118],
    [255, 109, 0],
    [255, 64, 129],
  ];

  for (let i = 0; i < cfg.count; i++) {
    const x = random(-pad, width + pad);
    const y = random(-pad, height + pad);
    const size = random(70, 180) * 1.8;;
    const rot = random(-PI, PI);
    const col = random(palette);

    const typeRoll = random();
    const type = typeRoll < 0.34 ? "circle" : (typeRoll < 0.67 ? "tri" : "rect");

    elems.push({
      x, y,
      baseX: x, baseY: y,     // 기준 위치(자성 후 복귀에 사용)
      vx: 0, vy: 0,
      size,
      rot,
      vr: random(-0.01, 0.01),
      col,
      type,
    });
  }
}

function updateElementsPhysics() {
  for (const e of elems) {
    // 1) 기본적으로는 base 위치로 살짝 돌아가려는 힘(너무 흩어지지 않게)
    const homeX = (e.baseX - e.x) * 0.004;
    const homeY = (e.baseY - e.y) * 0.004;

    // 2) 마우스 자성: 가까우면 cursor circle을 향해 끌림(스프링 느낌)
    const dx = cPos.x - e.x;
    const dy = cPos.y - e.y;
    const d = sqrt(dx * dx + dy * dy);

    let ax = homeX;
    let ay = homeY;

    if (d < cfg.magRadius) {
  // 가까울수록 영향 커짐
  const t = 1 - (d / cfg.magRadius); // 0~1

  // 원의 이동 방향(velocity) = cPos가 이전 프레임에서 얼마나 움직였는지
  const mvx = cPos.x - pPrev.x;
  const mvy = cPos.y - pPrev.y;
  const ms = sqrt(mvx * mvx + mvy * mvy) + 0.0001;

  // 단위 방향 벡터
  const ux = mvx / ms;
  const uy = mvy / ms;

  // "진행 방향으로 살짝 밀기" + "옆으로 살짝 휘기" (탄성 느낌)
  // ※ 끌어당김(ax += dx*k) 없음 → 원 안으로 빨려들지 않음
  const along = cfg.magStrength * (t * t) * 140;
  const side  = cfg.magStrength * (t * t) * 90;

  // 진행 방향 push
  ax += ux * along;
  ay += uy * along;

  // 진행 방향에 수직인 방향으로 휘기(좌/우 랜덤처럼 보이게 노이즈 사용)
  const sgn = (noise(e.x * 0.01, e.y * 0.01, frameCount * 0.01) > 0.5) ? 1 : -1;
  ax += (-uy) * side * sgn;
  ay += ( ux) * side * sgn;

  // 회전도 아주 미세하게
  e.vr += sgn * 0.00045 * t;
}
    // 3) 기울기(폰): 아주 은은하게 전체를 밀어줌
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

    // 화면 밖으로 너무 나가면 부드럽게 되돌리기
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
    fill(e.col[0], e.col[1], e.col[2], 205);

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
