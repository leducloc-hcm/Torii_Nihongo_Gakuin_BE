import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import {
  Lesson,
  LessonWithRelations,
  LessonCreateInput,
  LessonUpdateInput,
  LessonWhereUniqueInput,
  LessonWhereInput,
  LessonOrderByInput,
} from "./lesson.model";
import { S3Service } from "src/shared/services/s3.service";
import { MediaKind, MediaStatus } from "src/shared/constants/media.constant";

@Injectable()
export class LessonRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private readonly includeRelations = {
    module: {
      select: {
        id: true,
        title: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    },
    media: {
      select: {
        id: true,
        url: true,
        kind: true,
        mimeType: true,
        sizeByte: true,
        caption: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc" as const,
      },
    },
    liveSession: {
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        endedAt: true,
      },
    },
    quiz: {
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    },
    _count: {
      select: {
        notes: true,
        media: true,
      },
    },
  };

  async create(data: LessonCreateInput): Promise<LessonWithRelations> {
    return await this.prisma.lesson.create({
      data,
      include: this.includeRelations,
    });
  }

  async findOne(
    where: LessonWhereUniqueInput,
  ): Promise<LessonWithRelations | null> {
    return await this.prisma.lesson.findUnique({
      where: where as any,
      include: this.includeRelations,
    });
  }

  async update(params: {
    where: LessonWhereUniqueInput;
    data: LessonUpdateInput;
  }): Promise<LessonWithRelations> {
    const { where, data } = params;

    return await this.prisma.lesson.update({
      where: where as any,
      data,
      include: this.includeRelations,
    });
  }

  async delete(where: LessonWhereUniqueInput): Promise<Lesson> {
    return await this.prisma.lesson.delete({
      where: where as any,
    });
  }

  async checkModuleExists(moduleId: number): Promise<boolean> {
    const count = await this.prisma.module.count({
      where: { id: moduleId },
    });
    return count > 0;
  }

  async getMaxOrder(moduleId: number): Promise<number> {
    const result = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: {
        order: true,
      },
    });

    return result._max.order ?? 0;
  }

  async reorderLessons(
    moduleId: number,
    lessonOrders: { id: number; order: number }[],
  ): Promise<void> {
    // Use transaction to update all orders atomically
    await this.prisma.$transaction(
      lessonOrders.map(({ id, order }) =>
        this.prisma.lesson.update({
          where: { id },
          data: { order },
        }),
      ),
    );
  }

  async generateUploadUrl(
    lessonId: number,
    filename: string,
    contentType: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    const uploadInfo = await this.s3Service.generatePresignedUploadUrl(
      lesson.module.course.id,
      lesson.module.id,
      lessonId,
      filename,
      contentType,
    );

    if (!lesson.mediaId) {
      const mediaAsset = await this.prisma.mediaAsset.create({
        data: {
          kind: MediaKind.VIDEO,
          url: uploadInfo.key,
          lessonId: lesson.id,
          mimeType: contentType,
        },
      });

      await this.prisma.lesson.update({
        where: { id: lessonId },
        data: { mediaId: mediaAsset.id },
      });
    }
    return uploadInfo;
  }

  async generateMaterialUploadUrl(
    lessonId: number,
    filename: string,
    contentType: string,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }
    const uploadInfo = await this.s3Service.generatePresignedMaterialUploadUrl(
      lesson.module.course.id,
      lesson.module.id,
      lessonId,
      filename,
      contentType,
    );

    await this.prisma.mediaAsset.create({
      data: {
        kind: MediaKind.OTHER,
        url:
          "https://torii-nihongo-gakuin-s3.s3.ap-southeast-1.amazonaws.com/" +
          uploadInfo.key,
        lessonId: lesson.id,
        mimeType: contentType,
      },
    });

    return uploadInfo;
  }

  async generatePublicStreamUrl(lessonId: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    if (!lesson.mediaId) {
      throw new Error("Media not found for this lesson");
    }
    const streamInfo = await this.s3Service.generatePresignedStreamUrl(
      lesson.module.course.id,
      lesson.module.id,
      lessonId,
    );
    return streamInfo;
  }
}
