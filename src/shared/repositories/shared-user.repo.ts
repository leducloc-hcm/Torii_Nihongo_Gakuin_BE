import { Injectable } from '@nestjs/common'
import { UserType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'

export type WhereUniqueUserType = { id: number } | { email: string }

type UserUpdateData = Parameters<PrismaService['user']['update']>

@Injectable()
export class SharedUserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findUnique(where: WhereUniqueUserType): Promise<UserType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        bio: true,
        totpSecret: true,
        status: true,
        role: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }
  update(where: { id: number }, data: UserUpdateData): Promise<UserType | null> {
    return this.prismaService.user.update({
      where: {
        ...where,
        deletedAt: null,
      },
      data,
    })
  }
}
