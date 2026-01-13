export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || '',
  // Temperature: some models (like gpt-5-nano) only support temperature = 1
  // If model is gpt-5-nano, force temperature to 1, otherwise use env value
  temperature: (() => {
    const model = process.env.OPENAI_MODEL || ''
    if (model.includes('gpt-5-nano')) {
      return 1 // gpt-5-nano only supports temperature = 1
    }
    return parseFloat(process.env.OPENAI_TEMPERATURE || '1')
  })(),
  // For testing: if OPENAI_MAX_TOKENS is 0 or not set, use undefined (unlimited)
  // Otherwise use the specified value
  maxTokens: (() => {
    const envTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '0')
    return envTokens === 0 ? undefined : envTokens
  })(),
}

export const MCP_CONFIG = {
  enabled: process.env.MCP_ENABLED === 'true',
  toolApprovalRequired: process.env.MCP_TOOL_APPROVAL_REQUIRED !== 'false',
  maxToolExecutions: parseInt(process.env.MCP_MAX_TOOL_EXECUTIONS || ''),
}
