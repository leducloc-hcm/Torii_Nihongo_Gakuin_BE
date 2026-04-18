import { Module } from "@nestjs/common";
import { McpClientModule } from "src/mcp-client/mcp-client.module";
import { BlogAIController } from "./blog-ai.controller";
import { BlogAIService } from "./blog-ai.service";

@Module({
  imports: [McpClientModule],
  controllers: [BlogAIController],
  providers: [BlogAIService],
})
export class BlogAIModule {}
