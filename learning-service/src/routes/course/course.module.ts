import { Module } from "@nestjs/common";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { CourseRepository } from "./course.repo";
import { OnlineClassRepository } from "../online-class/online-class.repo";
import { OnlineClassModule } from "../online-class/online-class.module";
import { SharedModule } from "src/shared/shared.module";
import { ProfileModule } from "../profile/profile.module";
import { EnrollmentModule } from "../enrollment/enrollment.module";
import { LessonProgressModule } from "../lesson-progress/lesson-progress.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    SharedModule,
    ProfileModule,
    EnrollmentModule,
    LessonProgressModule,
    OnlineClassModule,
    NotificationModule,
  ],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository, OnlineClassRepository],
  exports: [CourseService, CourseRepository],
})
export class CourseModule {}
