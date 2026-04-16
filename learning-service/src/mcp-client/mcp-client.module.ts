import { Module } from "@nestjs/common";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import { AssessmentMcpClient } from "src/mcp-client/module/assessment/assessment-mcp.service";
import { AnalyticsMcpClient } from "src/mcp-client/module/analytics/analytics-mcp.service";
import { CourseMcpClient } from "src/mcp-client/module/course/course-mcp.service";
import { EnrollmentMcpClient } from "src/mcp-client/module/enrollment/enrollment-mcp.service";
import { FlashcardMcpClient } from "src/mcp-client/module/flashcard/flashcard-mcp.service";

@Module({
  providers: [
    McpBaseService,
    AssessmentMcpClient,
    AnalyticsMcpClient,
    CourseMcpClient,
    EnrollmentMcpClient,
    FlashcardMcpClient,
  ],
  exports: [
    McpBaseService,
    AssessmentMcpClient,
    AnalyticsMcpClient,
    CourseMcpClient,
    EnrollmentMcpClient,
    FlashcardMcpClient,
  ],
})
export class McpClientModule {}
