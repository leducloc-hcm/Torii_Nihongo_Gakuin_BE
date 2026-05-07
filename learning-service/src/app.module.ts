import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import * as path from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SharedModule } from "./shared/shared.module";
import { AuthModule } from "./routes/auth/auth.module";
import { TagModule } from "./routes/tag/tag.module";
import { BlogModule } from "./routes/blog/blog.module";
import { ProfileModule } from "./routes/profile/profile.module";
import { CourseModule } from "./routes/course/course.module";
import { ModuleModule } from "./routes/module/module.module";
import { LessonModule } from "./routes/lesson/lesson.module";
import { EnrollmentModule } from "./routes/enrollment/enrollment.module";
import { LessonProgressModule } from "./routes/lesson-progress/lesson-progress.module";
import { FlashcardModule } from "./routes/flashcard/flashcard.module";
import { NotificationModule } from "./routes/notification/notification.module";
import { WebsocketsModule } from "./websockets/websockets.module";
import { OnlineClassModule } from "./routes/online-class/online-class.module";
import { CartModule } from "./routes/cart/cart.module";
import { PaymentModule } from "./routes/payment/payment.module";
import { AIChatModule } from "./routes/ai-chat/ai-chat.module";
import { CouponModule } from "./routes/coupon/coupon.module";
import { DashboardModule } from "./routes/dashboard/dashboard.module";
import { LecturerDashboardModule } from "./routes/dashboard/lecturer-dashboard/lecturer-dashboard.module";
import { RedisModule } from "./shared/redis/redis.module";
import { RabbitMQModule } from "./shared/rabbitmq/rabbitmq.module";
import { ReviewModule } from "./routes/review/review.module";
import { AssessmentAIModule } from "./routes/assessment-ai/assessment-ai.module";
import { BlogAIModule } from "./routes/blog-ai/blog-ai.module";
import { MultiAgentModule } from "./routes/multi-agent/multi-agent.module";
import { CertificateModule } from "./routes/certificate/certificate.module";
import { ActivityLogModule } from "./routes/activity-log/activity-log.module";
import { RefundModule } from "./routes/refund/refund.module";
import { WorkersModule } from "./shared/workers/workers.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: path.join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      playground: true,
      context: ({ req, res }) => ({ req, res }),
      formatError(error) {
        const { stacktrace, ...restExtension } = error.extensions ?? {};
        return {
          ...error,
          extensions: restExtension,
        };
      },
    }),
    SharedModule,
    RedisModule,
    RabbitMQModule,
    AuthModule,
    TagModule,
    BlogModule,
    ProfileModule,
    CourseModule,
    ModuleModule,
    LessonModule,
    EnrollmentModule,
    LessonProgressModule,
    FlashcardModule,
    NotificationModule,
    WebsocketsModule,
    OnlineClassModule,
    CartModule,
    PaymentModule,
    AIChatModule,
    CouponModule,
    DashboardModule,
    LecturerDashboardModule,
    ReviewModule,
    AssessmentAIModule,
    BlogAIModule,
    MultiAgentModule,
    CertificateModule,
    ActivityLogModule,
    RefundModule,
    WorkersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
