import { z } from "zod";

export const CertificateSchema = z.object({
  id: z.number(),
  userId: z.number(),
  courseId: z.number(),
  issuedAt: z.date(),
  verifyCode: z.string(),
  course: z
    .object({
      id: z.number(),
      title: z.string(),
      thumbnailUrl: z.string().nullable(),
    })
    .optional(),
  user: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
});

export type CertificateType = z.infer<typeof CertificateSchema>;
