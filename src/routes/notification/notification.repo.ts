import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service'
import { CreateNotificationDto, UpdateNotificationDto } from './notification.dto'

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationDto) {
    return await this.prisma.notification.create({ data })
  }

  async findAll(userId: number) {
    return await this.prisma.notification.findMany({ where: { userId } })
  }

  async findOne(id: number) {
    return await this.prisma.notification.findUnique({ where: { id } })
  }

  async update(id: number, data: UpdateNotificationDto) {
    return await this.prisma.notification.update({ where: { id }, data })
  }

  async remove(id: number) {
    return await this.prisma.notification.delete({ where: { id } })
  }
  async markAllAsRead(userId: number) {
    return await this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ' },
    })
  }
}
