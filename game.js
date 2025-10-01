const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const DESIGN_WIDTH = 900;
const DESIGN_HEIGHT = 600;
let scaleX = 1;
let scaleY = 1;

const commandPointsEl = document.getElementById("commandPoints");
const escapedEl = document.getElementById("escaped");
const statusEl = document.getElementById("status");
const restartButton = document.getElementById("restartButton");

const unitButtons = Array.from(document.querySelectorAll("button[data-unit]"));

const TARGET_ESCAPED = 20;
const BASE_POINTS = 60;
const POINTS_PER_SECOND = 12;
let commandPoints = BASE_POINTS;
let escapedCount = 0;
let gameOver = false;
let timeElapsed = 0;
let lastMotivation = -Infinity;

const path = [
  { x: 40, y: 560 },
  { x: 40, y: 420 },
  { x: 220, y: 420 },
  { x: 220, y: 220 },
  { x: 420, y: 220 },
  { x: 420, y: 520 },
  { x: 740, y: 520 },
  { x: 740, y: 120 },
  { x: 860, y: 120 },
];

const unitTypes = {
  scout: {
    name: "Scout",
    speed: 120,
    health: 35,
    radius: 10,
    color: "#22d3ee",
    cost: 30,
  },
  bruiser: {
    name: "Bruiser",
    speed: 80,
    health: 90,
    radius: 12,
    color: "#f97316",
    cost: 55,
  },
  tank: {
    name: "Tank",
    speed: 55,
    health: 180,
    radius: 14,
    color: "#a855f7",
    cost: 90,
  },
};

class Unit {
  constructor(type) {
    this.type = type;
    this.speed = type.speed;
    this.maxHealth = type.health;
    this.health = type.health;
    this.radius = type.radius;
    this.color = type.color;
    this.pathIndex = 0;
    this.position = { x: path[0].x, y: path[0].y };
    this.alive = true;
  }

  update(dt) {
    if (!this.alive) return;
    const nextPoint = path[this.pathIndex + 1];
    if (!nextPoint) {
      this.alive = false;
      escapedCount += 1;
      escapedEl.textContent = escapedCount.toString();
      if (escapedCount >= TARGET_ESCAPED) {
        endGame(true);
      }
      return;
    }

    const dx = nextPoint.x - this.position.x;
    const dy = nextPoint.y - this.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) {
      this.pathIndex += 1;
      return;
    }

    const travel = this.speed * dt;
    if (travel >= distance) {
      this.position.x = nextPoint.x;
      this.position.y = nextPoint.y;
      this.pathIndex += 1;
    } else {
      this.position.x += (dx / distance) * travel;
      this.position.y += (dy / distance) * travel;
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}

class Tower {
  constructor(x, y, options = {}) {
    this.position = { x, y };
    this.range = options.range ?? 180;
    this.fireRate = options.fireRate ?? 1.2; // shots per second
    this.cooldown = 0;
    this.projectileSpeed = options.projectileSpeed ?? 320;
    this.damage = options.damage ?? 30;
  }

  update(dt, units) {
    this.cooldown -= dt;
    if (this.cooldown > 0 || gameOver) return;

    let target = null;
    let maxProgress = -Infinity;
    for (const unit of units) {
      if (!unit.alive) continue;
      const distance = Math.hypot(
        unit.position.x - this.position.x,
        unit.position.y - this.position.y
      );
      if (distance <= this.range) {
        const progress = unit.pathIndex + distance * 0.001;
        if (progress > maxProgress) {
          maxProgress = progress;
          target = unit;
        }
      }
    }

    if (target) {
      projectiles.push(
        new Projectile(this.position, target, {
          speed: this.projectileSpeed,
          damage: this.damage,
        })
      );
      this.cooldown = 1 / this.fireRate;
    }
  }

  draw() {
    const { x, y } = this.position;
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class Projectile {
  constructor(origin, target, options = {}) {
    this.position = { x: origin.x, y: origin.y };
    this.target = target;
    this.speed = options.speed ?? 300;
    this.damage = options.damage ?? 25;
    this.radius = 4;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    if (!this.target.alive) {
      this.active = false;
      return;
    }

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.hypot(dx, dy);
    const travel = this.speed * dt;

    if (distance <= this.target.radius + this.radius || travel >= distance) {
      this.target.takeDamage(this.damage);
      this.active = false;
      return;
    }

    this.position.x += (dx / distance) * travel;
    this.position.y += (dy / distance) * travel;
  }

  draw() {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const units = [];
const towers = [];
const projectiles = [];
let animationFrameId = null;

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  let { clientWidth, clientHeight } = canvas;
  if (!clientWidth) {
    return;
  }

  if (!clientHeight) {
    clientHeight = (clientWidth * DESIGN_HEIGHT) / DESIGN_WIDTH;
  }

  const width = Math.round(clientWidth * ratio);
  const height = Math.round(clientHeight * ratio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  scaleX = canvas.width / DESIGN_WIDTH;
  scaleY = canvas.height / DESIGN_HEIGHT;
}

function createTowers() {
  towers.length = 0;
  towers.push(new Tower(160, 380, { fireRate: 1.4, range: 200 }));
  towers.push(new Tower(340, 260, { fireRate: 1.2, damage: 35 }));
  towers.push(new Tower(520, 420, { fireRate: 1.5, projectileSpeed: 360 }));
  towers.push(new Tower(640, 200, { fireRate: 0.9, damage: 48, range: 220 }));
  towers.push(new Tower(820, 300, { fireRate: 1.1, range: 210 }));
}

function spawnUnit(key) {
  if (gameOver) return;
  const type = unitTypes[key];
  if (!type) return;
  if (commandPoints < type.cost) {
    flashStatus(`Not enough command points for a ${type.name}.`);
    return;
  }
  commandPoints -= type.cost;
  units.push(new Unit(type));
  flashStatus(`${type.name} deployed!`);
}

function flashStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.add("visible");
  setTimeout(() => statusEl.classList.remove("visible"), 800);
}

function endGame(victory) {
  if (gameOver) return;
  gameOver = true;
  statusEl.textContent = victory
    ? "Raid successful! You overwhelmed the defenses."
    : "The towers held. Recalibrate your assault.";
  statusEl.classList.add("visible");
}

function updateCommandPoints(dt) {
  if (gameOver) return;
  commandPoints = Math.min(
    200,
    commandPoints + POINTS_PER_SECOND * dt
  );
  commandPointsEl.textContent = Math.floor(commandPoints).toString();
}

function update(dt) {
  timeElapsed += dt;
  updateCommandPoints(dt);

  for (const unit of units) {
    unit.update(dt);
  }

  for (const tower of towers) {
    tower.update(dt, units);
  }

  for (const projectile of projectiles) {
    projectile.update(dt);
  }

  for (let i = units.length - 1; i >= 0; i--) {
    if (!units[i].alive) {
      units.splice(i, 1);
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (!projectiles[i].active) {
      projectiles.splice(i, 1);
    }
  }

  if (
    !gameOver &&
    units.length === 0 &&
    commandPoints < 30 &&
    timeElapsed - lastMotivation > 3
  ) {
    // no units on the map and not enough points for the cheapest unit
    // gently nudge the player to keep trying
    flashStatus("Regroup! Save up for more units.");
    lastMotivation = timeElapsed;
  }
}

function drawBackground() {
  ctx.save();
  ctx.fillStyle = "rgba(12, 20, 32, 0.9)";
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  ctx.fillStyle = "#ef4444";
  const base = path[path.length - 1];
  ctx.beginPath();
  ctx.arc(base.x, base.y, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#22c55e";
  const start = path[0];
  ctx.beginPath();
  ctx.arc(start.x, start.y, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUnits() {
  for (const unit of units) {
    if (!unit.alive) continue;
    ctx.save();
    ctx.fillStyle = unit.color;
    ctx.beginPath();
    ctx.arc(unit.position.x, unit.position.y, unit.radius, 0, Math.PI * 2);
    ctx.fill();

    // health bar
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(
      unit.position.x - unit.radius,
      unit.position.y - unit.radius - 8,
      unit.radius * 2,
      4
    );
    const healthWidth = (unit.health / unit.maxHealth) * unit.radius * 2;
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(
      unit.position.x - unit.radius,
      unit.position.y - unit.radius - 8,
      healthWidth,
      4
    );
    ctx.restore();
  }
}

function drawTowers() {
  for (const tower of towers) {
    tower.draw();
  }
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    projectile.draw();
  }
}

let lastTime = performance.now();

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  update(dt);
  resizeCanvas();
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  drawBackground();
  drawTowers();
  drawUnits();
  drawProjectiles();

  if (!gameOver) {
    animationFrameId = requestAnimationFrame(gameLoop);
  } else {
    animationFrameId = null;
    drawOverlay();
  }
}

function drawOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 36px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    escapedCount >= TARGET_ESCAPED ? "Victory!" : "Defeat",
    DESIGN_WIDTH / 2,
    DESIGN_HEIGHT / 2 - 10
  );
  ctx.font = "20px 'Segoe UI', sans-serif";
  ctx.fillText(
    escapedCount >= TARGET_ESCAPED
      ? "Your raiders breached the portal."
      : "The defense grid held strong this time.",
    DESIGN_WIDTH / 2,
    DESIGN_HEIGHT / 2 + 24
  );
  ctx.restore();
  restartButton.hidden = false;
}

function resetGame() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  units.length = 0;
  projectiles.length = 0;
  towers.length = 0;

  commandPoints = BASE_POINTS;
  escapedCount = 0;
  gameOver = false;
  timeElapsed = 0;
  lastMotivation = -Infinity;
  lastTime = performance.now();

  statusEl.textContent = "";
  statusEl.classList.remove("visible");
  commandPointsEl.textContent = commandPoints.toString();
  escapedEl.textContent = escapedCount.toString();
  restartButton.hidden = true;

  createTowers();
  animationFrameId = requestAnimationFrame(gameLoop);
}

unitButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const type = button.dataset.unit;
    spawnUnit(type);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === "1") spawnUnit("scout");
  if (event.key === "2") spawnUnit("bruiser");
  if (event.key === "3") spawnUnit("tank");
  if (event.key.toLowerCase() === "r" && gameOver) {
    resetGame();
  }
});

restartButton.addEventListener("click", resetGame);

createTowers();
commandPointsEl.textContent = commandPoints.toString();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
restartButton.hidden = true;
animationFrameId = requestAnimationFrame(gameLoop);
