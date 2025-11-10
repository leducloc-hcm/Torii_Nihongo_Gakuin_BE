import { Module } from '@nestjs/common'
import { McpBaseService } from 'src/mcp-client/mcp-client.service'
import { CourseMcpClient } from 'src/mcp-client/module/course/course-mcp.service'
import { EnrollmentMcpClient } from 'src/mcp-client/module/enrollment/enrollment-mcp.service'

@Module({
  providers: [McpBaseService, CourseMcpClient, EnrollmentMcpClient],
  exports: [McpBaseService, CourseMcpClient, EnrollmentMcpClient],
})
export class McpClientModule {}
