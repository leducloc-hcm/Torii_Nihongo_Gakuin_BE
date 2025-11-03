import { Module } from '@nestjs/common'
import { McpBaseService } from 'src/mcp-client/mcp-client.service'
import { CourseMcpClient } from 'src/mcp-client/module/course/course-mcp.service'

@Module({
  providers: [McpBaseService, CourseMcpClient],
  exports: [McpBaseService, CourseMcpClient],
})
export class McpClientModule {}
