const { Renderer } = require("../render/stream");
const { DEFAULT_ALLOWED_TOOLS, DEFAULT_USAGES } = require("./constants");
const { loadSdk, extractText, detectClaudePath } = require("./helpers");

const runAgent = async ({
  cwd,
  system,
  staticPrefix,
  dynamicSuffix,
  userMessage,
  model,
  maxTurns = 32,
  onTurn,
  allowedTools,
}) => {
  const renderer = new Renderer();

  let lastText = "";
  let turns = 0;
  let stopReason = null;

  let totalUsage = DEFAULT_USAGES;

  let truncated = false;

  const claudePath = detectClaudePath();
  const { query, SYSTEM_PROMPT_DYNAMIC_BOUNDARY } = await loadSdk();

  const useSplit = Boolean(
    staticPrefix && dynamicSuffix && SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  );
  const systemPrompt = useSplit
    ? [staticPrefix, SYSTEM_PROMPT_DYNAMIC_BOUNDARY, dynamicSuffix]
    : system;

  const options = {
    systemPrompt,
    model,
    maxTurns,
    cwd,
    allowedTools:
      Array.isArray(allowedTools) && allowedTools.length
        ? allowedTools
        : DEFAULT_ALLOWED_TOOLS,
    permissionMode: "bypassPermissions",
  };

  if (claudePath) options.pathToClaudeCodeExecutable = claudePath;

  const iterator = query({ prompt: userMessage, options });

  for await (const message of iterator) {
    if (
      message.type === "assistant" &&
      message.message &&
      Array.isArray(message.message.content)
    ) {
      renderer.startTurn();
      turns += 1;
      const text = extractText(message.message.content);
      if (text) lastText = text;
      for (const block of message.message.content) {
        if (block.type === "text" && block.text) {
          renderer.onTextDelta(block.text);
        } else if (block.type === "tool_use") {
          renderer.onToolUse(block.name, block.input);
        }
      }
      if (onTurn) onTurn({ turn: turns });
    } else if (
      message.type === "user" &&
      message.message &&
      Array.isArray(message.message.content)
    ) {
      for (const block of message.message.content) {
        if (block.type === "tool_result") {
          const text =
            typeof block.content === "string"
              ? block.content
              : JSON.stringify(block.content);
          renderer.onToolResult(text, Boolean(block.is_error));
        }
      }
    } else if (message.type === "result") {
      stopReason = message.subtype || "end_turn";
      truncated = message.subtype === "error_max_turns";
      const usage = message.usage || (message.message && message.message.usage);
      if (usage) {
        totalUsage.input_tokens = usage.input_tokens || 0;
        totalUsage.output_tokens = usage.output_tokens || 0;
        totalUsage.cache_creation_input_tokens =
          usage.cache_creation_input_tokens || 0;
        totalUsage.cache_read_input_tokens = usage.cache_read_input_tokens || 0;
      }
      renderer.onStop(stopReason, totalUsage);
    }
  }

  return {
    turns,
    stopReason,
    usage: totalUsage,
    lastText,
    truncated,
    tools: renderer.tools,
  };
};

module.exports = { runAgent };
