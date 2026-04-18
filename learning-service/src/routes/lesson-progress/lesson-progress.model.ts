import { z } from "zod";

export enum LessonStatus {
  DRAFT = "DRAFT",
  PUBLIC = "PUBLIC",
}

// LessonProgress Schema
export const LessonProgressSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  lessonId: z.number().int().positive(),
  watchedSec: z
    .number()
    .int()
    .min(0, "Watched seconds must be non-negative")
    .default(0),
  lastPositionSec: z
    .number()
    .int()
    .min(0, "Last position must be non-negative")
    .default(0),
  completed: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Update Progress Schema
export const UpdateProgressSchema = z.object({
  lessonId: z.number().int().positive({ message: "Lesson ID is required" }),
  watchedSec: z.number().int().min(0, "Watched seconds must be non-negative"),
  lastPositionSec: z
    .number()
    .int()
    .min(0, "Last position must be non-negative"),
  completed: z.boolean().optional().default(false),
});

// Course Progress Response Schema
export const CourseProgressSchema = z.object({
  course: z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    modules: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        order: z.number(),
        lessons: z.array(
          z.object({
            id: z.number(),
            title: z.string(),
            order: z.number(),
            kind: z.enum(["VIDEO", "ARTICLE", "QUIZ", "LIVE"]),
            durationSec: z.number().nullable(),
            progress: z.object({
              watchedSec: z.number(),
              lastPositionSec: z.number(),
              completed: z.boolean(),
            }),
          }),
        ),
      }),
    ),
  }),
  enrollment: z.object({
    id: z.number(),
    createdAt: z.date(),
    expiresAt: z.date().nullable(),
  }),
  progressPercentage: z.number(),
  totalLessons: z.number(),
  completedLessons: z.number(),
});

// Course Progress Details Schema
export const CourseProgressDetailsSchema = z.object({
  enrollment: z.object({
    id: z.number(),
    createdAt: z.date(),
    expiresAt: z.date().nullable(),
    course: z.object({
      id: z.number(),
      title: z.string(),
      slug: z.string(),
    }),
  }),
  progressPercentage: z.number(),
  watchTimePercentage: z.number(),
  totalLessons: z.number(),
  completedLessons: z.number(),
  totalWatchedTime: z.number(),
  totalDuration: z.number(),
  modules: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      order: z.number(),
      progressPercentage: z.number(),
      totalLessons: z.number(),
      completedLessons: z.number(),
      lessons: z.array(
        z.object({
          id: z.number(),
          title: z.string(),
          order: z.number(),
          durationSec: z.number().nullable(),
          progress: z.object({
            watchedSec: z.number(),
            lastPositionSec: z.number(),
            completed: z.boolean(),
          }),
        }),
      ),
    }),
  ),
});

// Repository input/output types
export type ProgressCreateInput = {
  userId: number;
  lessonId: number;
  watchedSec: number;
  lastPositionSec: number;
  completed?: boolean;
};

export type ProgressUpdateInput = {
  watchedSec?: number;
  lastPositionSec?: number;
  completed?: boolean;
};

export type ProgressWhereUniqueInput = {
  id?: number;
  userId_lessonId?: {
    userId: number;
    lessonId: number;
  };
};

export type ProgressWhereInput = {
  userId?: number;
  lessonId?: number;
  completed?: boolean;
  lesson?: {
    module?: {
      courseId?: number;
    };
  };
};

export type LessonProgressWithRelations = {
  id: number;
  userId: number;
  lessonId: number;
  watchedSec: number;
  lastPositionSec: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  lesson?: {
    id: number;
    title: string;
    durationSec: number | null;
    module?: {
      id: number;
      title: string;
      course?: {
        id: number;
        title: string;
        slug: string;
      };
    };
  };
};

// Exported Zod types
// Progress Summary Schema
export const ProgressSummarySchema = z.object({
  enrollment: z.object({
    id: z.number(),
    createdAt: z.date(),
    expiresAt: z.date().nullable(),
  }),
  course: z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    thumbnailUrl: z.string().nullable(),
    level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
  }),
  progress: z.object({
    totalLessons: z.number(),
    completedLessons: z.number(),
    progressPercentage: z.number(),
    totalWatchedTime: z.number(),
    totalDuration: z.number(),
    watchTimePercentage: z.number(),
  }),
});

export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type UpdateProgressType = z.infer<typeof UpdateProgressSchema>;
export type CourseProgressType = z.infer<typeof CourseProgressSchema>;
export type CourseProgressDetailsType = z.infer<
  typeof CourseProgressDetailsSchema
>;
export type ProgressSummaryType = z.infer<typeof ProgressSummarySchema>;
