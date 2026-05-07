#!/usr/bin/env node

const { run } = require("../src/cli");

run(process.argv.slice(2)).catch((err) => {
  const msg = err && err.message ? err.message : String(err);
  process.stderr.write(`\nsdd: ${msg}\n`);
  if (process.env.SDD_DEBUG === "1" && err && err.stack) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
