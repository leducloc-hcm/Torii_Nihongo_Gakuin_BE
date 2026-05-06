import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  CreateSeasonalEventInput,
  CreateSeasonalEventType,
  UpdateSeasonalEventType,
} from "./seasonal-event.model";

@Injectable()
export class SeasonalEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.seasonalEvent.findMany({
      orderBy: { startDate: "desc" },
    });
  }

  async findById(id: number) {
    return this.prisma.seasonalEvent.findUnique({ where: { id } });
  }

  async findActive(): Promise<{
    multiplier: number;
    bonusCoins: number;
    name: string;
  } | null> {
    const now = new Date();
    return this.prisma.seasonalEvent.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: { multiplier: true, bonusCoins: true, name: true },
      orderBy: { multiplier: "desc" },
    });
  }

  async create(data: CreateSeasonalEventType) {
    return this.prisma.seasonalEvent.create({
      data: data as CreateSeasonalEventInput,
    });
  }

  async update(id: number, data: UpdateSeasonalEventType) {
    return this.prisma.seasonalEvent.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.seasonalEvent.delete({ where: { id } });
  }
}
