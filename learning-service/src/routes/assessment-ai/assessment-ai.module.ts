import { Module } from "@nestjs/common";
import { McpClientModule } from "src/mcp-client/mcp-client.module";
import { AssessmentAIController } from "./assessment-ai.controller";
import { AssessmentAIService } from "./assessment-ai.service";

@Module({
  imports: [McpClientModule],
  controllers: [AssessmentAIController],
  providers: [AssessmentAIService],
})
export class AssessmentAIModule {}
