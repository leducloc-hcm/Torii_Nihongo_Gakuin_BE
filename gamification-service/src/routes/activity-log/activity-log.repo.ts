import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";

@Injectable()
export class ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, type: string, points: number, meta?: any) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        type: type as any,
        points,
        meta: meta ?? undefined,
      },
    });
  }

  async findByUser(userId: number, page: number, limit: number, type?: string) {
    const where: any = { userId };
    if (type) where.type = type;

    const [data, totalCount] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data, totalCount, page, limit };
  }
}
