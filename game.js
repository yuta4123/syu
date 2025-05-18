// 画像ロード
const playerImg = new Image(); playerImg.src = "/syu/file/mikata.jpeg";
const tekiImg1 = new Image(); tekiImg1.src = "/syu/file/teki.jpeg";
const tekiImg2 = new Image(); tekiImg2.src = "/syu/file/teki2.jpeg";
const tekiImg3 = new Image(); tekiImg3.src = "/syu/file/teki3.jpeg";
const makeImg = new Image(); makeImg.src = "/syu/file/make.jpeg";
const rasubosuImg = new Image(); rasubosuImg.src = "/syu/file/rasubosu.jpeg";
const powerImg = new Image(); powerImg.src = "/syu/file/power.jpeg";

const enemyTypes = [
  { img: tekiImg1, w: 60, h: 60, hp: 1, speed: 3, shotInterval: 90 },
  { img: tekiImg2, w: 70, h: 70, hp: 2, speed: 2, shotInterval: 70 },
  { img: tekiImg3, w: 90, h: 90, hp: 3, speed: 1.5, shotInterval: 50 },
];

// ラスボスパラメータ
const bossParam = {
  img: rasubosuImg,
  w: 200, h: 200,
  hp: 30,
  shotInterval: 25,
  speed: 2
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const btnRestart = document.getElementById('btnRestart');

let player, bullets, enemies, enemyBullets, score, keyState, playing, powerUp, powerTime, boss, bossMode, bossBullets, gameState, bestScore;

function resetGame() {
  player = { x: 370, y: 500, w: 64, h: 64, speed: 5 };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  bossBullets = [];
  score = 0;
  keyState = {};
  playing = true;
  powerUp = false;
  powerTime = 0;
  boss = null;
  bossMode = false;
  gameState = 'playing';
  spawnTimer = 0;
  bossAppearEffect = 0;
}

document.addEventListener('keydown', e => { keyState[e.key] = true; });
document.addEventListener('keyup', e => { keyState[e.key] = false; });

startBtn.onclick = function() {
  resetGame();
  startBtn.style.display = 'none';
  retryBtn.style.display = 'none';
  btnRestart.style.display = 'none';
  loop();
};
retryBtn.onclick = function() {
  resetGame();
  retryBtn.style.display = 'none';
  startBtn.style.display = 'none';
  btnRestart.style.display = 'none';
  loop();
};
btnRestart.onclick = function() {
  resetGame();
  btnRestart.style.display = 'none';
  retryBtn.style.display = 'none';
  startBtn.style.display = 'none';
  loop();
};

// モバイル操作ボタン
const mbKeys = {
  btnLeft: 'ArrowLeft',
  btnRight: 'ArrowRight',
  btnUp: 'ArrowUp',
  btnDown: 'ArrowDown',
  btnShot: ' ',
};
Object.keys(mbKeys).forEach(id => {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.ontouchstart = btn.onmousedown = e => { e.preventDefault(); keyState[mbKeys[id]] = true; };
  btn.ontouchend = btn.onmouseup = e => { e.preventDefault(); keyState[mbKeys[id]] = false; };
  btn.ontouchcancel = e => { e.preventDefault(); keyState[mbKeys[id]] = false; };
  btn.onmouseleave = e => { keyState[mbKeys[id]] = false; };
});

// スマホ画面調整
function resizeGame() {
  if(window.innerWidth < 850) {
    canvas.width = window.innerWidth;
    canvas.height = Math.round(window.innerWidth * 0.75);
  } else {
    canvas.width = 800;
    canvas.height = 600;
  }
}
window.addEventListener('resize', resizeGame);
resizeGame();

// ゲームループ
let spawnTimer = 0, bossAppearEffect = 0;
function loop() {
  if (!playing) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

// 敵スポーン
function spawnEnemy() {
  const t = Math.floor(Math.random()*3);
  const type = enemyTypes[t];
  enemies.push({
    ...type,
    x: Math.random()*(canvas.width-type.w),
    y: -type.h,
    hp: type.hp,
    shotCooldown: 0,
    type: t
  });
}

// パワーアップスポーン
let powerItem = null;
function spawnPowerUp() {
  powerItem = {
    x: Math.random()*(canvas.width-48),
    y: -48,
    w: 48, h: 48,
    vy: 2
  };
}

// 弾と物体当たり判定
function hit(a, b) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function update() {
  // 自機移動
  if (keyState['ArrowLeft'] && player.x > 0) player.x -= player.speed;
  if (keyState['ArrowRight'] && player.x < canvas.width-player.w) player.x += player.speed;
  if (keyState['ArrowUp'] && player.y > 0) player.y -= player.speed;
  if (keyState['ArrowDown'] && player.y < canvas.height-player.h) player.y += player.speed;
  // 弾発射
  if (keyState[' '] && (!player.lastShot || Date.now()-player.lastShot>180)) {
    bullets.push({x:player.x+player.w/2-3,y:player.y,w:6,h:16,vy:-12});
    if (powerUp) {
      bullets.push({x:player.x+player.w/2-20,y:player.y,w:6,h:16,vy:-10,vx:-4});
      bullets.push({x:player.x+player.w/2+14,y:player.y,w:6,h:16,vy:-10,vx:4});
    }
    player.lastShot = Date.now();
  }
  // 弾移動
  for(let b of bullets) {
    b.y += b.vy;
    b.x += b.vx||0;
  }
  bullets = bullets.filter(b=>b.y>-30&&b.x>-10&&b.x<canvas.width+10);
  // 雑魚敵出現
  if (!bossMode) {
    spawnTimer++;
    if (spawnTimer>40) { spawnEnemy(); spawnTimer=0; }
  }
  // 雑魚敵・攻撃・移動
  for(let e of enemies) {
    e.y += e.speed;
    // 敵弾発射
    e.shotCooldown++;
    if (e.shotCooldown>=e.shotInterval) {
      enemyBullets.push({x:e.x+e.w/2-8, y:e.y+e.h, w:16,h:16,vy:4,img:e.img});
      e.shotCooldown=0;
    }
  }
  enemies = enemies.filter(e=>e.y<canvas.height+60&&e.hp>0);
  // 敵弾移動
  for(let b of enemyBullets) b.y+=b.vy;
  enemyBullets = enemyBullets.filter(b=>b.y<canvas.height+20);
  // パワーアップ出現
  if (!powerItem && Math.random()<0.002 && !bossMode) spawnPowerUp();
  if (powerItem) {
    powerItem.y += powerItem.vy;
    if (powerItem.y > canvas.height+40) powerItem = null;
    if (hit(player, powerItem)) {
      powerUp = true; powerTime = 600; powerItem = null;
    }
  }
  // パワーアップ効果時間
  if (powerUp) {
    powerTime--;
    if (powerTime<=0) powerUp=false;
  }
  // 自弾 vs 敵
  for(let i=enemies.length-1;i>=0;i--) {
    let e = enemies[i];
    for(let j=bullets.length-1;j>=0;j--) {
      let b = bullets[j];
      if(hit(e,b)) {
        e.hp--;
        bullets.splice(j,1);
        if(e.hp<=0) {score+=100*(e.type+1);enemies.splice(i,1);}
        break;
      }
    }
  }
  // 敵弾 vs 自機
  for(let b of enemyBullets) {
    if(hit(player,b)) { playing=false; gameState='gameover'; showRetry(); }
  }
  // 敵 vs 自機
  for(let e of enemies) {
    if(hit(player,e)) { playing=false; gameState='gameover'; showRetry(); }
  }
  // スコアでラスボス出現
  if (!bossMode && score>=5000) {
    bossMode=true; boss={...bossParam, x:300,y:30,hp:bossParam.hp,shotTimer:0,dir:1};
    bossBullets = [];
    bossAppearEffect = 60;
  }
  // ボス行動
  if (bossMode && boss) {
    boss.x += boss.speed*boss.dir;
    if (boss.x<0||boss.x+boss.w>canvas.width) boss.dir*=-1;
    boss.shotTimer++;
    // ボス3WAY弾
    if (boss.shotTimer>boss.shotInterval) {
      bossBullets.push({x:boss.x+boss.w/2-8, y:boss.y+boss.h, w:16, h:16, vy:6, vx:0, img:boss.img});
      bossBullets.push({x:boss.x+boss.w/2-28, y:boss.y+boss.h, w:16, h:16, vy:5, vx:-3, img:boss.img});
      bossBullets.push({x:boss.x+boss.w/2+12, y:boss.y+boss.h, w:16, h:16, vy:5, vx:3, img:boss.img});
      boss.shotTimer=0;
    }
    // 弾移動
    for(let b of bossBullets) { b.y+=b.vy; b.x+=b.vx; }
    bossBullets = bossBullets.filter(b=>b.y<canvas.height+20);
    // 当たり判定
    for(let j=bullets.length-1;j>=0;j--) {
      let b = bullets[j];
      if(hit(boss,b)) {
        boss.hp--;
        bullets.splice(j,1);
        if(boss.hp<=0) {boss=null; playing=false; gameState='clear'; showRetry(); score+=3000;}
      }
    }
    // ボス弾 vs 自機
    for(let b of bossBullets) if(hit(player,b)) {playing=false;gameState='gameover';showRetry();}
  }
}

function showRetry() {
  retryBtn.style.display = 'inline-block';
  btnRestart.style.display = 'inline-block';
}

// --- draw関数 ---
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#222";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#fff";
  ctx.font = "24px sans-serif";
  ctx.fillText("SCORE: "+score, 10, 30);
  if(powerUp) {
    ctx.drawImage(powerImg, 120, 6, 28, 28);
    ctx.fillStyle="#ff0";ctx.font="18px sans-serif";
    ctx.fillText("POWER UP!!", 155, 28);
  }
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  ctx.fillStyle="#ff3";
  for(let b of bullets) ctx.fillRect(b.x,b.y,b.w,b.h);
  for(let e of enemies) ctx.drawImage(e.img, e.x, e.y, e.w, e.h);
  for(let b of enemyBullets) ctx.drawImage(b.img, b.x, b.y, 16, 16);
  if (typeof powerItem !== 'undefined' && powerItem) ctx.drawImage(powerImg, powerItem.x, powerItem.y, powerItem.w, powerItem.h);
  if(bossMode && boss) {
    if(bossAppearEffect>0) {ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();bossAppearEffect--;}
    ctx.drawImage(boss.img, boss.x, boss.y, boss.w, boss.h);
    ctx.fillStyle="#000";ctx.fillRect(boss.x, boss.y-16, boss.w, 12);
    ctx.fillStyle="#f55";ctx.fillRect(boss.x, boss.y-16, boss.w * boss.hp/bossParam.hp, 12);
    for(let b of bossBullets) ctx.drawImage(b.img, b.x, b.y, 16, 16);
  }
  if(gameState==='gameover') {
    ctx.globalAlpha=0.9;ctx.fillStyle="#222";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;
    ctx.drawImage(makeImg, canvas.width/2-150, 80, 300, 220);
    ctx.fillStyle="#fff";
    ctx.font = "28px sans-serif";
    ctx.fillText("いやー惜しかった！絶対次は行ける！", 90, 350);
    ctx.fillText("いやまじで！ここまで努力している人は見たことない！", 20, 390);
    ctx.fillText("いや煽りじゃないって（笑）", 200, 430);
  }
  if(gameState==='clear') {
    ctx.globalAlpha=0.85;ctx.fillStyle="#111";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;
    ctx.drawImage(rasubosuImg, canvas.width/2-120, 100, 240, 200);
    ctx.fillStyle="#ff0"; ctx.font = "48px sans-serif";
    ctx.fillText("クリア！おめでとう！", 180, 350);
    ctx.font = "28px sans-serif";
    ctx.fillText("スコア: "+score, 320, 400);
  }
}
