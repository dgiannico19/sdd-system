const parseFeedback = (args) => {
  const out = [];
  let feedback = null;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "-m" || a === "--feedback" || a === "--message") {
      const value = args[i + 1];
      if (typeof value !== "string" || !value.trim()) {
        throw new Error(`${a} requiere un mensaje. Ej: sdd dev -m "el LoadingSpinner debe usar <Loader/> existente"`);
      }
      feedback = value;
      i += 1;
      continue;
    }
    out.push(a);
  }
  return { rest: out, feedback };
};

const parseKind = (args, allowed) => {
  const out = [];
  let kind = null;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--kind" || a === "-k") {
      kind = args[i + 1];
      i += 1;
      continue;
    }
    if (a.startsWith("--kind=")) {
      kind = a.slice("--kind=".length);
      continue;
    }
    out.push(a);
  }
  if (kind != null) {
    if (typeof kind !== "string" || !kind.trim()) {
      throw new Error(`--kind requiere un valor (ej: ${(allowed || []).join(" | ")}).`);
    }
    kind = kind.trim();
    if (Array.isArray(allowed) && allowed.length && !allowed.includes(kind)) {
      throw new Error(`--kind="${kind}" inválido. Opciones: ${allowed.join(", ")}.`);
    }
  }
  return { rest: out, kind };
};

module.exports = { parseFeedback, parseKind };
