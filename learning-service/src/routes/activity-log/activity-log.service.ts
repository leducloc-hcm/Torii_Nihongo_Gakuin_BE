import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  CreateActivityLogInput,
  ActivityLogQueryParams,
} from "./activity-log.model";

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateActivityLogInput) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          description: input.description,
          metadata: input.metadata ?? undefined,
          ipAddress: input.ipAddress,
        },
      });
    } catch (error) {
      // Don't let logging failures affect the main flow
      this.logger.error(
        `Failed to create activity log: ${error.message}`,
        error.stack,
      );
    }
  }

  async findAll(query: ActivityLogQueryParams) {
    const {
      page = 1,
      limit = 20,
      action,
      entity,
      userId,
      startDate,
      endDate,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActionSummary() {
    const summary = await this.prisma.activityLog.groupBy({
      by: ["action"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return summary.map((item) => ({
      action: item.action,
      count: item._count.id,
    }));
  }
}
