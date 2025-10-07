import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { AuthModule } from './routes/auth/auth.module'
import { TagModule } from './routes/tag/tag.module'
import { BlogModule } from './routes/blog/blog.module'
import { ProfileModule } from './routes/profile/profile.module'
import { CourseModule } from './routes/course/course.module'
import { ModuleModule } from './routes/module/module.module'
import { LessonModule } from './routes/lesson/lesson.module'
import { EnrollmentModule } from './routes/enrollment/enrollment.module'
import { FlashcardModule } from './routes/flashcard/flashcard.module'
import { WebsocketsModule } from './websockets/websockets.module'

@Module({
  imports: [
    AuthModule,
    TagModule,
    BlogModule,
    SharedModule,
    ProfileModule,
    CourseModule,
    ModuleModule,
    LessonModule,
    EnrollmentModule,
    FlashcardModule,
    WebsocketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
