import { Module } from "@nestjs/common";
import { AIChatController } from "./ai-chat.controller";
import { AIChatService } from "./ai-chat.service";
import {
  AIThreadRepository,
  AIQueryRepository,
  AIMessageRepository,
} from "./ai-chat.repo";
import { SharedModule } from "src/shared/shared.module";
import { McpClientModule } from "src/mcp-client/mcp-client.module";
import { AgentService } from "src/mcp-client/agent.service";
import { PromptService } from "src/mcp-client/module/course/course-mcp.prompt";
import { FlashcardModule } from "../flashcard/flashcard.module";
import { ToolPlannerService } from "src/mcp-client/agent/tool-planner.service";
import { AgentMemoryService } from "src/mcp-client/agent/agent-memory.service";

@Module({
  imports: [SharedModule, McpClientModule, FlashcardModule],
  controllers: [AIChatController],
  providers: [
    AIChatService,
    AIThreadRepository,
    AIQueryRepository,
    AIMessageRepository,
    AgentService,
    PromptService,
    ToolPlannerService,
    AgentMemoryService,
  ],
  exports: [AIChatService, AgentService],
})
export class AIChatModule {}
