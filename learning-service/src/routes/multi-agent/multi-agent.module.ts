import { Module } from "@nestjs/common";
import { McpClientModule } from "src/mcp-client/mcp-client.module";
import { MultiAgentController } from "./multi-agent.controller";
import { MultiAgentService } from "./multi-agent.service";

@Module({
  imports: [McpClientModule],
  controllers: [MultiAgentController],
  providers: [MultiAgentService],
})
export class MultiAgentModule {}
