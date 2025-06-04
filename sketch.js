// 淡江大學教育科技系 雙手操控賽車遊戲
// 使用 ml5.js handPose

let video;
let handPose;
let hands = [];

let carX, carY;
let carWidth = 60;
let carHeight = 100;
let score = 0;
let gameOver = false;
let infoText = '';

let items = [];
let itemTypes = [
  { name: '數位教材', color: '#4A90E2', info: '數位教材讓學習資源更豐富、彈性！' },
  { name: '智慧教室', color: '#50E3C2', info: '智慧教室結合科技，提升教學互動與效率。' },
  { name: '線上學習', color: '#F5A623', info: '線上學習打破時空限制，隨時隨地都能學習。' },
  { name: 'AR/VR教具', color: '#B8E986', info: 'AR/VR讓抽象知識具象化，提升學習動機。' },
  { name: '學習管理系統', color: '#7B8D8E', info: 'LMS協助教師追蹤學習進度，個別化教學更容易。' },
  { name: '教育大數據', color: '#D0021B', info: '教育大數據分析，幫助精準掌握學習成效。' }
];
let obstacles = [];
let obstacleColor = '#333';

// 粒子特效陣列
let particles = [];

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();
  handPose.detectStart(video, gotHands);

  carX = width / 2;
  carY = height - carHeight - 10;
  score = 0;
  gameOver = false;
  infoText = '';
  items = [];
  obstacles = [];
}

function draw() {
  // 立體賽道背景（動態透視線條）
  background('#e6ecfa');
  let roadW = width * 0.6;
  let roadH = height * 1.2;
  let roadX = width / 2;
  let roadY = height * 0.6;
  push();
  noStroke();
  // 賽道本體
  fill(255,255,255,180);
  beginShape();
  vertex(roadX - roadW/2, height);
  vertex(roadX + roadW/2, height);
  vertex(roadX + roadW*0.18, roadY - roadH/2);
  vertex(roadX - roadW*0.18, roadY - roadH/2);
  endShape(CLOSE);
  // 賽道動態線條
  stroke(120,180,255,60);
  strokeWeight(2);
  for(let i=0;i<8;i++){
    let t = i/8;
    let x1 = lerp(roadX - roadW/2, roadX - roadW*0.18, t);
    let x2 = lerp(roadX + roadW/2, roadX + roadW*0.18, t);
    let y = lerp(height, roadY - roadH/2, t);
    line(x1, y, x2, y);
  }
  // 賽道邊線
  stroke(80,120,200,180);
  strokeWeight(5);
  noFill();
  beginShape();
  vertex(roadX - roadW/2, height);
  vertex(roadX - roadW*0.18, roadY - roadH/2);
  endShape();
  beginShape();
  vertex(roadX + roadW/2, height);
  vertex(roadX + roadW*0.18, roadY - roadH/2);
  endShape();
  pop();

  // 鏡頭畫面（右上角，圓角+陰影）
  let camW = 160;
  let camH = 120;
  let camX = width - camW - 20;
  let camY = 20;
  push();
  drawingContext.save();
  drawingContext.shadowColor = 'rgba(0,0,0,0.25)';
  drawingContext.shadowBlur = 16;
  drawingContext.beginPath();
  drawingContext.moveTo(camX + 20, camY);
  drawingContext.lineTo(camX + camW - 20, camY);
  drawingContext.quadraticCurveTo(camX + camW, camY, camX + camW, camY + 20);
  drawingContext.lineTo(camX + camW, camY + camH - 20);
  drawingContext.quadraticCurveTo(camX + camW, camY + camH, camX + camW - 20, camY + camH);
  drawingContext.lineTo(camX + 20, camY + camH);
  drawingContext.quadraticCurveTo(camX, camY + camH, camX, camY + camH - 20);
  drawingContext.lineTo(camX, camY + 20);
  drawingContext.quadraticCurveTo(camX, camY, camX + 20, camY);
  drawingContext.closePath();
  drawingContext.clip();
  image(video, camX, camY, camW, camH);
  drawingContext.restore();
  pop();

  // 主題標語（玻璃擬態）
  drawGlassBox(width / 2, 10, 420, 44, '淡江大學教育科技系 雙手賽車遊戲', 28, '#0056b3', true);
  // 分數（玻璃擬態）
  drawGlassBox(110, 70, 140, 36, '分數：' + score, 20, '#222', false);
  // 小知識提示（玻璃擬態）
  if (infoText) {
    let alpha = map(2000 - (millis() % 2000), 0, 2000, 0, 255);
    drawGlassBox(width / 2, 60, 340, 32, infoText, 18, '#d0021b', false, alpha);
  }

  if (gameOver) {
    fill(255, 0, 0, 220);
    textSize(36);
    textAlign(CENTER, CENTER);
    text('遊戲結束！', width / 2, height / 2);
    textSize(24);
    text('按F5重新開始', width / 2, height / 2 + 40);
    noLoop();
    return;
  }

  // 處理手勢控制賽車
  if (hands.length >= 2) {
    let hand1 = hands[0];
    let hand2 = hands[1];
    let idx1 = hand1.keypoints[8];
    let idx2 = hand2.keypoints[8];
    carX = constrain((idx1.x + idx2.x) / 2, width*0.2, width*0.8);
  } else if (hands.length === 1) {
    let idx = hands[0].keypoints[8];
    carX = constrain(idx.x, width*0.2, width*0.8);
  }

  // 畫賽車（高級版）
  drawCar(carX, height-120);

  // 物品生成時給 lane 屬性
  if (frameCount % 60 === 0) spawnItem();
  if (frameCount % 90 === 0) spawnObstacle();

  // 更新並畫道具（高級版：陰影、發光、縮放、粒子特效）
  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    item.z += 0.008;
    let y = lerp(80, height-60, item.z);
    let x = getLaneX(item.lane, item.z);
    let size = lerp(24, 60, item.z);
    item.y = y;
    item.x = x;
    // 發光
    for (let j = 3; j > 0; j--) {
      fill(item.type.color + hex(item.glow,2));
      ellipse(item.x, item.y, size + j*10, size + j*10);
    }
    // 陰影
    fill(0,40);
    ellipse(item.x, item.y+12, size, size/2);
    // 主體
    fill(item.type.color);
    ellipse(item.x, item.y, size, size);
    fill(255);
    textSize(size/2+2);
    textAlign(CENTER, CENTER);
    text(item.type.name, item.x, item.y);
    // 碰撞偵測
    if (
      item.y + size/2 > height-120 &&
      item.y - size/2 < height-20 &&
      abs(item.x - carX) < 40
    ) {
      score += 10;
      infoText = item.type.info;
      setTimeout(() => { infoText = ''; }, 2000);
      // 粒子特效
      for(let p=0;p<18;p++){
        particles.push({
          x: item.x,
          y: item.y,
          vx: cos(TWO_PI*p/18)*random(2,5),
          vy: sin(TWO_PI*p/18)*random(2,5),
          life: 30,
          color: item.type.color
        });
      }
      items.splice(i, 1);
    } else if (item.y > height + 20) {
      items.splice(i, 1);
    }
  }

  // 更新並畫障礙物（高級版：陰影、縮放）
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.z += 0.009;
    let y = lerp(80, height-60, obs.z);
    let x = getLaneX(obs.lane, obs.z);
    let size = lerp(28, 64, obs.z);
    obs.y = y;
    obs.x = x;
    fill(0,60);
    ellipse(obs.x, obs.y+12, size, size/2);
    fill('#333');
    rect(obs.x - size/2, obs.y - size/2, size, size, 8);
    if (
      obs.y + size/2 > height-120 &&
      obs.y - size/2 < height-20 &&
      abs(obs.x - carX) < 40
    ) {
      gameOver = true;
    }
    if (obs.y > height + 20) {
      obstacles.splice(i, 1);
    }
  }

  // 粒子特效顯示
  for(let i=particles.length-1;i>=0;i--){
    let p = particles[i];
    fill(p.color+hex(120,2));
    ellipse(p.x, p.y, 10, 10);
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    if(p.life<=0) particles.splice(i,1);
  }

  // 畫手勢操作提示
  drawHandHint();
}

// 高級版賽車
function drawCar(x, y) {
  push();
  rectMode(CENTER);
  // 車身
  fill('#0056b3');
  drawingContext.shadowColor = '#50e3c2';
  drawingContext.shadowBlur = 18;
  rect(x, y + 50, 60, 100, 22);
  // 車窗
  fill(255,255,255,200);
  drawingContext.shadowBlur = 0;
  rect(x, y + 30, 36, 28, 8);
  // 車燈
  fill('#ffe066');
  ellipse(x - 18, y + 10, 12, 8);
  ellipse(x + 18, y + 10, 12, 8);
  // 車輪
  fill(50);
  ellipse(x - 20, y + 90, 18, 18);
  ellipse(x + 20, y + 90, 18, 18);
  // 科技感線條
  stroke(255,255,255,80);
  strokeWeight(2);
  line(x - 18, y + 10, x + 18, y + 10);
  line(x, y + 50, x, y + 90);
  noStroke();
  pop();
}

// 玻璃擬態資訊框
function drawGlassBox(cx, cy, w, h, txt, txtSize, txtColor, bold, alpha=200) {
  push();
  rectMode(CENTER);
  noStroke();
  fill(255,255,255,alpha*0.8);
  drawingContext.shadowColor = 'rgba(80,200,255,0.18)';
  drawingContext.shadowBlur = 12;
  rect(cx, cy + h/2, w, h, 18);
  fill(txtColor);
  textSize(txtSize);
  textAlign(CENTER, CENTER);
  if (bold) textStyle(BOLD); else textStyle(NORMAL);
  if (txt === '淡江大學教育科技系 雙手賽車遊戲') {
    txt = '淡江大學教育科技系 單手操控賽車遊戲';
  }
  text(txt, cx, cy + h/2);
  pop();
}

// 畫手勢操作提示
function drawHandHint() {
  push();
  let y = height - 30;
  fill(255,255,255,180);
  rectMode(CENTER);
  rect(width/2, y, 220, 38, 18);
  fill('#0056b3');
  textSize(18);
  textAlign(CENTER, CENTER);
  text('請用單手食指左右移動控制賽車', width/2, y);
  pop();
}

// 物品生成時給 lane 屬性
function spawnItem() {
  let lane = random([-1, 0, 1]);
  let t = random(itemTypes);
  items.push({ lane: lane, z: 0, type: t, scale: 0.5+random(0.2), glow: random(80,180) });
}
function spawnObstacle() {
  let lane = random([-1, 0, 1]);
  obstacles.push({ lane: lane, z: 0, scale: 0.5+random(0.2) });
}

// 畫物品時根據 z/y 和 lane 計算 x 座標
function getLaneX(lane, z) {
  // 賽道上緣與下緣的 x
  let roadTopW = 120, roadBottomW = 400;
  let xTop = width/2 + lane * (roadTopW/3);
  let xBottom = width/2 + lane * (roadBottomW/3);
  return lerp(xTop, xBottom, z);
}
