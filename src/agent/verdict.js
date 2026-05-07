const { VETO_RE, GAP_RE, VERDICTS, PASS_RE } = require("./constants");


const parse = (text) => {
  if (!text || typeof text !== "string")
    return { verdict: "error", reason: "respuesta vacía" };

  const tail = text.trim().split(/\n+/).slice(-8).join("\n");
  const veto = tail.match(VETO_RE);

  if (veto) return { verdict: "veto", reason: (veto[1] || "").trim() };
  
  const gap = tail.match(GAP_RE);
  
  if (gap) return { verdict: "gap", reason: (gap[1] || "").trim() };
  
  if (PASS_RE.test(tail)) return { verdict: "pass", reason: "" };
  
  return { verdict: "error", reason: "sin token de verdict en la respuesta" };
};

module.exports = { VERDICTS, parse };
