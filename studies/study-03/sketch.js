/**
 * STUDY 03 — Overlap becomes Lines
 * - Circle follows pointer direction (lead)
 * - Outside circle: colorful filled elements
 * - Inside circle: same elements rendered as strokes only
 * - Touch supported
 * - Wheel: circle size
 * - R: reshuffle  /  S: save
 */

let elems = [];
let cfg = {
  count: 36,
  r: 160,
  lead: 90,      // how much circle leads in direction
  ease: 0.12,    // circle smoothing
  bg: [10, 10, 10],
  seed: 0
};

let pNow, pPrev;
let cPos;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  cfg.seed = floor(random(1e9));
  randomSeed(cfg.seed);

  pNow = createVector(width/2, height/2);
  pPrev = pNow.copy();
  cPos = pNow.copy();

  buildElements();
}

function draw() {
  background(cfg.bg[0], cfg.bg[1], cfg.bg[2]);

  // pointer (mouse/touch)
  const px = (touches && touches.length) ? touches[0].x : mouseX;
  const py = (touches && touches.length) ? touches[0].y : mouseY;

  pNow.set(constrain(px, 0, width), constrain(py, 0, height));

  // direction = pointer velocity
  const v = p5.Vector.sub(pNow, pPrev);
  const sp = v.mag();

  // lead target in movement direction
  let target = pNow.copy();
  if (sp > 0.2) {
    v.normalize();
    target.add(v.mult(cfg.lead));
  }

  // smooth circle motion
  cPos.x = lerp(cPos.x, target.x, cfg.ease);
  cPos.y = lerp(cPos.y, target.y, cfg.ease);

  // ---- 핵심: "원 밖"과 "원 안"을 각각 클립해서 다른 스타일로 렌더 ----
  const ctx = drawingContext;

  // 1) 원 밖: fill(컬러)
  ctx.save();
  clipOutsideCircle(ctx, cPos.x, cPos.y, cfg.r);
  drawElementsFilled();
  ctx.restore();

  // 2) 원 안: stroke(라인)
  ctx.save();
  clipInsideCircle(ctx, cPos.x, cPos.y, cfg.r);
  drawElementsStroked();
  ctx.restore();

  // circle guide (optional)
  noFill();
  stroke(245, 140);
  strokeWeight(1);
  circle(cPos.x, cPos.y, cfg.r * 2);

  pPrev.set(pNow);
}

function buildElements() {
  elems = [];
  const pad = 140;
  const palette = [
    [255, 82, 82],
    [255, 214, 0],
    [0, 229, 255],
    [124, 77, 255],
    [0, 230, 118],
    [255, 109, 0]
  ];

  for (let i = 0; i < cfg.count; i++) {
    const x = random(-pad, width + pad);
    const y = random(-pad, height + pad);
    const w = random(80, 220);
    const h = random(60, 200);
    const rot = random(-0.7, 0.7);
    const col = random(palette);

    // 타입 섞기 (blob-like / rect-like)
    const type = random() < 0.55 ? "blob" : "rect";

    elems.push({ x, y, w, h, rot, col, type, n: random(1000) });
  }
}

function drawElementsFilled() {
  noStroke();
  for (const e of elems) {
    push();
    translate(e.x, e.y);
    rotate(e.rot);

    // 약간의 투명도(겹침이 예쁘게)
    const a = 200;
    fill(e.col[0], e.col[1], e.col[2], a);

    if (e.type === "rect") {
      rectMode(CENTER);
      rect(0, 0, e.w, e.h, 26);
    } else {
      // blob: 노이즈로 찌그러진 타원
      beginShape();
      const steps = 26;
      for (let i = 0; i < steps; i++) {
        const ang = (TWO_PI * i) / steps;
        const rr = 0.55 + noise(e.n, i * 0.12) * 0.75;
        const rx = (e.w * 0.5) * rr;
        const ry = (e.h * 0.5) * rr;
        vertex(cos(ang) * rx, sin(ang) * ry);
      }
      endShape(CLOSE);
    }
    pop();
  }
}

function drawElementsStroked() {
  // 원 안에서는 "라인"만
  noFill();
  strokeWeight(1.25);

  for (const e of elems) {
    push();
    translate(e.x, e.y);
    rotate(e.rot);

    // 라인은 밝은 단색 or 요소 색을 라인으로
    // (진짜 2색 느낌 원하면 여기서 stroke를 한 색으로 고정하면 됨)
    stroke(e.col[0], e.col[1], e.col[2], 235);

    if (e.type === "rect") {
      rectMode(CENTER);
      rect(0, 0, e.w, e.h, 26);
    } else {
      beginShape();
      const steps = 26;
      for (let i = 0; i < steps; i++) {
        const ang = (TWO_PI * i) / steps;
        const rr = 0.55 + noise(e.n, i * 0.12) * 0.75;
        const rx = (e.w * 0.5) * rr;
        const ry = (e.h * 0.5) * rr;
        vertex(cos(ang) * rx, sin(ang) * ry);
      }
      endShape(CLOSE);
    }
    pop();
  }
}

// ---- clipping helpers ----
// 원 밖 클립: rect + circle을 evenodd로 clip
function clipOutsideCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  // evenodd rule = circle 부분을 "구멍"으로
  ctx.clip("evenodd");
}

function clipInsideCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}

function mouseWheel(e) {
  cfg.r = constrain(cfg.r + (e.delta > 0 ? -12 : 12), 60, 320);
  return false;
}

function keyPressed() {
  if (key === "r" || key === "R") {
    cfg.seed = floor(random(1e9));
    randomSeed(cfg.seed);
    buildElements();
  }
  if (key === "s" || key === "S") saveCanvas("study_04_overlap_lines", "png");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
