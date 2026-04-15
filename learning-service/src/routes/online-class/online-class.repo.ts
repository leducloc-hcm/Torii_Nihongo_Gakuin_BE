import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class OnlineClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCourseId(courseId: number) {
    return this.prisma.class.findMany({
      where: { courseId },
      include: {
        lecturer: {
          select: {
            email: true,
            lecturerProfile: {
              select: {
                name: true,
                username: true,
                bio: true,
                avatar: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            sessions: true,
          },
        },
      },
    });
  }
  async findByCourseSlug(slug: string) {
    return this.prisma.class.findMany({
      where: {
        course: {
          slug: slug,
        },
      },
      include: {
        lecturer: {
          select: {
            email: true,
            lecturerProfile: {
              select: {
                name: true,
                username: true,
                bio: true,
                avatar: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        _count: {
          select: {
            members: true,
            sessions: true,
          },
        },
      },
    });
  }

  async findByCourseIdAndClassId(courseId: number, classId: number) {
    return this.prisma.class.findFirst({
      where: {
        id: classId,
        courseId: courseId,
      },
      include: {
        lecturer: {
          include: {
            lecturerProfile: true,
          },
        },
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            sessions: true,
          },
        },
      },
    });
  }
  async getPublicCourseClasses(courseId: number) {
    return this.prisma.class.findMany({
      where: { courseId },
      include: {
        lecturer: {
          include: {
            lecturerProfile: true,
          },
        },
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        _count: {
          select: {
            sessions: true,
            members: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.ClassCreateInput) {
    return this.prisma.class.create({
      data,
      include: {
        lecturer: {
          select: {
            id: true,
            name: true,
            email: true,
            lecturerProfile: {
              select: {
                name: true,
                bio: true,
                avatar: true,
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            level: true,
            thumbnailUrl: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            members: true,
          },
        },
      },
    });
  }

  async update(classId: number, data: Prisma.ClassUpdateInput) {
    return this.prisma.class.update({
      where: { id: classId },
      data,
      include: {
        lecturer: {
          include: {
            lecturerProfile: true,
          },
        },
        course: true,
        sessions: true,
        members: true,
      },
    });
  }

  async delete(classId: number) {
    return this.prisma.class.delete({
      where: { id: classId },
    });
  }

  async findOne(classId: number) {
    return this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        lecturer: {
          include: {
            lecturerProfile: true,
          },
        },
        course: true,
        sessions: {
          orderBy: { scheduledAt: "asc" },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async createSession(
    classId: number,
    sessionData: Omit<Prisma.LiveSessionCreateInput, "class">,
  ) {
    return this.prisma.liveSession.create({
      data: {
        ...sessionData,
        class: { connect: { id: classId } },
      },
      include: {
        class: true,
      },
    });
  }

  async getClassSessions(classId: number) {
    return this.prisma.liveSession.findMany({
      where: { classId },
      orderBy: { scheduledAt: "asc" },
      include: {
        class: true,
        substituteLecturer: {
          select: {
            id: true,
            name: true,
            email: true,
            lecturerProfile: {
              select: { name: true, avatar: true },
            },
          },
        },
        attendance: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async checkClassBelongsToCourse(
    classId: number,
    courseId: number,
  ): Promise<boolean> {
    const classItem = await this.prisma.class.findFirst({
      where: {
        id: classId,
        courseId: courseId,
      },
    });
    return !!classItem;
  }

  async findSession(sessionId: number) {
    return this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        substituteLecturer: {
          select: {
            id: true,
            name: true,
            email: true,
            lecturerProfile: {
              select: { name: true, avatar: true },
            },
          },
        },
      },
    });
  }

  async updateSession(
    sessionId: number,
    data: {
      title?: string;
      scheduledAt?: Date;
      substituteLecturerId?: number | null;
    },
  ) {
    const updateData: any = { ...data };
    if ("substituteLecturerId" in data) {
      if (
        data.substituteLecturerId !== null &&
        data.substituteLecturerId !== undefined
      ) {
        updateData.substituteLecturer = {
          connect: { id: data.substituteLecturerId },
        };
      } else {
        updateData.substituteLecturer = { disconnect: true };
      }
      delete updateData.substituteLecturerId;
    }
    return this.prisma.liveSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        class: true,
        substituteLecturer: {
          select: {
            id: true,
            name: true,
            email: true,
            lecturerProfile: {
              select: { name: true, avatar: true },
            },
          },
        },
      },
    });
  }

  async findSubstituteSessionsByLecturer(lecturerId: number) {
    return this.prisma.liveSession.findMany({
      where: {
        substituteLecturerId: lecturerId,
        endedAt: null,
        class: { isActive: true },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        class: {
          include: {
            lecturer: {
              select: {
                id: true,
                name: true,
                email: true,
                lecturerProfile: {
                  select: {
                    name: true,
                    bio: true,
                    avatar: true,
                  },
                },
              },
            },
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            course: {
              select: {
                id: true,
                title: true,
                level: true,
                thumbnailUrl: true,
              },
            },
            sessions: {
              orderBy: { scheduledAt: "asc" },
              include: {
                substituteLecturer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    lecturerProfile: {
                      select: { name: true, avatar: true },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                sessions: true,
                members: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteSession(sessionId: number) {
    return this.prisma.liveSession.delete({
      where: { id: sessionId },
    });
  }
}
