import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { BossBattleRepository } from "./boss-battle.repo";
import { RedisService } from "src/shared/redis/redis.service";
import { RabbitMQPublisher } from "src/shared/rabbitmq/rabbitmq.publisher";
import { PointsService } from "../points/points.service";
import { AchievementService } from "../achievement/achievement.service";
import { SeasonalEventService } from "../seasonal-event/seasonal-event.service";
import {
  KANJI_POOL,
  BossQuestion,
  SessionState,
  SubmitAnswerResult,
} from "./boss-battle.model";

@Injectable()
export class BossBattleService {
  private readonly logger = new Logger(BossBattleService.name);

  constructor(
    private readonly repo: BossBattleRepository,
    private readonly redisService: RedisService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
    private readonly pointsService: PointsService,
    @Inject(forwardRef(() => AchievementService))
    private readonly achievementService: AchievementService,
    private readonly seasonalEventService: SeasonalEventService,
  ) {}

  // ─────────────────────────────────────────────
  // Boss Config (admin)
  // ─────────────────────────────────────────────
  async getAllConfigs(activeOnly = true) {
    return this.redisService.getOrSet(
      `boss:configs:${activeOnly}`,
      () => this.repo.findAllConfigs(activeOnly),
      300,
    );
  }

  async createConfig(data: any) {
    const config = await this.repo.createConfig(data);
    await this.redisService.del("boss:configs:true");
    await this.redisService.del("boss:configs:false");
    return config;
  }

  async updateConfig(id: number, data: any) {
    const config = await this.repo.updateConfig(id, data);
    await this.redisService.del("boss:configs:true");
    await this.redisService.del("boss:configs:false");
    return config;
  }

  // ─────────────────────────────────────────────
  // Battle lifecycle
  // ─────────────────────────────────────────────
  async getActiveBattle(userId: number) {
    const raw = await this.redisService.get<string>(
      `boss:user:${userId}:active_session`,
    );
    if (!raw) return null;

    const sessionId = parseInt(raw, 10);
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.status !== "IN_PROGRESS") {
      await this.redisService.del(`boss:user:${userId}:active_session`);
      return null;
    }

    const state = await this.redisService.get<SessionState>(
      `boss:session:${sessionId}:state`,
    );
    if (!state) return null;

    return { sessionId, bossConfig: session.bossConfig, state };
  }

  async startBattle(userId: number, bossConfigId: number) {
    // Prevent duplicate active sessions
    const existing = await this.redisService.get<string>(
      `boss:user:${userId}:active_session`,
    );
    if (existing) {
      throw new ConflictException(
        "You already have an active battle. Finish or abandon it first.",
      );
    }

    const config = await this.repo.findConfigById(bossConfigId);
    if (!config || !config.isActive) {
      throw new NotFoundException("Boss not found or inactive");
    }

    const session = await this.repo.createSession(userId, bossConfigId, config.hp);

    // Store active session pointer (30-min TTL)
    await this.redisService.set(
      `boss:user:${userId}:active_session`,
      String(session.id),
      1800,
    );

    // Initialize session state in Redis
    const state: SessionState = {
      currentHp: config.hp,
      maxHp: config.hp,
      correctStreak: 0,
      wrongCount: 0,
      adaptiveDifficulty: 1.0,
      enraged: false,
      status: "IN_PROGRESS",
    };
    await this.redisService.set(
      `boss:session:${session.id}:state`,
      state,
      1800,
    );

    return { sessionId: session.id, bossConfig: config, state };
  }

  async getQuestion(userId: number, sessionId: number): Promise<BossQuestion> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Session not found");
    }
    if (session.status !== "IN_PROGRESS") {
      throw new ConflictException("Battle is already over");
    }

    // Return cached question if it hasn't expired yet
    const cached = await this.redisService.get<BossQuestion>(
      `boss:session:${sessionId}:question`,
    );
    if (cached) return cached;

    // Generate a new question
    const state = await this.getState(sessionId, session);
    const config = session.bossConfig;
    const question = this.generateQuestion(session.id, session.roundsPlayed, config, state);

    // Persist the round shell (no answer yet)
    const round = await this.repo.createRound({
      sessionId,
      kanjiCharacter: question.kanjiCharacter,
      questionType: question.questionType,
      correctAnswer: question.correctAnswer,
      bossSkillUsed: question.bossSkillUsed,
    });

    // Cache question for duration = timeLimit seconds
    const fullQuestion = { ...question, roundId: round.id };
    await this.redisService.set(
      `boss:session:${sessionId}:question`,
      fullQuestion,
      config.timeLimit + 2, // small grace window
    );

    return fullQuestion;
  }

  async submitAnswer(
    userId: number,
    sessionId: number,
    userAnswer: string,
    timeLeft: number,
  ): Promise<SubmitAnswerResult> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Session not found");
    }
    if (session.status !== "IN_PROGRESS") {
      throw new ConflictException("Battle is already over");
    }

    const cachedQuestion = await this.redisService.get<BossQuestion & { roundId: number }>(
      `boss:session:${sessionId}:question`,
    );

    // If question expired (time ran out), treat as wrong / timeout
    const isTimeout = !cachedQuestion;
    const correctAnswer = cachedQuestion?.correctAnswer ?? "??";
    const isCorrect = !isTimeout && userAnswer.trim() === correctAnswer;

    const state = await this.getState(sessionId, session);

    // Update streaks
    const newStreak = isCorrect ? state.correctStreak + 1 : 0;
    const newWrongCount = isCorrect ? state.wrongCount : state.wrongCount + 1;

    // Damage calculation
    const config = session.bossConfig;
    const enraged = state.currentHp / state.maxHp <= config.enrageThreshold;
    const damageDone = isCorrect
      ? this.calcDamage(config.baseDamage, timeLeft, newStreak, enraged)
      : 0;

    const newHp = Math.max(0, state.currentHp - damageDone);
    const newDifficulty = this.calcAdaptiveDifficulty(newStreak, newWrongCount);

    // Determine if battle ended
    const battleWon = newHp <= 0;
    const roundsAfter = session.roundsPlayed + 1;
    const maxRounds = config.hp; // safety: 1 round per HP point max
    const battleLost = !battleWon && roundsAfter >= Math.ceil(maxRounds / 5);

    const newStatus = battleWon ? "WIN" : battleLost ? "LOSE" : "IN_PROGRESS";
    const battleEnded = newStatus !== "IN_PROGRESS";

    // Persist round result
    if (cachedQuestion?.roundId) {
      await this.repo.updateRound(cachedQuestion.roundId, {
        userAnswer: isTimeout ? "__TIMEOUT__" : userAnswer,
        isCorrect,
        timeLeft,
        damageDone,
      });
    }

    // Update session in DB
    await this.repo.updateSession(sessionId, {
      currentHp: newHp,
      correctStreak: newStreak,
      wrongCount: newWrongCount,
      adaptiveDifficulty: newDifficulty,
      totalDamage: session.totalDamage + damageDone,
      roundsPlayed: roundsAfter,
      status: newStatus as any,
      ...(battleEnded ? { endedAt: new Date() } : {}),
    });

    // Update Redis state
    const newState: SessionState = {
      currentHp: newHp,
      maxHp: state.maxHp,
      correctStreak: newStreak,
      wrongCount: newWrongCount,
      adaptiveDifficulty: newDifficulty,
      enraged: newHp / state.maxHp <= config.enrageThreshold,
      status: newStatus as any,
    };
    await this.redisService.set(`boss:session:${sessionId}:state`, newState, 1800);

    // Clear current question so next call generates new one
    await this.redisService.del(`boss:session:${sessionId}:question`);

    let xpEarned = 0;
    let coinsEarned = 0;

    if (battleEnded) {
      await this.redisService.del(`boss:user:${userId}:active_session`);

      if (newStatus === "WIN") {
        const { multiplier, bonusCoins } =
          await this.seasonalEventService.getActiveMultiplier();
        xpEarned = Math.round(config.baseXpReward * newDifficulty * multiplier);
        coinsEarned = config.baseCoinReward + bonusCoins;

        await this.pointsService.addPoints(
          userId,
          xpEarned,
          `Boss defeated: ${config.name}`,
          { bossConfigId: config.id, sessionId, adaptiveDifficulty: newDifficulty },
          coinsEarned,
        );

        await this.rabbitMQPublisher.publishEvent("gamification.boss.defeated", {
          type: "gamification.boss.defeated",
          userId,
          payload: {
            bossName: config.name,
            jlptLevel: config.jlptLevel,
            sessionId,
            totalDamage: session.totalDamage + damageDone,
          },
          timestamp: new Date(),
        });

        // Check achievements (BOSS_DEFEATED, BOSS_N1_DEFEATED, etc.)
        await this.achievementService.checkAndUnlock(userId);
      }
    }

    return {
      correct: isCorrect,
      correctAnswer,
      damageDone,
      timeLeft,
      newHp,
      newStreak,
      battleEnded,
      battleStatus: newStatus as any,
      xpEarned,
      coinsEarned,
      isEnraged: newState.enraged,
    };
  }

  async abandonBattle(userId: number, sessionId: number) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Session not found");
    }
    await this.repo.updateSession(sessionId, {
      status: "ABANDONED",
      endedAt: new Date(),
    });
    await this.redisService.del(`boss:user:${userId}:active_session`);
    await this.redisService.del(`boss:session:${sessionId}:state`);
    await this.redisService.del(`boss:session:${sessionId}:question`);
    return { message: "Battle abandoned" };
  }

  async getSessionHistory(userId: number) {
    return this.repo.getUserSessions(userId);
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  private async getState(sessionId: number, session: any): Promise<SessionState> {
    const cached = await this.redisService.get<SessionState>(
      `boss:session:${sessionId}:state`,
    );
    if (cached) return cached;
    // Rebuild from DB if Redis evicted
    return {
      currentHp: session.currentHp,
      maxHp: session.maxHp,
      correctStreak: session.correctStreak,
      wrongCount: session.wrongCount,
      adaptiveDifficulty: session.adaptiveDifficulty,
      enraged: session.currentHp / session.maxHp <= session.bossConfig.enrageThreshold,
      status: session.status as any,
    };
  }

  private calcAdaptiveDifficulty(correctStreak: number, wrongCount: number, base = 1.0): number {
    const raw = base + correctStreak * 0.2 - wrongCount * 0.3;
    return Math.min(2.0, Math.max(0.5, parseFloat(raw.toFixed(2))));
  }

  private calcDamage(
    baseDamage: number,
    timeLeft: number,
    correctStreak: number,
    enraged: boolean,
  ): number {
    const timeBonus = Math.floor(timeLeft * 2);
    const comboMultiplier =
      correctStreak >= 5 ? 2.0 : correctStreak >= 3 ? 1.5 : 1.0;
    const enragePenalty = enraged ? 0.7 : 1.0;
    return Math.max(
      1,
      Math.floor((baseDamage + timeBonus) * comboMultiplier * enragePenalty),
    );
  }

  private pickBossSkill(skills: string[], enraged: boolean): string | null {
    const pool = enraged ? [...skills, ...skills, "time_reduce"] : skills;
    if (pool.length === 0 || Math.random() > 0.3) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private pickQuestionType(
    types: string[],
    difficulty: number,
  ): "meaning" | "reading" | "fill_blank" {
    const valid = types.filter((t) =>
      ["meaning", "reading", "fill_blank"].includes(t),
    );
    if (valid.length === 0) return "meaning";
    if (difficulty > 1.5 && valid.includes("fill_blank")) return "fill_blank";
    if (difficulty > 1.0 && valid.includes("reading")) return "reading";
    return valid.includes("meaning") ? "meaning" : (valid[0] as any);
  }

  private generateQuestion(
    sessionId: number,
    roundIndex: number,
    config: any,
    state: SessionState,
  ): BossQuestion {
    const poolLevels: string[] = config.kanjiPool;
    const eligible = KANJI_POOL.filter((k) => poolLevels.includes(k.jlpt));
    if (eligible.length === 0) {
      throw new Error(`No kanji found for pool: ${poolLevels.join(",")}`);
    }

    const kanji = eligible[Math.floor(Math.random() * eligible.length)];
    const questionType = this.pickQuestionType(
      config.questionTypes,
      state.adaptiveDifficulty,
    );

    let prompt: string;
    let correctAnswer: string;
    let distractorPool: string[];

    if (questionType === "meaning") {
      prompt = `What does "${kanji.character}" mean?`;
      correctAnswer = kanji.meanings[0];
      distractorPool = KANJI_POOL.filter((k) => k.character !== kanji.character)
        .map((k) => k.meanings[0])
        .filter(Boolean);
    } else if (questionType === "reading") {
      prompt = `How do you read "${kanji.character}"?`;
      correctAnswer = kanji.readings[0];
      distractorPool = KANJI_POOL.filter((k) => k.character !== kanji.character)
        .map((k) => k.readings[0])
        .filter(Boolean);
    } else {
      // fill_blank: show meaning, guess kanji
      prompt = `Which kanji means "${kanji.meanings[0]}"?`;
      correctAnswer = kanji.character;
      distractorPool = KANJI_POOL.filter((k) => k.jlpt === kanji.jlpt && k.character !== kanji.character)
        .map((k) => k.character);
    }

    // Build 4 options (1 correct + 3 distractors)
    const shuffledDistractors = distractorPool
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    // Ensure we always have 3 distractors
    while (shuffledDistractors.length < 3) {
      shuffledDistractors.push("？？");
    }
    const options = [correctAnswer, ...shuffledDistractors].sort(
      () => Math.random() - 0.5,
    );

    const bossSkillUsed = this.pickBossSkill(config.bossSkills, state.enraged);

    // Reduce timeLimit when skill = time_reduce
    const effectiveTime =
      bossSkillUsed === "time_reduce"
        ? Math.max(2, Math.floor(config.timeLimit * 0.6))
        : config.timeLimit;

    return {
      sessionId,
      roundIndex,
      kanjiCharacter: questionType === "fill_blank" ? "？" : kanji.character,
      questionType,
      prompt,
      options,
      correctAnswer,
      timeLimit: effectiveTime,
      bossSkillUsed,
      isEnraged: state.enraged,
      expiresAt: Date.now() + effectiveTime * 1000,
    };
  }

  // Called by AchievementService for new condition types
  async countUserBossDefeats(userId: number) {
    return this.repo.countUserBossDefeats(userId);
  }

  async countUserN1Defeats(userId: number) {
    return this.repo.countUserN1Defeats(userId);
  }

  async getMaxCombo(userId: number) {
    return this.repo.getMaxComboForUser(userId);
  }
}
