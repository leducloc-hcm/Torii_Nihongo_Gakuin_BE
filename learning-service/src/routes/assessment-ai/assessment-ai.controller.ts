import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Auth } from "src/shared/decorators/auth.decorator";
import { Roles } from "src/shared/decorators/roles.decorator";
import { AuthType } from "src/shared/constants/auth.constant";
import { RoleName } from "src/shared/constants/role.constant";
import { RolesGuard } from "src/shared/guards/roles.guard";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import {
  EvaluateWrongAnswersDto,
  GenerateAssessmentByAIDto,
  GenerateFlashcardsFromWrongAnswersDto,
  GenerateQuestionBankDto,
  GenerateSimilarQuestionDto,
  PreviewAssessmentByAIDto,
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

  @Post("preview")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async preview(@Body() dto: PreviewAssessmentByAIDto) {
    return this.assessmentAIService.previewGenerate(dto);
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

  @Get("cached-analysis/:attemptId")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async getCachedAnalysis(
    @Param("attemptId", ParseIntPipe) attemptId: number,
    @Query("language") language: string = "vi",
  ) {
    return this.assessmentAIService.getCachedAnalysis(
      attemptId,
      language as any,
    );
  }

  @Post("generate-question-bank")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async generateQuestionBank(@Body() dto: GenerateQuestionBankDto) {
    return this.assessmentAIService.generateQuestionBank(dto);
  }

  @Post("generate-flashcards-from-wrong-answers")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async generateFlashcardsFromWrongAnswers(
    @Body() dto: GenerateFlashcardsFromWrongAnswersDto,
  ) {
    return this.assessmentAIService.generateFlashcardsFromWrongAnswers(dto);
  }

  @Post("generate-similar-question")
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer, RoleName.Staff, RoleName.Lecturer, RoleName.Admin)
  async generateSimilarQuestion(@Body() dto: GenerateSimilarQuestionDto) {
    return this.assessmentAIService.generateSimilarQuestion(dto);
  }
}
