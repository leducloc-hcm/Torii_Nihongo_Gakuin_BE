import { Module } from "@nestjs/common";
import { ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";
import { ReviewRepository } from "./review.repo";
import { SharedModule } from "src/shared/shared.module";
import { EnrollmentModule } from "../enrollment/enrollment.module";

@Module({
  imports: [SharedModule, EnrollmentModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewRepository],
  exports: [ReviewService],
})
export class ReviewModule {}
