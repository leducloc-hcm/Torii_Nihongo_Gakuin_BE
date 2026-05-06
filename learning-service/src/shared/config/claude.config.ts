export const CLAUDE_CONFIG = {
  apiKey: process.env.CLAUDE_API_KEY || "",
  model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
  // Temperature: Claude supports temperature 0-1
  temperature: (() => {
    return parseFloat(process.env.CLAUDE_TEMPERATURE || "0.3");
  })(),
  // Anthropic requires max_tokens to be set explicitly (unlike OpenAI where it's optional)
  // Default to 4096. Set CLAUDE_MAX_TOKENS=0 for unlimited (we'll use 8192 as a safe max)
  maxTokens: (() => {
    const envTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || "4096");
    return envTokens === 0 ? 8192 : envTokens;
  })(),
};

export const MCP_CONFIG = {
  enabled: process.env.MCP_ENABLED === "true",
  toolApprovalRequired: process.env.MCP_TOOL_APPROVAL_REQUIRED !== "false",
  maxToolExecutions: parseInt(process.env.MCP_MAX_TOOL_EXECUTIONS || ""),
};
