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

  @Post()
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @ApiOperation({ summary: 'Create a new online class' })
  @ApiResponse({ status: 201, description: 'Online class created successfully' })
  async createOnlineClass(
    @ActiveUser('userId') userId: number,
    @Body() createClassDto: CreateOnlineClassDto,
    @Request() req: any,
  ) {
    try {
      const lecturerId = userId
      const onlineClass = await this.onlineClassService.createOnlineClass({
        ...createClassDto,
        lecturerId,
      })

      return {
        success: true,
        message: 'Online class created successfully',
        data: onlineClass,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create online class',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get list of online classes' })
  @ApiResponse({ status: 200, description: 'Online classes retrieved successfully' })
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  async getOnlineClasses(@Query() query: ClassListQueryDto, @Request() req: any) {
    try {
      const userId = req.user.id
      const userRole = req.user.role

      const classes = await this.onlineClassService.getOnlineClasses({
        ...query,
        userId,
        userRole,
      })

      return {
        success: true,
        message: 'Online classes retrieved successfully',
        data: classes.classes,
        pagination: {
          total: classes.total,
          page: query.page || 1,
          limit: query.limit || 10,
          totalPages: Math.ceil(classes.total / (query.limit || 10)),
        },
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve online classes',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get online class details' })
  @ApiResponse({ status: 200, description: 'Online class details retrieved successfully' })
  @Auth([AuthType.Bearer])
  async getOnlineClassDetails(@Param('id') classId: string, @Request() req: any) {
    try {
      const userId = req.user.id
      const onlineClass = await this.onlineClassService.getOnlineClassDetails(classId, userId)

      if (!onlineClass) {
        throw new HttpException(
          {
            success: false,
            message: 'Online class not found',
          },
          HttpStatus.NOT_FOUND,
        )
      }

      return {
        success: true,
        message: 'Online class details retrieved successfully',
        data: onlineClass,
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to retrieve online class details',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Put(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff, RoleName.Lecturer)
  @ApiOperation({ summary: 'Update online class' })
  @ApiResponse({ status: 200, description: 'Online class updated successfully' })
  async updateOnlineClass(
    @ActiveUser('userId') userId: number,
    @Param('id') classId: string,
    @Body() updateClassDto: UpdateOnlineClassDto,
    @Request() req: any,
  ) {
    try {
      const userRole = req.user.role

      const updatedClass = await this.onlineClassService.updateOnlineClass(classId, updateClassDto, userId, userRole)

      return {
        success: true,
        message: 'Online class updated successfully',
        data: updatedClass,
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to update online class',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Admin, RoleName.Staff)
  @ApiOperation({ summary: 'Delete online class' })
  @ApiResponse({ status: 200, description: 'Online class deleted successfully' })
  async deleteOnlineClass(@ActiveUser('userId') userId: number, @Param('id') classId: string, @Request() req: any) {
    try {
      const userRole = req.user.role

      await this.onlineClassService.deleteOnlineClass(classId, userId, userRole)

      return {
        success: true,
        message: 'Online class deleted successfully',
      }
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to delete online class',
        },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Generate join token for online class' })
  @ApiResponse({ status: 200, description: 'Join token generated successfully' })
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Customer)
  async generateJoinToken(@Param('id') classId: string, @ActiveUser('userId') userId: number) {
    try {
      const joinToken = await this.onlineClassService.generateJoinToken(classId, userId)

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

  @Post(':id/start')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'Start online class session' })
  @ApiResponse({ status: 200, description: 'Online class session started successfully' })
  async startOnlineClassSession(@ActiveUser('userId') userId: number, @Param('id') classId: string) {
    try {
      const lecturerId = userId
      const session = await this.onlineClassService.startOnlineClassSession(classId, lecturerId)

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

  @Post(':id/end')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Lecturer, RoleName.Staff)
  @ApiOperation({ summary: 'End online class session' })
  @ApiResponse({ status: 200, description: 'Online class session ended successfully' })
  async endOnlineClassSession(@ActiveUser('userId') userId: number, @Param('id') classId: string) {
    try {
      const result = await this.onlineClassService.endOnlineClassSession(classId, userId)

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
    @Request() req: any,
  ) {
    try {
      const lecturerId = req.user.id
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
  async stopRecording(@Param('id') classId: string, @Request() req: any) {
    try {
      const lecturerId = req.user.id
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

  @Get(':id/recordings')
  @ApiOperation({ summary: 'Get class recordings' })
  @ApiResponse({ status: 200, description: 'Recordings retrieved successfully' })
  getClassRecordings(@Param('id') classId: string, @Request() req: any) {
    try {
      const userId = req.user.id
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
  async shareDocument(@Param('id') classId: string, @Body() shareDocumentDto: ShareDocumentDto, @Request() req: any) {
    try {
      const lecturerId = req.user.id
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
  getSharedDocuments(@Param('id') classId: string, @Request() req: any) {
    try {
      const userId = req.user.id
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
    @Request() req: any,
  ) {
    try {
      const lecturerId = req.user.id
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
}
