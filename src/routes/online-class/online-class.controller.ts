import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { RolesGuard } from '../../shared/guards/roles.guard'

import {
  CreateOnlineClassDto,
  UpdateOnlineClassDto,
  ClassListQueryDto,
  ShareDocumentDto,
  ParticipantActionDto,
  StartRecordingDto,
} from './online-class.dto'
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

  @Get(':id/participants')
  @Auth([AuthType.Bearer])
  @IsPublic()
  @ApiOperation({ summary: 'Get online class participants' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async getOnlineClassParticipants(@Param('id') classId: string) {
    try {
      const participants = await this.onlineClassService.getOnlineClassParticipants(classId)

      return {
        success: true,
        message: 'Participants retrieved successfully',
        data: {
          participants,
          totalCount: participants.length,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve participants',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Get(':id/janus-participants')
  @IsPublic()
  @ApiOperation({ summary: 'Get online class participants in Janus format' })
  @ApiResponse({ status: 200, description: 'Janus participants retrieved successfully' })
  async getJanusParticipants(@Param('id') classId: string) {
    try {
      const janusParticipants = await this.onlineClassService.getJanusParticipants(classId)

      return {
        success: true,
        message: 'Janus participants retrieved successfully',
        data: janusParticipants,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve Janus participants',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Get(':id/janus-info')
  @IsPublic()
  @ApiOperation({ summary: 'Get Janus connection information for direct client connection' })
  @ApiResponse({ status: 200, description: 'Janus connection info retrieved successfully' })
  async getJanusConnectionInfo(@Param('id') classId: string) {
    try {
      const janusInfo = await this.onlineClassService.getJanusConnectionInfo(classId)

      return {
        success: true,
        message: 'Janus connection info retrieved successfully',
        data: janusInfo,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve Janus connection info',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/recording/start')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Start recording online class' })
  @ApiResponse({ status: 200, description: 'Recording started successfully' })
  async startRecording(
    @Param('id') classId: string,
    @Body() startRecordingDto: StartRecordingDto,
    @ActiveUser('userId') userId: number,
  ) {
    try {
      const lecturerId = userId
      const recording = await this.onlineClassService.startRecording(classId, lecturerId, startRecordingDto)

      return {
        success: true,
        message: 'Recording started successfully',
        data: {
          recordingId: recording.recordingId,
          filename: recording.filename,
          startedAt: recording.startedAt,
          options: recording.options,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to start recording',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/recording/stop')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Stop recording online class' })
  @ApiResponse({ status: 200, description: 'Recording stopped successfully' })
  async stopRecording(@Param('id') classId: string, @ActiveUser('userId') userId: number) {
    try {
      const lecturerId = userId
      const result = await this.onlineClassService.stopRecording(classId, lecturerId)

      return {
        success: true,
        message: 'Recording stopped successfully',
        data: {
          recordingId: result.recordingId,
          stoppedAt: result.stoppedAt,
          duration: result.duration,
          fileSize: result.fileSize,
          downloadUrl: result.downloadUrl,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to stop recording',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/recording/upload-url')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Get presigned URL for uploading class recording to S3' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated successfully' })
  async getRecordingUploadUrl(
    @Param('id') classId: string,
    @Body() body: { recordingId: string; filename: string },
    @ActiveUser('userId') userId: number,
  ) {
    try {
      const lecturerId = userId
      const result = await this.onlineClassService.getRecordingUploadUrl(classId, lecturerId, body)

      return {
        success: true,
        message: 'Presigned upload URL generated successfully',
        data: {
          uploadUrl: result.uploadUrl,
          publicUrl: result.publicUrl,
          key: result.key,
          expiresIn: result.expiresIn,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to generate upload URL',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/recording/confirm')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Confirm recording upload completion' })
  @ApiResponse({ status: 200, description: 'Recording confirmed successfully' })
  async confirmRecordingUpload(
    @Param('id') classId: string,
    @Body() body: { recordingId: string; recordingUrl: string },
    @ActiveUser('userId') userId: number,
  ) {
    try {
      const lecturerId = userId
      const result = await this.onlineClassService.confirmRecordingUpload(classId, lecturerId, body)

      return {
        success: true,
        message: 'Recording confirmed successfully',
        data: {
          recordingUrl: result.recordingUrl,
          recordingId: result.recordingId,
          uploadedAt: result.uploadedAt,
          sessionId: result.sessionId,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to confirm recording',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Get(':id/recordings')
  @ApiOperation({ summary: 'Get class recordings' })
  @ApiResponse({ status: 200, description: 'Recordings retrieved successfully' })
  getClassRecordings(@Param('id') classId: string, @ActiveUser('userId') userId: number) {
    try {
      const recordings = this.onlineClassService.getClassRecordings(classId, userId)

      return {
        success: true,
        message: 'Recordings retrieved successfully',
        data: {
          recordings,
          totalCount: recordings.length,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve recordings',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/documents/share')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Share document in online class' })
  @ApiResponse({ status: 200, description: 'Document shared successfully' })
  async shareDocument(
    @Param('id') classId: string,
    @Body() shareDocumentDto: ShareDocumentDto,
    @ActiveUser('userId') userId: number,
  ) {
    try {
      const lecturerId = userId
      const result = await this.onlineClassService.shareDocument(classId, lecturerId, shareDocumentDto)

      return {
        success: true,
        message: 'Document shared successfully',
        data: {
          documentId: result.documentId,
          sharedAt: result.sharedAt,
          documentInfo: result.documentInfo,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to share document',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get shared documents in class' })
  @ApiResponse({ status: 200, description: 'Shared documents retrieved successfully' })
  getSharedDocuments(@Param('id') classId: string, @ActiveUser('userId') userId: number) {
    try {
      const documents = this.onlineClassService.getSharedDocuments(classId, userId)

      return {
        success: true,
        message: 'Shared documents retrieved successfully',
        data: {
          documents,
          totalCount: documents.length,
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve shared documents',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/participants/:participantId/action')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Perform action on participant' })
  @ApiResponse({ status: 200, description: 'Action performed successfully' })
  async performParticipantAction(
    @Param('id') classId: string,
    @Param('participantId') participantId: string,
    @Body() actionDto: ParticipantActionDto,
    @ActiveUser('userId') userId: number,
  ) {
    try {
      const lecturerId = userId
      const result = await this.onlineClassService.performParticipantAction(
        classId,
        participantId,
        actionDto,
        lecturerId,
      )

      return {
        success: true,
        message: `Action ${actionDto.action} performed successfully`,
        data: result,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to perform action on participant',
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
