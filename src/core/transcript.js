const fs = require("fs");
const path = require("path");
const { taskDir } = require("./task");

const transcriptsDir = (cwd, slug) => path.join(taskDir(cwd, slug), "transcripts");

const isoStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const truncate = (str, max = 240) => {
  if (!str) return "";
  const s = String(str).replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max)}…`;
};

const summarizeToolInput = (tool, input) => {
  const i = input || {};
  switch (tool) {
    case "Read":
    case "Write":
    case "NotebookEdit":
      return i.file_path || "";
    case "Edit":
      return `${i.file_path || ""}${i.old_string ? ` (${truncate(i.old_string, 60)})` : ""}`;
    case "Bash":
      return truncate(i.command || "", 200);
    case "Glob":
      return `${i.pattern || ""}${i.path ? ` in ${i.path}` : ""}`;
    case "Grep":
      return `${i.pattern || ""}${i.path ? ` in ${i.path}` : ""}`;
    default: {
      const keys = Object.keys(i).slice(0, 3);
      return keys.length ? keys.map((k) => `${k}=${truncate(JSON.stringify(i[k]), 60)}`).join(" ") : "";
    }
  }
};

const renderToolCalls = (toolCalls) => {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return "_(ninguno)_";
  return toolCalls
    .map((t) => `- \`${t.tool}\`${t.summary ? ` ${t.summary}` : ""}`)
    .join("\n");
};

const renderVerify = (verify) => {
  if (!verify || !Array.isArray(verify.results) || verify.results.length === 0) {
    return "_(no se ejecutó verify gate)_";
  }
  const rows = verify.results.map((r) => {
    const mark = r.ok ? "✓" : "✗";
    const code = r.ok ? "" : ` (exit ${r.exitCode ?? "?"}${r.timedOut ? ", timeout" : ""})`;
    return `| \`${r.command}\` | ${mark}${code} |`;
  });
  return ["| Comando | Resultado |", "|---|---|", ...rows].join("\n");
};

const renderTranscript = (data) => {
  const lines = [];
  lines.push(`# Transcript — ${data.stepId} (${data.verdict})`);
  lines.push("");
  lines.push(`- **task**: ${data.taskTitle} (\`${data.slug}\`)`);
  lines.push(`- **step**: ${data.stepIndex}. ${data.stepTitle}`);
  lines.push(`- **ranAt**: ${data.ranAt}`);
  if (data.model) lines.push(`- **model**: ${data.model}`);
  if (data.usage) {
    const u = data.usage;
    const fmt = (n) => `${((n || 0) / 1000).toFixed(1)}k`;
    const inTok = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    const cacheHint = u.cache_read_input_tokens ? ` · cache ${fmt(u.cache_read_input_tokens)}` : "";
    lines.push(`- **usage**: ${data.turns ?? "?"} turnos · ${data.tools ?? "?"} tools · in ${fmt(inTok)}${cacheHint} · out ${fmt(u.output_tokens || 0)}`);
  }
  if (data.truncated) lines.push(`- **truncated**: sí (alcanzó maxTurns)`);
  if (data.reason) lines.push(`- **reason**: ${data.reason}`);
  if (data.promptHash) lines.push(`- **promptHash**: \`${data.promptHash}\``);
  lines.push("");

  lines.push("## Feedback");
  lines.push(data.feedback ? data.feedback : "_(sin feedback)_");
  lines.push("");

  lines.push("## Verify");
  lines.push(renderVerify(data.verify));
  lines.push("");

  lines.push("## Tool calls");
  lines.push(renderToolCalls(data.toolCalls));
  lines.push("");

  lines.push("## Resumen del agente");
  if (data.lastText && data.lastText.trim()) {
    lines.push(data.lastText.trim());
  } else {
    lines.push("_(el agente no emitió texto previo al verdict)_");
  }
  lines.push("");

  return lines.join("\n");
};

const writeTranscript = (cwd, slug, payload) => {
  const dir = transcriptsDir(cwd, slug);
  fs.mkdirSync(dir, { recursive: true });
  const stamp = isoStamp();
  const file = path.join(dir, `${stamp}-${payload.stepId}.md`);
  fs.writeFileSync(file, renderTranscript(payload), "utf8");
  return file;
};

const listTranscripts = (cwd, slug) => {
  const dir = transcriptsDir(cwd, slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => path.join(dir, f));
};

const readLatestTranscript = (cwd, slug, stepId) => {
  const all = listTranscripts(cwd, slug);
  const filtered = stepId ? all.filter((p) => p.includes(`-${stepId}.md`)) : all;
  if (filtered.length === 0) return null;
  return {
    path: filtered[filtered.length - 1],
    content: fs.readFileSync(filtered[filtered.length - 1], "utf8"),
  };
};

module.exports = {
  transcriptsDir,
  summarizeToolInput,
  writeTranscript,
  listTranscripts,
  readLatestTranscript,
};
