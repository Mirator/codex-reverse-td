const createDom = () => {
  document.body.innerHTML = `
    <canvas id="game"></canvas>
    <div id="commandPoints"></div>
    <div id="escaped"></div>
    <div id="status"></div>
    <button id="restartButton"></button>
    <button data-unit="scout"></button>
    <button data-unit="bruiser"></button>
    <button data-unit="tank"></button>
  `;
  const canvas = document.getElementById("game");
  canvas.getContext = jest.fn(() => ({
    save: jest.fn(),
    restore: jest.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    clearRect: jest.fn(),
    setTransform: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fillRect: jest.fn(),
    font: "",
    textAlign: "",
    fillText: jest.fn(),
  }));
  return canvas;
};

describe("game logic", () => {
  let game;

  beforeEach(() => {
    jest.resetModules();
    global.performance = { now: () => 0 };
    global.requestAnimationFrame = jest.fn(() => 0);
    global.cancelAnimationFrame = jest.fn();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame = global.requestAnimationFrame;
      window.cancelAnimationFrame = global.cancelAnimationFrame;
    }
    createDom();
    game = require("../game.js");
  });

  test("units advance along the path when they have enough time", () => {
    const { Unit, unitTypes, path } = game;
    const unit = new Unit(unitTypes.scout);
    unit.position = { ...path[0] };
    unit.pathIndex = 0;

    const distance = Math.hypot(
      path[1].x - path[0].x,
      path[1].y - path[0].y
    );
    const dt = distance / unit.speed + 0.01;
    unit.update(dt);

    expect(unit.pathIndex).toBe(1);
    expect(unit.position.x).toBeCloseTo(path[1].x);
    expect(unit.position.y).toBeCloseTo(path[1].y);
  });

  test("tower prioritizes the most progressed unit within range", () => {
    const { Unit, Tower, unitTypes, projectiles, path } = game;
    projectiles.length = 0;

    const tower = new Tower(path[2].x, path[2].y, { range: 300, fireRate: 100 });
    const leadingUnit = new Unit(unitTypes.scout);
    leadingUnit.pathIndex = 2;
    leadingUnit.position = { ...path[3] };

    const trailingUnit = new Unit(unitTypes.scout);
    trailingUnit.pathIndex = 1;
    trailingUnit.position = { ...path[1] };

    tower.update(0.1, [trailingUnit, leadingUnit]);

    expect(projectiles).toHaveLength(1);
    expect(projectiles[0].target).toBe(leadingUnit);
  });

  test("projectile damages its target and deactivates on impact", () => {
    const { Projectile, Unit, unitTypes } = game;
    const target = new Unit(unitTypes.scout);
    const projectile = new Projectile({ x: 0, y: 0 }, target, {
      speed: 1000,
      damage: 15,
    });

    target.position = { x: 0, y: 0 };
    projectile.update(0.1);

    expect(target.health).toBe(unitTypes.scout.health - 15);
    expect(projectile.active).toBe(false);
  });
});
