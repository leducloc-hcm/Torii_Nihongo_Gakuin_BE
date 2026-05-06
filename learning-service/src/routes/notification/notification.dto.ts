import { NotificationType, NotificationStatus, NotificationPriority } from '@prisma/client'

export class CreateNotificationDto {
  readonly type: NotificationType
  readonly title: string
  readonly message: string
  readonly priority?: NotificationPriority
  readonly data?: any
  readonly actionUrl?: string
  readonly userId: number
  readonly relatedUserId?: number
  readonly entityId?: number
  readonly entityType?: string
  readonly expiresAt?: Date
}

export class UpdateNotificationDto {
  readonly title?: string
  readonly message?: string
  readonly status?: NotificationStatus
  readonly priority?: NotificationPriority
  readonly data?: any
  readonly actionUrl?: string
  readonly readAt?: Date
  readonly expiresAt?: Date
}
