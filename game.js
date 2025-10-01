const canvas =
  typeof document !== "undefined" ? document.getElementById("game") : null;
const ctx = canvas ? canvas.getContext("2d") : null;

const DESIGN_WIDTH = 900;
const DESIGN_HEIGHT = 600;
let scaleX = 1;
let scaleY = 1;

const commandPointsEl =
  typeof document !== "undefined"
    ? document.getElementById("commandPoints")
    : null;
const escapedEl =
  typeof document !== "undefined" ? document.getElementById("escaped") : null;
const targetTotalEl =
  typeof document !== "undefined"
    ? document.getElementById("targetTotal")
    : null;
const statusEl =
  typeof document !== "undefined" ? document.getElementById("status") : null;
const difficultyDescriptionEl =
  typeof document !== "undefined"
    ? document.getElementById("difficultyDescription")
    : null;
const restartButton =
  typeof document !== "undefined"
    ? document.getElementById("restartButton")
    : null;
const difficultySelect =
  typeof document !== "undefined"
    ? document.getElementById("difficulty")
    : null;

let unitButtons = [];

const FIREFLY_COUNT = 42;
const fireflies = Array.from({ length: FIREFLY_COUNT }, createFirefly);
const canopyRings = Array.from({ length: 7 }, createCanopyRing);

const difficultySettings = {
  recruit: {
    label: "Sprout Path",
    description: "Gentle pacing for new tenders of the trellis.",
    commandPoints: { start: 80, regen: 15 },
    targetEscaped: 15,
    towers: [
      { x: 160, y: 380, options: { fireRate: 1.2, range: 190 } },
      { x: 340, y: 260, options: { fireRate: 1.05, damage: 30 } },
      { x: 520, y: 420, options: { fireRate: 1.3, projectileSpeed: 340 } },
      { x: 640, y: 200, options: { fireRate: 0.8, damage: 44, range: 210 } },
      { x: 820, y: 300, options: { fireRate: 1.0, range: 200 } },
    ],
  },
  standard: {
    label: "Trellis Watch",
    description: "Balanced flow for seasoned caretakers.",
    commandPoints: { start: 60, regen: 12 },
    targetEscaped: 20,
    towers: [
      { x: 160, y: 380, options: { fireRate: 1.4, range: 200 } },
      { x: 340, y: 260, options: { fireRate: 1.2, damage: 35 } },
      { x: 520, y: 420, options: { fireRate: 1.5, projectileSpeed: 360 } },
      { x: 640, y: 200, options: { fireRate: 0.9, damage: 48, range: 220 } },
      { x: 820, y: 300, options: { fireRate: 1.1, range: 210 } },
    ],
  },
  veteran: {
    label: "Verdant Crown",
    description: "Demanding routes for mastery of the grove.",
    commandPoints: { start: 50, regen: 10 },
    targetEscaped: 25,
    towers: [
      { x: 160, y: 380, options: { fireRate: 1.6, range: 210, damage: 32 } },
      { x: 340, y: 260, options: { fireRate: 1.35, damage: 40 } },
      {
        x: 520,
        y: 420,
        options: { fireRate: 1.65, projectileSpeed: 380, damage: 32 },
      },
      { x: 640, y: 200, options: { fireRate: 1.05, damage: 52, range: 230 } },
      { x: 820, y: 300, options: { fireRate: 1.25, range: 220, damage: 34 } },
    ],
  },
};

const DEFAULT_DIFFICULTY = "standard";
let currentDifficultyKey = DEFAULT_DIFFICULTY;

if (typeof localStorage !== "undefined") {
  const savedDifficulty = localStorage.getItem("reverse-td:difficulty");
  if (savedDifficulty && difficultySettings[savedDifficulty]) {
    currentDifficultyKey = savedDifficulty;
  }
}

let currentDifficulty = difficultySettings[currentDifficultyKey];
let targetEscapedGoal = currentDifficulty.targetEscaped;
let commandPointRegen = currentDifficulty.commandPoints.regen;

const COMMAND_POINT_CAP = 200;

let commandPoints = currentDifficulty.commandPoints.start;
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
    name: "Seed Runner",
    speed: 120,
    health: 35,
    radius: 10,
    color: "#facc15",
    cost: 30,
    role: "Swift courier that lures tower attention away.",
  },
  bruiser: {
    name: "Lynx Warden",
    speed: 80,
    health: 90,
    radius: 12,
    color: "#34d399",
    cost: 55,
    role: "Protective warden shielding the caravan.",
  },
  tank: {
    name: "Grove Sentinel",
    speed: 55,
    health: 180,
    radius: 14,
    color: "#7c3aed",
    cost: 90,
    role: "Living bulwark that shrugs off concentrated fire.",
  },
};

function refreshDifficultyUi() {
  if (targetTotalEl) {
    targetTotalEl.textContent = targetEscapedGoal.toString();
  }
  if (difficultySelect && difficultySelect.value !== currentDifficultyKey) {
    difficultySelect.value = currentDifficultyKey;
  }
  if (difficultyDescriptionEl) {
    const description = currentDifficulty?.description ?? "";
    difficultyDescriptionEl.textContent = description;
    difficultyDescriptionEl.hidden = description.length === 0;
  }
}

function setDifficulty(key) {
  if (!difficultySettings[key]) {
    key = DEFAULT_DIFFICULTY;
  }
  currentDifficultyKey = key;
  currentDifficulty = difficultySettings[currentDifficultyKey];
  targetEscapedGoal = currentDifficulty.targetEscaped;
  commandPointRegen = currentDifficulty.commandPoints.regen;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("reverse-td:difficulty", currentDifficultyKey);
    } catch (error) {
      // ignore write failures (e.g., storage unavailable)
    }
  }
  refreshDifficultyUi();
}

function getCurrentDifficulty() {
  return currentDifficulty;
}

function buildUnitButtons(container) {
  const buttons = [];
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  Object.entries(unitTypes).forEach(([key, unit]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.unit = key;
    const ariaLabel = `Deploy ${unit.name} (Cost ${unit.cost}, Speed ${unit.speed}, Health ${unit.health}, Role ${unit.role})`;
    button.setAttribute("aria-label", ariaLabel);
    button.title = `${unit.name}\nCost: ${unit.cost}\nSpeed: ${unit.speed}\nHealth: ${unit.health}\nRole: ${unit.role}`;

    const name = document.createElement("span");
    name.className = "unit-name";
    name.textContent = `Deploy ${unit.name}`;
    button.appendChild(name);

    const cost = document.createElement("small");
    cost.className = "unit-cost";
    cost.textContent = `Cost: ${unit.cost}`;
    button.appendChild(cost);

    const stats = document.createElement("span");
    stats.className = "unit-stats";

    const speedStat = document.createElement("span");
    speedStat.className = "stat";
    speedStat.append("Speed ");
    const speedValue = document.createElement("strong");
    speedValue.textContent = unit.speed.toString();
    speedStat.appendChild(speedValue);
    stats.appendChild(speedStat);

    const healthStat = document.createElement("span");
    healthStat.className = "stat";
    healthStat.append("Health ");
    const healthValue = document.createElement("strong");
    healthValue.textContent = unit.health.toString();
    healthStat.appendChild(healthValue);
    stats.appendChild(healthStat);

    button.appendChild(stats);

    const role = document.createElement("span");
    role.className = "unit-role";
    role.textContent = `Role: ${unit.role}`;
    button.appendChild(role);

    fragment.appendChild(button);
    buttons.push(button);
  });

  container.appendChild(fragment);
  return buttons;
}

if (typeof document !== "undefined") {
  const buttonContainer = document.querySelector(".buttons");
  if (buttonContainer) {
    unitButtons = buildUnitButtons(buttonContainer);
  } else {
    unitButtons = Array.from(document.querySelectorAll("button[data-unit]"));
  }
}

if (difficultySelect) {
  difficultySelect.innerHTML = "";
  Object.entries(difficultySettings).forEach(([key, preset]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = preset.label;
    if (preset.description) {
      option.title = preset.description;
    }
    difficultySelect.appendChild(option);
  });
  difficultySelect.addEventListener("change", (event) => {
    setDifficulty(event.target.value);
    resetGame();
  });
  refreshDifficultyUi();
}

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
      if (escapedEl) {
        escapedEl.textContent = escapedCount.toString();
      }
      if (escapedCount >= targetEscapedGoal) {
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
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(8, 32, 18, 0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    const baseGradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 20);
    baseGradient.addColorStop(0, "rgba(214, 255, 229, 0.9)");
    baseGradient.addColorStop(1, "rgba(94, 201, 141, 0.95)");
    ctx.fillStyle = baseGradient;
    ctx.shadowColor = "rgba(140, 246, 192, 0.5)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "rgba(214, 255, 229, 0.85)";
    ctx.stroke();

    const pulse = 0.65 + Math.sin((timeElapsed + x * 0.01) * 2.2) * 0.2;
    ctx.fillStyle = `rgba(167, 255, 217, ${0.65 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(0, 0, 9 + pulse * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(186, 230, 199, 0.22)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8, 14]);
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
    ctx.shadowColor = "rgba(252, 255, 182, 0.6)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#f4d657";
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

function createTowers(towerLayout = currentDifficulty.towers) {
  towers.length = 0;
  for (const tower of towerLayout) {
    towers.push(new Tower(tower.x, tower.y, tower.options ?? {}));
  }
}

function spawnUnit(key) {
  if (gameOver) return;
  const type = unitTypes[key];
  if (!type) return;
  if (commandPoints < type.cost) {
    flashStatus(`Not enough harvest points to send a ${type.name}.`);
    return;
  }
  commandPoints -= type.cost;
  units.push(new Unit(type));
  flashStatus(`${type.name} underway!`);
}

function flashStatus(message) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.add("visible");
  setTimeout(() => statusEl.classList.remove("visible"), 800);
}

function endGame(victory) {
  if (gameOver) return;
  gameOver = true;
  if (statusEl) {
    statusEl.textContent = victory
      ? "Sanctuary secured! The trellis flourishes."
      : "The warding towers held. Regrow your strategy.";
    statusEl.classList.add("visible");
  }
}

function updateCommandPoints(dt) {
  if (gameOver) return;
  commandPoints = Math.min(
    COMMAND_POINT_CAP,
    commandPoints + commandPointRegen * dt
  );
  if (commandPointsEl) {
    commandPointsEl.textContent = Math.floor(commandPoints).toString();
  }
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

  updateAmbient(dt);

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
    flashStatus("Regather the vines! Wait for more harvest points.");
    lastMotivation = timeElapsed;
  }
}

function createFirefly() {
  return {
    x: Math.random() * DESIGN_WIDTH,
    y: Math.random() * DESIGN_HEIGHT,
    radius: 1.8 + Math.random() * 2.2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 0.75,
    drift: 18 + Math.random() * 26,
  };
}

function createCanopyRing() {
  return {
    x: Math.random() * DESIGN_WIDTH,
    y: 60 + Math.random() * (DESIGN_HEIGHT - 120),
    radius: 40 + Math.random() * 160,
    thickness: 1 + Math.random() * 3,
    alpha: 0.05 + Math.random() * 0.1,
  };
}

function updateAmbient(dt) {
  for (const firefly of fireflies) {
    firefly.phase += dt * firefly.speed;
    firefly.x += Math.cos(firefly.phase * 1.6) * firefly.drift * dt;
    firefly.y += Math.sin(firefly.phase) * firefly.drift * 0.6 * dt;

    if (firefly.x < -40) firefly.x = DESIGN_WIDTH + 40;
    if (firefly.x > DESIGN_WIDTH + 40) firefly.x = -40;
    if (firefly.y < 40) firefly.y = DESIGN_HEIGHT - 60;
    if (firefly.y > DESIGN_HEIGHT - 40) firefly.y = 60;
  }
}

function drawAmbientLights() {
  if (!ctx) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const firefly of fireflies) {
    const intensity = 0.45 + Math.sin(firefly.phase * 2) * 0.25;
    const glow = ctx.createRadialGradient(
      firefly.x,
      firefly.y,
      0,
      firefly.x,
      firefly.y,
      firefly.radius * 4
    );
    glow.addColorStop(0, `rgba(197, 255, 200, ${0.7 + intensity * 0.3})`);
    glow.addColorStop(0.45, `rgba(154, 242, 188, ${0.4 + intensity * 0.2})`);
    glow.addColorStop(1, "rgba(54, 140, 96, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(firefly.x, firefly.y, firefly.radius * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBackground() {
  if (!ctx) return;
  ctx.save();
  const baseGradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  baseGradient.addColorStop(0, "#04170d");
  baseGradient.addColorStop(0.55, "#0a2315");
  baseGradient.addColorStop(1, "#103220");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "rgba(121, 201, 154, 0.25)";
  ctx.lineWidth = 1;
  for (let x = 40; x < DESIGN_WIDTH; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 60, DESIGN_HEIGHT);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const ring of canopyRings) {
    ctx.strokeStyle = `rgba(146, 222, 173, ${ring.alpha})`;
    ctx.lineWidth = ring.thickness;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pathShadow = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  pathShadow.addColorStop(0, "rgba(12, 52, 30, 0.9)");
  pathShadow.addColorStop(1, "rgba(9, 33, 22, 0.85)");
  ctx.strokeStyle = pathShadow;
  ctx.lineWidth = 34;
  ctx.shadowColor = "rgba(44, 122, 78, 0.45)";
  ctx.shadowBlur = 32;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  const innerGradient = ctx.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  innerGradient.addColorStop(0, "#4ccd8a");
  innerGradient.addColorStop(0.45, "#7ae4ad");
  innerGradient.addColorStop(1, "#6bd99e");
  ctx.strokeStyle = innerGradient;
  ctx.lineWidth = 20;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
  ctx.restore();

  const base = path[path.length - 1];
  const baseGlow = ctx.createRadialGradient(base.x, base.y, 0, base.x, base.y, 46);
  baseGlow.addColorStop(0, "rgba(255, 197, 120, 0.95)");
  baseGlow.addColorStop(0.5, "rgba(246, 207, 130, 0.6)");
  baseGlow.addColorStop(1, "rgba(252, 233, 183, 0)");
  ctx.fillStyle = baseGlow;
  ctx.beginPath();
  ctx.arc(base.x, base.y, 46, 0, Math.PI * 2);
  ctx.fill();

  const start = path[0];
  const startGlow = ctx.createRadialGradient(
    start.x,
    start.y,
    0,
    start.x,
    start.y,
    38
  );
  startGlow.addColorStop(0, "rgba(173, 255, 215, 0.85)");
  startGlow.addColorStop(0.55, "rgba(170, 255, 210, 0.5)");
  startGlow.addColorStop(1, "rgba(170, 255, 210, 0)");
  ctx.fillStyle = startGlow;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUnits() {
  if (!ctx) return;
  for (const unit of units) {
    if (!unit.alive) continue;
    ctx.save();
    ctx.shadowColor = `${unit.color}4d`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = unit.color;
    ctx.beginPath();
    ctx.arc(unit.position.x, unit.position.y, unit.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(6, 20, 12, 0.75)";
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(
      unit.position.x - unit.radius * 0.35,
      unit.position.y - unit.radius * 0.35,
      unit.radius * 0.55,
      Math.PI * 1.1,
      Math.PI * 1.85
    );
    ctx.stroke();

    // health bar
    ctx.fillStyle = "rgba(4, 28, 15, 0.85)";
    const barX = unit.position.x - unit.radius;
    const barY = unit.position.y - unit.radius - 9;
    const barWidth = unit.radius * 2;
    ctx.fillRect(barX, barY, barWidth, 5);
    const healthWidth = (unit.health / unit.maxHealth) * barWidth;
    const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    healthGradient.addColorStop(0, "#bbf7d0");
    healthGradient.addColorStop(1, "#54e48b");
    ctx.fillStyle = healthGradient;
    ctx.fillRect(barX, barY, healthWidth, 5);
    ctx.restore();
  }
}

function drawTowers() {
  if (!ctx) return;
  for (const tower of towers) {
    tower.draw();
  }
}

function drawProjectiles() {
  if (!ctx) return;
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
  if (ctx) {
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawBackground();
    drawAmbientLights();
    drawTowers();
    drawUnits();
    drawProjectiles();
  }

  if (!gameOver) {
    animationFrameId = requestAnimationFrame(gameLoop);
  } else {
    animationFrameId = null;
    drawOverlay();
  }
}

function drawOverlay() {
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = "rgba(9, 31, 19, 0.72)";
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  const headlineGradient = ctx.createLinearGradient(
    0,
    DESIGN_HEIGHT / 2 - 40,
    0,
    DESIGN_HEIGHT / 2 + 40
  );
  headlineGradient.addColorStop(0, "#baffd5");
  headlineGradient.addColorStop(1, "#fce38a");
  ctx.fillStyle = headlineGradient;
  ctx.font = "600 40px 'Rajdhani', 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(166, 255, 214, 0.5)";
  ctx.shadowBlur = 22;
  const headline =
    escapedCount >= targetEscapedGoal ? "Sanctuary Secured" : "Trellis Overrun";
  ctx.fillText(headline, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 12);

  ctx.shadowBlur = 0;
  ctx.font = "500 21px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(236, 255, 245, 0.92)";
  const detail = escapedCount >= targetEscapedGoal
    ? "Every family reached the glowing grove."
    : "Tower thorns scattered the caravan this time.";
  ctx.fillText(detail, DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 22);

  ctx.font = "500 18px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "rgba(214, 246, 229, 0.85)";
  ctx.fillText("Tap R or press the button below to rally again.", DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 + 52);
  ctx.restore();
  if (restartButton) {
    restartButton.hidden = false;
  }
}

function resetGame() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const preset = getCurrentDifficulty();
  units.length = 0;
  projectiles.length = 0;
  towers.length = 0;

  commandPoints = preset.commandPoints.start;
  escapedCount = 0;
  gameOver = false;
  timeElapsed = 0;
  lastMotivation = -Infinity;
  lastTime = performance.now();

  if (statusEl) {
    statusEl.textContent = "";
    statusEl.classList.remove("visible");
  }
  refreshDifficultyUi();
  if (commandPointsEl) {
    commandPointsEl.textContent = commandPoints.toString();
  }
  if (escapedEl) {
    escapedEl.textContent = escapedCount.toString();
  }
  if (restartButton) {
    restartButton.hidden = true;
  }

  createTowers(preset.towers);
  animationFrameId = requestAnimationFrame(gameLoop);
}

if (unitButtons.length > 0) {
  unitButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.unit;
      spawnUnit(type);
    });
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key === "1") spawnUnit("scout");
    if (event.key === "2") spawnUnit("bruiser");
    if (event.key === "3") spawnUnit("tank");
    if (event.key.toLowerCase() === "r" && gameOver) {
      resetGame();
    }
  });
}

if (restartButton) {
  restartButton.addEventListener("click", resetGame);
}

if (canvas && ctx) {
  refreshDifficultyUi();
  createTowers(currentDifficulty.towers);
  if (commandPointsEl) {
    commandPointsEl.textContent = commandPoints.toString();
  }
  if (escapedEl) {
    escapedEl.textContent = escapedCount.toString();
  }
  resizeCanvas();
  if (typeof window !== "undefined") {
    window.addEventListener("resize", resizeCanvas);
  }
  if (restartButton) {
    restartButton.hidden = true;
  }
  animationFrameId = requestAnimationFrame(gameLoop);
}

if (typeof module !== "undefined") {
  module.exports = {
    Unit,
    Tower,
    Projectile,
    unitTypes,
    path,
    spawnUnit,
    createTowers,
    update,
    updateCommandPoints,
    resetGame,
    flashStatus,
    endGame,
    projectiles,
    units,
    towers,
    difficultySettings,
    setDifficulty,
    getCurrentDifficulty,
    get TARGET_ESCAPED() {
      return targetEscapedGoal;
    },
  };
}
