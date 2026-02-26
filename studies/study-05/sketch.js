// p5.js WEBGL sketch
// 키보드 입력마다 3D 막대(라인 세그먼트) 파티클 폭발
// 연타(간격 짧음)일수록 더 멀리/화려하게 퍼짐
// 색: 메인 #7D39EB, 서브 #C6FF33 (2색만)

// ---- 팔레트 ----
const MAIN = [0x7D, 0x39, 0xEB]; // #7D39EB
const SUB  = [0xC6, 0xFF, 0x33]; // #C6FF33

// 서브색(라임) 비율: 낮출수록 덜 튐
const SUB_RATIO = 0.22;

// 잔상 강도: 숫자가 클수록 잔상이 빨리 사라짐(덜 쌓임)
const TRAIL_ALPHA = 26;

// 배경
const BG = [8, 9, 12];

let sticks = [];
let lastKeyTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  strokeCap(ROUND);
}

function draw() {
  // 잔상 만들기: 반투명한 배경을 매 프레임 덮음
  push();
  resetMatrix(); // 2D처럼 화면 전체 rect 깔기 위해
  translate(-width / 2, -height / 2);
  noStroke();
  fill(BG[0], BG[1], BG[2], TRAIL_ALPHA);
  rect(0, 0, width, height);
  pop();

  // 살짝 카메라 느낌(너무 어지럽지 않게 아주 약하게)
  rotateY((mouseX / width - 0.5) * 0.25);
  rotateX((mouseY / height - 0.5) * 0.18);

  // 막대 업데이트/드로우
  // (가볍게 Add 느낌을 주고 싶으면 아래 주석 해제)
  // blendMode(ADD);

  for (let i = sticks.length - 1; i >= 0; i--) {
    sticks[i].update();
    sticks[i].draw();
    if (sticks[i].dead) sticks.splice(i, 1);
  }

  // blendMode(BLEND);

  // 안내 텍스트
  push();
  resetMatrix();
  translate(-width / 2, -height / 2);
  fill(255, 210);
  noStroke();
  textSize(13);
  text("키보드를 두드리면 막대 파티클이 터져요. 연타할수록 더 멀리/많이 퍼집니다.", 16, 24);
  pop();
}

function keyPressed() {
  const now = millis();
  const dt = lastKeyTime === 0 ? 200 : (now - lastKeyTime);
  lastKeyTime = now;

  // dt 작을수록 intensity↑
  const intensity = map(constrain(dt, 35, 420), 420, 35, 0.18, 1.0);

  // 폭발 중심 (3D 공간에서 중앙 근처)
  const cx = random(-80, 80);
  const cy = random(-60, 60);
  const cz = random(-120, 120) * lerp(0.5, 1.2, intensity);

  spawnBurst(cx, cy, cz, intensity);
}

function spawnBurst(x, y, z, intensity) {
  const count = floor(lerp(30, 160, intensity));       // 막대 수
  const baseSpeed = lerp(2.0, 10.5, intensity);        // 속도
  const baseLen = lerp(10, 46, intensity);             // 막대 길이
  const life = floor(lerp(40, 120, intensity));        // 수명
  const depthSpread = lerp(0.6, 1.4, intensity);       // z방향 확장
  const w = random(0.35, 0.9);  // 아주 얇은 막대 기본 두께

  for (let i = 0; i < count; i++) {
    // 구 형태로 퍼지게 방향 벡터 생성
    const dir = p5.Vector.random3D();
    dir.z *= depthSpread;

    const speed = baseSpeed * random(0.55, 1.35);
    const vel = dir.mult(speed);

    // 막대는 자기 방향과 약간 다른 “회전축”을 가져서 더 생동감
    const spin = p5.Vector.random3D().mult(random(0.02, 0.08));

    // 두께(연타일수록 살짝 두꺼워짐)
    const w = lerp(0.45, 1.05, intensity) * random(0.75, 1.05);

    // 길이 랜덤
    const len = baseLen * random(0.7, 1.35);

    // 색은 2개만 (메인은 대부분, 서브는 포인트)
    const col = (random() < SUB_RATIO) ? SUB : MAIN;

    sticks.push(new Stick(x, y, z, vel, spin, len, w, life, col));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ------------------ Stick Particle ------------------

class Stick {
  constructor(x, y, z, vel, spin, len, weight, life, col) {
    this.pos = createVector(x, y, z);
    this.vel = vel.copy();
    this.spin = spin.copy();

    // 막대의 방향(로컬 축)
    this.axis = p5.Vector.random3D();

    this.len = len;
    this.w = weight;

    this.life = life;
    this.maxLife = life;

    this.col = col;

    this.dead = false;
  }

  update() {
    // 이전보다 살짝 감속 + 아주 약한 중력
    this.vel.mult(0.972);
    this.vel.y += 0.02;

    this.pos.add(this.vel);

    // 막대 방향을 조금씩 회전(간단히 축 벡터에 작은 변화)
    this.axis.add(this.spin).normalize();

    this.life -= 1;
    if (this.life <= 0) this.dead = true;
  }

  draw() {
  const t = this.life / this.maxLife;      // 1 -> 0
  const a = 210 * pow(t, 1.35);            // 알파 (너무 번쩍이지 않게)

  // 막대 방향(axis)을 yaw/pitch로 변환해서 box를 그 방향으로 돌림
  const v = this.axis;
  const yaw = atan2(v.x, v.z);
  const pitch = -asin(constrain(v.y, -1, 1));

  // 시간이 지날수록 더 얇아지게(레퍼런스 감성)
  const thick = this.w * (0.35 + 0.65 * pow(t, 1.2));
  const len = this.len;

  push();
  translate(this.pos.x, this.pos.y, this.pos.z);
  rotateY(yaw);
  rotateX(pitch);

  noStroke();
  ambientMaterial(this.col[0], this.col[1], this.col[2], a);

  // “얇은 사각형 3D 막대”
  box(len, thick, thick);

  pop();
}
}
