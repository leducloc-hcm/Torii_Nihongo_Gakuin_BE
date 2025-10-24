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
import { AssessmentPaperModule } from './routes/assessment-paper/assessment-paper.module'
import { AssessmentSectionModule } from './routes/assessment-section/assessment-section.module'
import { AssessmentItemModule } from './routes/assessment-item/assessment-item.module'
import { AssessmentAttemptModule } from './routes/assessment-attempt/assessment-attempt.module'
import { AssessmentAnswerModule } from './routes/assessment-answer/assessment-answer.module'
import { ScoreProfileModule } from './routes/score-profile/score-profile.module'
import { WebsocketsModule } from './websockets/websockets.module'
import { OnlineClassModule } from './routes/online-class/online-class.module'
import { QuestionGroupModule } from 'src/routes/question-group/question-group.module'
import { CartModule } from './routes/cart/cart.module'
import { PaymentModule } from './routes/payment/payment.module'
import { QuizModule } from './routes/quiz/quiz.module'
import { QuizItemModule } from './routes/quiz-item/quiz-item.module'
import { QuizAttemptModule } from './routes/quiz-attempt/quiz-attempt.module'
import { QuizAnswerModule } from './routes/quiz-answer/quiz-answer.module'

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
    AssessmentPaperModule,
    AssessmentSectionModule,
    AssessmentItemModule,
    AssessmentAttemptModule,
    AssessmentAnswerModule,
    ScoreProfileModule,
    WebsocketsModule,
    OnlineClassModule,
    CartModule,
    PaymentModule,
    QuizModule,
    QuizItemModule,
    QuizAttemptModule,
    QuizAnswerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
