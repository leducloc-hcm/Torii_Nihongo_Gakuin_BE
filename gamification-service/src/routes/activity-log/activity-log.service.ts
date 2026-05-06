import { Injectable } from "@nestjs/common";
import { ActivityLogRepository } from "./activity-log.repo";

@Injectable()
export class ActivityLogService {
  constructor(private readonly activityLogRepo: ActivityLogRepository) {}

  async logActivity(userId: number, type: string, points: number, meta?: any) {
    return this.activityLogRepo.create(userId, type, points, meta);
  }

  async getMyActivities(
    userId: number,
    page: number,
    limit: number,
    type?: string,
  ) {
    return this.activityLogRepo.findByUser(userId, page, limit, type);
  }
}
