import { Module } from '@nestjs/common'
import { AIChatController } from './ai-chat.controller'
import { AIChatService } from './ai-chat.service'
import { AIThreadRepository, AIQueryRepository, AIMessageRepository } from './ai-chat.repo'
import { SharedModule } from 'src/shared/shared.module'
import { McpClientModule } from 'src/mcp-client/mcp-client.module'
import { AgentService } from 'src/mcp-client/agent.service'
import { PromptService } from 'src/mcp-client/module/course/course-mcp.prompt'

@Module({
  imports: [SharedModule, McpClientModule],
  controllers: [AIChatController],
  providers: [AIChatService, AIThreadRepository, AIQueryRepository, AIMessageRepository, AgentService, PromptService],
  exports: [AIChatService, AgentService],
})
export class AIChatModule {}
