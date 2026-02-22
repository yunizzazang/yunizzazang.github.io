// STUDY 02 — Simple Glow Particles
let pts = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  background(10);
  for (let i = 0; i < 1600; i++) {
    pts.push({ x: random(width), y: random(height), vx: 0, vy: 0 });
  }
}

function draw() {
  noStroke();
  fill(10, 22);
  rect(0, 0, width, height);

  stroke(240, 160);
  strokeWeight(1);

  for (let p of pts) {
    // 부드러운 흐름
    let a = noise(p.x * 0.002, p.y * 0.002, frameCount * 0.002) * TWO_PI * 2;
    p.vx += cos(a) * 0.12;
    p.vy += sin(a) * 0.12;

    // 마우스 반발
    let dx = p.x - mouseX;
    let dy = p.y - mouseY;
    let d2 = dx * dx + dy * dy + 60;
    let f = 800 / d2;
    p.vx += dx * f;
    p.vy += dy * f;

    p.vx *= 0.9;
    p.vy *= 0.9;

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
      p.x = random(width); p.y = random(height);
      p.vx = p.vy = 0;
    }

    point(p.x, p.y);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(10);
}
