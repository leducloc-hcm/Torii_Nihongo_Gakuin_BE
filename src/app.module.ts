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
import { NotificationModule } from './routes/notification/notification.module'
import { PlacementBlueprintModule } from './routes/placement/placement-blueprint.module'
import { QuestionModule } from './routes/question/question.module'
import { OptionModule } from './routes/question-option/option.module'
import { TestPaperModule } from './routes/test-paper/test-paper.module'
import { TestSectionModule } from './routes/test-section/test-section.module'
import { TestItemModule } from './routes/test-item/test-item.module'
import { TestAttemptModule } from './routes/test-attempt/test-attempt.module'
import { TestAnswerModule } from './routes/test-answer/test-answer.module'
import { WebsocketsModule } from './websockets/websockets.module'
import { OnlineClassModule } from './routes/online-class/online-class.module'
import { QuestionGroupModule } from 'src/routes/question-group/question-group.module'

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
    NotificationModule,
    QuestionGroupModule,
    PlacementBlueprintModule,
    QuestionModule,
    OptionModule,
    TestPaperModule,
    TestSectionModule,
    TestItemModule,
    TestAttemptModule,
    TestAnswerModule,
    WebsocketsModule,
    OnlineClassModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
