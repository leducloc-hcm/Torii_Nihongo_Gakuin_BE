import { RefundRequest, RefundStatus } from "@prisma/client";

export { RefundStatus };

export type RefundRequestWithRelations = RefundRequest & {
  user: {
    id: number;
    name: string;
    email: string;
  };
  reviewer?: {
    id: number;
    name: string;
    email: string;
  } | null;
  order: {
    id: number;
    totalAmount: number;
    status: string;
  };
  course: {
    id: number;
    title: string;
    slug: string;
    courseType: string;
    thumbnailUrl: string | null;
  };
};

export type RefundPolicyCheckResult = {
  eligible: boolean;
  progressPercent: number;
  threshold: number;
  reason?: string;
};
