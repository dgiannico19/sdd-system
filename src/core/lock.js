const fs = require("fs");
const path = require("path");
const { taskDir } = require("./task");

const lockFile = (cwd, slug) => path.join(taskDir(cwd, slug), ".lock");

const isProcessAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};

const acquire = (cwd, slug) => {
  const f = lockFile(cwd, slug);
  if (fs.existsSync(f)) {
    const raw = fs.readFileSync(f, "utf8").trim();
    const pid = Number(raw);
    if (pid && isProcessAlive(pid) && pid !== process.pid) {
      const err = new Error(
        `Tarea '${slug}' está en uso por PID ${pid}. Esperá o borrá ${f} si está colgado.`,
      );
      err.code = "ELOCKED";
      throw err;
    }
  }
  fs.writeFileSync(f, String(process.pid), "utf8");
  return f;
};

const release = (cwd, slug) => {
  const f = lockFile(cwd, slug);
  if (!fs.existsSync(f)) return;
  try {
    const pid = Number(fs.readFileSync(f, "utf8").trim());
    if (pid === process.pid) fs.unlinkSync(f);
  } catch {
    // ignore
  }
};

module.exports = { acquire, release, lockFile };
