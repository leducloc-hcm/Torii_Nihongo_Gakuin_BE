import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { AIChatService } from './ai-chat.service'
import { CreateThreadDto, SendQueryDto, GetThreadMessagesDto, GetThreadsDto } from './ai-chat.dto'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@ApiTags('AI Chat')
@Controller('ai-chat')
@ApiBearerAuth()
export class AIChatController {
  constructor(private readonly aiChatService: AIChatService) {}

  @Post('threads')
  @ApiOperation({ summary: 'Create new chat thread' })
  @ApiResponse({ status: 201, description: 'Thread created successfully' })
  async createThread(@ActiveUser('userId') userId: number, @Body() dto: CreateThreadDto) {
    return this.aiChatService.createThread(userId, dto.title)
  }

  @Get('threads')
  @ApiOperation({ summary: 'Get user chat threads' })
  async getUserThreads(@ActiveUser('userId') userId: number, @Query() dto: GetThreadsDto) {
    // Đảm bảo limit và offset là number
    const limit = dto.limit ? Number(dto.limit) : 20
    const offset = dto.offset ? Number(dto.offset) : 0

    return this.aiChatService.getUserThreads(userId, limit, offset)
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get thread messages' })
  async getThreadMessages(
    @ActiveUser('userId') userId: number,
    @Param('threadId', ParseIntPipe) threadId: number,
    @Query() dto: GetThreadMessagesDto,
  ) {
    // Đảm bảo limit và offset là number
    const limit = dto.limit ? Number(dto.limit) : 50
    const offset = dto.offset ? Number(dto.offset) : 0

    return this.aiChatService.getThreadMessages(userId, threadId, limit, offset)
  }

  @Delete('threads/:threadId')
  @ApiOperation({ summary: 'Delete thread' })
  async deleteThread(@ActiveUser('userId') userId: number, @Param('threadId', ParseIntPipe) threadId: number) {
    return this.aiChatService.deleteThread(userId, threadId)
  }

  @Post('query')
  @ApiOperation({ summary: 'Send query to AI' })
  @ApiResponse({ status: 200, description: 'Query processed' })
  async sendQuery(@ActiveUser('userId') userId: number, @Body() dto: SendQueryDto) {
    return this.aiChatService.handleQuery(userId, dto)
  }
}
