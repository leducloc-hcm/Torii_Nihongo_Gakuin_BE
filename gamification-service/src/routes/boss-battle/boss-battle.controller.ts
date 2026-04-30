import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { BossBattleService } from "./boss-battle.service";
import { ActiveUser } from "src/shared/decorators/active-user.decorator";
import {
  StartBattleDto,
  SubmitAnswerDto,
  CreateBossConfigDto,
  UpdateBossConfigDto,
} from "./boss-battle.dto";

@ApiTags("Boss Battle")
@ApiBearerAuth()
@Controller("gamification/boss-battle")
export class BossBattleController {
  constructor(private readonly service: BossBattleService) {}

  // ── Configs ──────────────────────────────────
  @Get("configs")
  @ApiOperation({ summary: "List boss configs (activeOnly=true by default)" })
  @ApiQuery({ name: "activeOnly", required: false, type: Boolean })
  getConfigs(@Query("activeOnly") activeOnly?: string) {
    const onlyActive = activeOnly === undefined ? true : activeOnly !== "false";
    return this.service.getAllConfigs(onlyActive);
  }

  @Post("configs")
  @ApiOperation({ summary: "[Admin] Create boss config" })
  createConfig(@Body() body: CreateBossConfigDto) {
    return this.service.createConfig(body);
  }

  @Patch("configs/:id")
  @ApiOperation({ summary: "[Admin] Update boss config" })
  updateConfig(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateBossConfigDto,
  ) {
    return this.service.updateConfig(id, body);
  }

  // ── Battle ───────────────────────────────────
  @Get("active")
  @ApiOperation({ summary: "Get current active battle session (if any)" })
  getActiveBattle(@ActiveUser("userId") userId: number) {
    return this.service.getActiveBattle(userId);
  }

  @Post("start")
  @ApiOperation({ summary: "Start a new boss battle session" })
  startBattle(
    @ActiveUser("userId") userId: number,
    @Body() body: StartBattleDto,
  ) {
    return this.service.startBattle(userId, body.bossConfigId);
  }

  @Get("sessions/:sessionId/question")
  @ApiOperation({ summary: "Get current question for a battle session" })
  getQuestion(
    @ActiveUser("userId") userId: number,
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ) {
    return this.service.getQuestion(userId, sessionId);
  }

  @Post("sessions/:sessionId/answer")
  @ApiOperation({ summary: "Submit an answer for the current question" })
  submitAnswer(
    @ActiveUser("userId") userId: number,
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() body: SubmitAnswerDto,
  ) {
    return this.service.submitAnswer(userId, sessionId, body.answer, body.timeLeft);
  }

  @Post("sessions/:sessionId/abandon")
  @ApiOperation({ summary: "Abandon the current battle" })
  abandonBattle(
    @ActiveUser("userId") userId: number,
    @Param("sessionId", ParseIntPipe) sessionId: number,
  ) {
    return this.service.abandonBattle(userId, sessionId);
  }

  @Get("history")
  @ApiOperation({ summary: "Get battle history for current user" })
  getHistory(@ActiveUser("userId") userId: number) {
    return this.service.getSessionHistory(userId);
  }
}
