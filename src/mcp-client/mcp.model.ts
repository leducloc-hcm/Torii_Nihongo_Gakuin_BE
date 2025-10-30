import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface MCPToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface MCPToolResult {
  toolCallId: string
  toolName: string
  result: any
  error?: string
  executedAt: Date
}

// FastMCP Response Format
export interface FastMCPResult {
  success: boolean
  error: string | null
  data: any
}

export interface MCPExecuteRequest {
  jsonrpc: '2.0'
  method: 'tools/call'
  params: {
    name: string
    arguments: Record<string, any>
  }
  id: string
}

export interface MCPExecuteResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

export interface MCPListToolsRequest {
  method: 'tools/list'
  params?: Record<string, any>
}

export interface MCPListToolsResponse {
  tools: MCPTool[]
}

export function transformMCPToolToOpenAI(mcpTool: MCPTool): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema,
      strict: false,
    },
  }
}

export interface ChatContext {
  threadId: number
  userId: number
  messages: ChatCompletionMessageParam[]
  tools?: ChatCompletionTool[]
}

export interface ToolCallRequest {
  id: string
  name: string
  arguments: string
}

export interface AgentResponse {
  content: string | null
  toolCalls?: ToolCallRequest[]
  requiresApproval: boolean
  finishReason: 'stop' | 'tool_calls' | 'length' | null
}

export interface ExecuteToolsRequest {
  toolCalls: Array<{
    id: string
    name: string
    arguments: Record<string, any>
  }>
  threadId: number
  userId: number
  messages?: ChatCompletionMessageParam[]
}

export interface ExecuteToolsResponse {
  results: Array<{
    toolCallId: string
    toolName: string
    result: any
    error?: string
  }>
  finalResponse?: string
  hasMoreTools: boolean
}
