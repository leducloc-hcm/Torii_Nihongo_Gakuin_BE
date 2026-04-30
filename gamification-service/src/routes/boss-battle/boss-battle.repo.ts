import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { BattleStatus } from "@prisma/client";

@Injectable()
export class BossBattleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Boss Config ──
  async findAllConfigs(activeOnly = true) {
    return this.prisma.bossConfig.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { id: "asc" },
    });
  }

  async findConfigById(id: number) {
    return this.prisma.bossConfig.findUnique({ where: { id } });
  }

  async createConfig(data: any) {
    return this.prisma.bossConfig.create({ data });
  }

  async updateConfig(id: number, data: any) {
    return this.prisma.bossConfig.update({ where: { id }, data });
  }

  // ── Session ──
  async createSession(
    userId: number,
    bossConfigId: number,
    maxHp: number,
  ) {
    return this.prisma.bossBattleSession.create({
      data: { userId, bossConfigId, currentHp: maxHp, maxHp },
      include: { bossConfig: true },
    });
  }

  async findSessionById(id: number) {
    return this.prisma.bossBattleSession.findUnique({
      where: { id },
      include: { bossConfig: true },
    });
  }

  async updateSession(id: number, data: Partial<{
    currentHp: number;
    correctStreak: number;
    wrongCount: number;
    adaptiveDifficulty: number;
    totalDamage: number;
    roundsPlayed: number;
    status: BattleStatus;
    endedAt: Date;
  }>) {
    return this.prisma.bossBattleSession.update({ where: { id }, data });
  }

  async findActiveSession(userId: number) {
    return this.prisma.bossBattleSession.findFirst({
      where: { userId, status: "IN_PROGRESS" },
      include: { bossConfig: true },
      orderBy: { startedAt: "desc" },
    });
  }

  async getUserSessions(userId: number, limit = 10) {
    return this.prisma.bossBattleSession.findMany({
      where: { userId },
      include: { bossConfig: { select: { name: true, jlptLevel: true, avatarUrl: true } } },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  // ── Rounds ──
  async createRound(data: {
    sessionId: number;
    kanjiCharacter: string;
    questionType: string;
    correctAnswer: string;
    bossSkillUsed?: string | null;
  }) {
    return this.prisma.battleRound.create({ data });
  }

  async updateRound(id: number, data: {
    userAnswer?: string;
    isCorrect?: boolean;
    timeLeft?: number;
    damageDone?: number;
  }) {
    return this.prisma.battleRound.update({ where: { id }, data });
  }

  async countUserBossDefeats(userId: number): Promise<number> {
    return this.prisma.bossBattleSession.count({
      where: { userId, status: "WIN" },
    });
  }

  async countUserN1Defeats(userId: number): Promise<number> {
    return this.prisma.bossBattleSession.count({
      where: {
        userId,
        status: "WIN",
        bossConfig: { jlptLevel: "N1" },
      },
    });
  }

  async getMaxComboForUser(userId: number): Promise<number> {
    const result = await this.prisma.bossBattleSession.aggregate({
      where: { userId },
      _max: { correctStreak: true },
    });
    return result._max.correctStreak ?? 0;
  }
}
