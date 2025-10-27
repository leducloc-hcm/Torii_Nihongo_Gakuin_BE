import { Injectable } from '@nestjs/common'
import { CreateNotificationDto, UpdateNotificationDto } from './notification.dto'
import { NotificationGateway } from '../../websockets/notification.gateway'
import { NotificationRepository } from 'src/routes/notification/notification.repo'

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async create(data: CreateNotificationDto) {
    const notification = await this.notificationRepository.create(data)
    this.notificationGateway.sendNotification(notification.userId.toString(), {
      ...notification,
      userId: notification.userId.toString(),
      type: 'notification:new' as const, // ✅ Changed to match frontend listener
    })
    return notification
  }

  async findAll(userId: number) {
    return this.notificationRepository.findAll(userId)
  }

  async findOne(id: number) {
    return this.notificationRepository.findOne(id)
  }

  async update(id: number, data: UpdateNotificationDto) {
    return this.notificationRepository.update(id, data)
  }
  async markAllAsRead(userId: number) {
    return this.notificationRepository.markAllAsRead(userId)
  }

  async remove(id: number) {
    return this.notificationRepository.remove(id)
  }
}
