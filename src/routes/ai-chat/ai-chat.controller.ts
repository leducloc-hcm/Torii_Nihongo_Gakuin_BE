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
    const limit = dto.limit ? Number(dto.limit) : 20
    const page = dto.page ? Number(dto.page) : 1

    return this.aiChatService.getUserThreads(userId, limit, page)
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Get thread messages' })
  async getThreadMessages(
    @ActiveUser('userId') userId: number,
    @Param('threadId', ParseIntPipe) threadId: number,
    @Query() dto: GetThreadMessagesDto,
  ) {
    const limit = dto.limit ? Number(dto.limit) : 20
    const page = dto.page ? Number(dto.page) : 1

    return this.aiChatService.getThreadMessages(userId, threadId, limit, page)
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

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear user cache (development only)' })
  async clearUserCache(@ActiveUser('userId') userId: number) {
    return this.aiChatService.clearUserCache(userId)
  }
}
