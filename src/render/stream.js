const c = require("./colors");

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

const formatToolArg = (name, input) => {
  const i = input || {};
  switch (name) {
    case "Read":
    case "Write":
    case "Edit":
      return i.file_path || "";
    case "Glob":
      return i.pattern || "";
    case "Grep":
      return `"${i.pattern || ""}"${i.path ? ` in ${i.path}` : ""}${i.glob ? ` (${i.glob})` : ""}`;
    case "Bash":
      return i.command || "";
    default: {
      const compact = JSON.stringify(i);
      return compact === "{}" ? "" : compact;
    }
  }
};

class Renderer {
  constructor() {
    this.turns = 0;
    this.tools = 0;
    this.lastWasText = false;
  }

  startTurn() {
    this.turns += 1;
    this.lastWasText = false;
  }

  onTextDelta(chunk) {
    process.stdout.write(chunk);
    this.lastWasText = true;
  }

  endTextBlock() {
    if (this.lastWasText) process.stdout.write("\n");
    this.lastWasText = false;
  }

  onToolUse(name, input) {
    this.endTextBlock();
    this.tools += 1;
    const arg = formatToolArg(name, input);
    const argDisplay = arg ? ` ${c.dim(truncate(arg, 140))}` : "";
    process.stdout.write(`${c.cyan("·")} ${c.bold(name)}${argDisplay}\n`);
  }

  onToolResult(text, isError) {
    if (!isError) return;
    const line = truncate(String(text || "").split("\n")[0], 160);
    process.stdout.write(`  ${c.red("✗")} ${c.dim(line)}\n`);
  }

  onStop() {
    this.endTextBlock();
  }
}

module.exports = { Renderer };
