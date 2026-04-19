import { ActivityAction, ActivityEntity } from "@prisma/client";

export interface CreateActivityLogInput {
  userId?: number;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: number;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface ActivityLogQueryParams {
  page?: number;
  limit?: number;
  action?: ActivityAction;
  entity?: ActivityEntity;
  userId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ActivityLogWithUser {
  id: number;
  userId: number | null;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: number | null;
  description: string;
  metadata: any;
  ipAddress: string | null;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}
