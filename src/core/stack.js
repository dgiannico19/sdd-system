const fs = require("fs");
const path = require("path");

const exists = (p) => fs.existsSync(p);

const readJsonSafe = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const KNOWN_FRAMEWORKS = {
  react: "react",
  next: "next",
  vue: "vue",
  nuxt: "nuxt",
  svelte: "svelte",
  "@sveltejs/kit": "sveltekit",
  astro: "astro",
  remix: "remix",
  "@remix-run/react": "remix",
  express: "express",
  fastify: "fastify",
  koa: "koa",
  "@nestjs/core": "nestjs",
  hono: "hono",
};

const KNOWN_BUNDLERS = {
  webpack: "webpack",
  vite: "vite",
  parcel: "parcel",
  rollup: "rollup",
  esbuild: "esbuild",
  turbopack: "turbopack",
};

const KNOWN_TEST_RUNNERS = {
  jest: "jest",
  vitest: "vitest",
  mocha: "mocha",
  "@playwright/test": "playwright",
  cypress: "cypress",
  ava: "ava",
};

const matchKnown = (deps, dict) =>
  Object.keys(dict)
    .filter((k) => deps[k])
    .map((k) => `${dict[k]}@${String(deps[k]).replace(/^[\^~]/, "")}`);

const detectFromPackageJson = (cwd, lines) => {
  const pkg = readJsonSafe(path.join(cwd, "package.json"));
  if (!pkg) return false;

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const isTs = exists(path.join(cwd, "tsconfig.json")) || Boolean(deps.typescript);

  if (pkg.name) lines.push(`Project: ${pkg.name}${pkg.version ? ` v${pkg.version}` : ""}`);
  lines.push(`Language: ${isTs ? "TypeScript" : "JavaScript"} (Node)`);

  if (pkg.engines && pkg.engines.node) lines.push(`Node engine: ${pkg.engines.node}`);
  if (pkg.packageManager) lines.push(`Package manager: ${pkg.packageManager}`);

  const frameworks = matchKnown(deps, KNOWN_FRAMEWORKS);
  if (frameworks.length) lines.push(`Frameworks: ${frameworks.join(", ")}`);

  const bundlers = matchKnown(deps, KNOWN_BUNDLERS);
  if (bundlers.length) lines.push(`Bundlers: ${bundlers.join(", ")}`);

  const testRunners = matchKnown(deps, KNOWN_TEST_RUNNERS);
  if (testRunners.length) lines.push(`Test runners: ${testRunners.join(", ")}`);

  if (deps["styled-components"]) lines.push(`Styling: styled-components`);
  if (deps["@emotion/react"] || deps["@emotion/styled"]) lines.push(`Styling: emotion`);
  if (deps.tailwindcss) lines.push(`Styling: tailwindcss`);

  if (pkg.scripts && Object.keys(pkg.scripts).length) {
    const names = Object.keys(pkg.scripts).slice(0, 12).join(", ");
    lines.push(`npm scripts: ${names}`);
  }
  return true;
};

const detectOtherLanguages = (cwd, lines) => {
  const markers = [
    ["go.mod", "Go (go.mod)"],
    ["Cargo.toml", "Rust (Cargo.toml)"],
    ["pyproject.toml", "Python (pyproject.toml)"],
    ["requirements.txt", "Python (requirements.txt)"],
    ["composer.json", "PHP (composer.json)"],
    ["Gemfile", "Ruby (Gemfile)"],
    ["pom.xml", "Java (Maven pom.xml)"],
    ["build.gradle", "Java/Kotlin (Gradle)"],
    ["build.gradle.kts", "Kotlin (Gradle)"],
    ["Dockerfile", "Docker"],
    ["docker-compose.yml", "Docker Compose"],
  ];
  for (const [file, label] of markers) {
    if (exists(path.join(cwd, file))) lines.push(`Detected: ${label}`);
  }
};

const detectArchitecture = (cwd, lines) => {
  const layers = ["app", "pages", "features", "entities", "widgets", "shared"];
  const present = layers.filter((l) => exists(path.join(cwd, "src", l)));
  if (present.length >= 3) {
    lines.push(`Architecture: FSD detected (layers in src/: ${present.join(", ")})`);
  } else if (exists(path.join(cwd, "src"))) {
    lines.push(`Architecture: src/ tree present (no FSD layers detected)`);
  }
};

const detectStack = (cwd) => {
  const lines = [];
  const hasNode = detectFromPackageJson(cwd, lines);
  detectOtherLanguages(cwd, lines);
  detectArchitecture(cwd, lines);
  if (lines.length === 0) {
    return hasNode ? "" : "(no se detectaron manifiestos conocidos en el cwd)";
  }
  return lines.join("\n");
};

module.exports = { detectStack };
