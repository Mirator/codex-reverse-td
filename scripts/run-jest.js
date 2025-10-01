#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

function resolveJestBin() {
  try {
    return require.resolve("jest/bin/jest");
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

function installDependencies() {
  const install = spawnSync("npm", ["install"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

let jestBin = resolveJestBin();
if (!jestBin) {
  console.log("Jest was not found. Installing project dependencies...");
  installDependencies();
  jestBin = resolveJestBin();
  if (!jestBin) {
    console.error(
      "Jest could not be resolved even after installing dependencies."
    );
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, [jestBin, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
