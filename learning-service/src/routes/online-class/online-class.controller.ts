import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus, HttpException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { RolesGuard } from '../../shared/guards/roles.guard'

import { OnlineClassService } from './online-class.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { IsPublic, Auth } from 'src/shared/decorators/auth.decorator'
import { RoleName } from 'src/shared/constants/role.constant'
import { Roles } from 'src/shared/decorators/roles.decorator'
import { AuthType } from 'src/shared/constants/auth.constant'

@ApiTags('Online Classes')
@Controller('online-classes')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class OnlineClassController {
  constructor(private readonly onlineClassService: OnlineClassService) {}

  @Get('all-classes')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff)
  @ApiOperation({ summary: 'Get all online classes' })
  @ApiResponse({ status: 200, description: 'Online classes retrieved successfully' })
  async getAllOnlineClasses() {
    return await this.onlineClassService.getAllOnlineClasses()
  }
  @Get('my-classes')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @ApiOperation({ summary: 'Get my enrolled online class detail' })
  @ApiResponse({ status: 200, description: 'My enrolled online class retrieved successfully' })
  async getMyEnrolledOnlineClass(@ActiveUser('userId') userId: number) {
    return await this.onlineClassService.getMyEnrolledOnlineClass(userId)
  }
  @Get('my-assigned-classes')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer)
  @ApiOperation({ summary: 'Get my assigned online classes' })
  @ApiResponse({ status: 200, description: 'My assigned online classes retrieved successfully' })
  async getMyAssignedOnlineClasses(@ActiveUser('userId') userId: number) {
    return await this.onlineClassService.getMyAssignedOnlineClasses(userId)
  }

  @Get('upcoming-sessions')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Customer)
  @ApiOperation({ summary: 'Get upcoming online class sessions' })
  @ApiResponse({ status: 200, description: 'Upcoming online class sessions retrieved successfully' })
  async getUpcomingOnlineClassSessions(@ActiveUser('userId') userId: number) {
    return await this.onlineClassService.getUpcomingOnlineClassSessions(userId)
  }

  @Post(':classId/sessions/:sessionId/join')
  @ApiOperation({ summary: 'Generate join token for online class' })
  @ApiResponse({ status: 200, description: 'Join token generated successfully' })
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  async generateJoinToken(
    @Param('sessionId') sessionId: string,
    @Param('classId') classId: string,
    @ActiveUser('userId') userId: number,
  ) {
    try {
      const joinToken = await this.onlineClassService.generateJoinToken(classId, sessionId, userId)

      return {
        success: true,
        message: 'Join token generated successfully',
        data: {
          token: joinToken.token,
          expiresAt: joinToken.expiresAt,
          classInfo: joinToken.classInfo,
          userRole: joinToken.userRole,
          permissions: joinToken.permissions,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to generate join token',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':sessionId/start')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Start online class session' })
  @ApiResponse({ status: 200, description: 'Online class session started successfully' })
  async startOnlineClassSession(@ActiveUser('userId') userId: number, @Param('sessionId') sessionId: string) {
    try {
      const lecturerId = userId
      const session = await this.onlineClassService.startOnlineClassSession(sessionId, lecturerId)

      return {
        success: true,
        message: 'Online class session started successfully',
        data: {
          sessionId: session.sessionId,
          roomKey: session.roomKey,
          startedAt: session.startedAt,
          janusRoomId: session.janusRoomId,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to start online class session',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':sessionId/end')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'End online class session' })
  @ApiResponse({ status: 200, description: 'Online class session ended successfully' })
  async endOnlineClassSession(@ActiveUser('userId') userId: number, @Param('sessionId') sessionId: string) {
    try {
      const result = await this.onlineClassService.endOnlineClassSession(sessionId, userId)

      return {
        success: true,
        message: 'Online class session ended successfully',
        data: {
          sessionId: result.sessionId,
          endedAt: result.endedAt,
          duration: result.duration,
          recordingUrl: result.recordingUrl,
          participantCount: result.participantCount,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to end online class session',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post('webhook/recording-complete')
  @IsPublic()
  @ApiOperation({ summary: 'Webhook endpoint for recording completion notification from Janus server' })
  @ApiResponse({ status: 200, description: 'Recording URL updated successfully' })
  async handleRecordingComplete(@Body() body: { janusRoomId: number; recordingUrl: string; filename?: string }) {
    try {
      const result = await this.onlineClassService.updateRecordingUrl(body.janusRoomId, body.recordingUrl)

      return {
        success: true,
        message: 'Recording URL updated successfully',
        data: {
          sessionId: result.sessionId,
          janusRoomId: result.janusRoomId,
          recordingUrl: result.recordingUrl,
          updatedAt: result.updatedAt,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update recording URL',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }
}
