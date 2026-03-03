document.addEventListener("DOMContentLoaded", () => {
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const STATE = { START:0, PLAYING:1 };
let gameState = STATE.START;


const player = {
    x: canvas.width/2,
    y: canvas.height-120,
    r: 18,
    speed: 5,
    health: 5,
    inv: 0
};
let enemies = [];
let enemyBullets = [];
let bullets = [];
let particles = [];
let score = 0;
let spawnTimer = 0;
let keys = {};
let dragging = false;
window.addEventListener("keydown", e=>{
    keys[e.key.toLowerCase()] = true;
    if(e.key==="Enter" && gameState===STATE.PLAYING) shoot();
});
window.addEventListener("keyup", e=>keys[e.key.toLowerCase()] = false);

canvas.addEventListener("pointerdown", e=>{
    if(gameState!==STATE.PLAYING) return;
    if(Math.hypot(e.clientX-player.x, e.clientY-player.y)<player.r*2)
        dragging = true;
});
canvas.addEventListener("pointermove", e=>{
    if(dragging){
        player.x = e.clientX;
        player.y = e.clientY;
    }
});
canvas.addEventListener("pointerup", ()=>dragging=false);
const startScreen = document.getElementById("startScreen");
const shootBtn = document.getElementById("shootBtn");
const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const highScoresEl = document.getElementById("highScores");
document.getElementById("startBtn").onclick = startGame;
shootBtn.onclick = shoot;
canvas.style.pointerEvents = "none";

function getHighScores(){
    return JSON.parse(localStorage.getItem("dragShooterScores")) || [];
}

function saveHighScore(newScore){
    let scores = getHighScores();
    scores.push(newScore);
    scores.sort((a,b)=>b-a);
    scores = scores.slice(0,3);
    localStorage.setItem("dragShooterScores", JSON.stringify(scores));
}

function showHighScores(){
    const scores = getHighScores();
    if(scores.length===0){
        highScoresEl.innerHTML = "<b>No scores yet</b>";
        return;
    }
    highScoresEl.innerHTML = `
        <b>🏆 Top Scores</b><br>
        🥇 ${scores[0] ?? "-"}<br>
        🥈 ${scores[1] ?? "-"}<br>
        🥉 ${scores[2] ?? "-"}
    `;
}

function startGame(){
    gameState = STATE.PLAYING;
    enemies = [];
    enemyBullets = [];
    bullets = [];
    particles = [];
    score = 0;
    spawnTimer = 0;
    player.x = canvas.width/2;
    player.y = canvas.height-120;
    player.health = 5;
    player.inv = 0;

    startScreen.style.display = "none";
    shootBtn.style.display = "block";
    canvas.style.pointerEvents = "auto";
}

function shoot(){
    bullets.push({
        x: player.x,
        y: player.y,
        r: 5,
        vy: -8
    });
}

function spawnEnemy(){
    enemies.push({
        x: Math.random()*canvas.width,
        y: -30,
        r: 18,
        speed: 2,
        shootCD: Math.random()*80+40
    });
}

function enemyShoot(e){
    enemyBullets.push({
        x: e.x,
        y: e.y,
        r: 6,
        vy: 5
    });
}

function hit(a,b){
    return Math.hypot(a.x-b.x, a.y-b.y) < a.r + b.r;
}

function damagePlayer(){
    if(player.inv>0) return;
    player.health--;
    player.inv = 45;
    explode(player.x, player.y);

    if(player.health<=0){
        endGame();
    }
}

function explode(x,y){
    for(let i=0;i<15;i++){
        particles.push({
            x,y,
            vx:(Math.random()-0.5)*5,
            vy:(Math.random()-0.5)*5,
            life:30
        });
    }
}

function update(){
    if(gameState!==STATE.PLAYING) return;

    if(keys["a"]) player.x-=player.speed;
    if(keys["d"]) player.x+=player.speed;
    if(keys["w"]) player.y-=player.speed;
    if(keys["s"]) player.y+=player.speed;

    player.x = Math.max(player.r, Math.min(canvas.width-player.r, player.x));
    player.y = Math.max(player.r, Math.min(canvas.height-player.r, player.y));

    if(player.inv>0) player.inv--;

    spawnTimer++;
    if(spawnTimer>30){
        spawnEnemy();
        spawnTimer=0;
    }

    bullets.forEach(b=>b.y+=b.vy);
    bullets = bullets.filter(b=>b.y>-50);

    for(let i=enemies.length-1;i>=0;i--){
        const e = enemies[i];
        e.y+=e.speed;
        e.shootCD--;

        if(e.shootCD<=0){
            enemyShoot(e);
            e.shootCD=Math.random()*80+40;
        }

        if(hit(e,player)){
            enemies.splice(i,1);
            damagePlayer();
            continue;
        }

        for(let b=bullets.length-1;b>=0;b--){
            if(hit(e,bullets[b])){
                bullets.splice(b,1);
                enemies.splice(i,1);
                score+=10;
                explode(e.x,e.y);
                break;
            }
        }
    }

    for(let i=enemyBullets.length-1;i>=0;i--){
        enemyBullets[i].y+=enemyBullets[i].vy;
        if(enemyBullets[i].y>canvas.height+50) enemyBullets.splice(i,1);
        else if(hit(enemyBullets[i],player)){
            enemyBullets.splice(i,1);
            damagePlayer();
        }
    }

    particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy; p.life--;
    });
    particles=particles.filter(p=>p.life>0);

    scoreEl.textContent=score;
    healthEl.textContent=player.health;
}

function endGame(){
    saveHighScore(score);
    showHighScores();

    gameState = STATE.START;
    canvas.style.pointerEvents = "none";
    shootBtn.style.display = "none";
    startScreen.style.display = "flex";
}

function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(player.inv%10<5){
        ctx.fillStyle="#22d3ee";
        ctx.beginPath();
        ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
        ctx.fill();
    }

    ctx.fillStyle="#facc15";
    bullets.forEach(b=>{
        ctx.beginPath();
        ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.fill();
    });

    ctx.fillStyle="#ff0000";
    enemyBullets.forEach(b=>{
        ctx.beginPath();
        ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
        ctx.fill();
    });

    ctx.fillStyle="#ef4444";
    enemies.forEach(e=>{
        ctx.beginPath();
        ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
        ctx.fill();
    });

    ctx.fillStyle="#e5e7eb";
    particles.forEach(p=>ctx.fillRect(p.x,p.y,2,2));
}

function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();

showHighScores(); 

});