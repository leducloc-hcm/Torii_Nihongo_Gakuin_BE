import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Auth } from "src/shared/decorators/auth.decorator";
import { Roles } from "src/shared/decorators/roles.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { RoleName } from "src/shared/constants/role.constant";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import {
  EvaluateWrongAnswersDto,
  GenerateAssessmentByAIDto,
} from "./assessment-ai.dto";
import { AssessmentAIService } from "./assessment-ai.service";

@Controller("assessment-ai")
@UseGuards(RolesGuard)
export class AssessmentAIController {
  constructor(private readonly assessmentAIService: AssessmentAIService) {}

  @Post("generate")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async generate(@Body() dto: GenerateAssessmentByAIDto) {
    return this.assessmentAIService.generateByAI(dto);
  }

  @Post("evaluate-wrong-answers")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async evaluateWrongAnswers(
    @ActiveUser("userId") userId: number,
    @Body() dto: EvaluateWrongAnswersDto,
  ) {
    return this.assessmentAIService.evaluateWrongAnswers(userId, dto);
  }
}
