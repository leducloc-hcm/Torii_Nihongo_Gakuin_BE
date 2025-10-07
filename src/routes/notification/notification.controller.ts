import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { CreateNotificationDto, UpdateNotificationDto } from './notification.dto'
import { AuthType } from 'src/shared/constants/auth.constant'
import { Auth } from 'src/shared/decorators/auth.decorator'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Auth([AuthType.Bearer])
  findAll(@ActiveUser('userId') userId: number) {
    return this.notificationService.findAll(Number(userId))
  }

  @Get('detail/:id')
  @Auth([AuthType.Bearer])
  findOne(@Param('id') id: number) {
    return this.notificationService.findOne(Number(id))
  }

  @Delete(':id')
  @Auth([AuthType.Bearer])
  remove(@Param('id') id: number) {
    return this.notificationService.remove(Number(id))
  }
}
