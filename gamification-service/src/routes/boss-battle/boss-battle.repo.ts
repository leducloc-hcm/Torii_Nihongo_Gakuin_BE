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

  // ── Boss Maps ──
  async findAllMaps(activeOnly = true) {
    return this.prisma.bossMap.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { orderIndex: "asc" },
      include: {
        configs: {
          where: { isActive: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
  }

  async findMapById(id: number) {
    return this.prisma.bossMap.findUnique({
      where: { id },
      include: {
        configs: { where: { isActive: true }, orderBy: { orderIndex: "asc" } },
      },
    });
  }

  async createMap(data: {
    name: string;
    jlptLevel: string;
    orderIndex: number;
    description?: string;
    emoji?: string;
  }) {
    return this.prisma.bossMap.create({ data });
  }

  // ── User Boss Progress ──
  async getUserProgress(userId: number) {
    return this.prisma.userBossProgress.findMany({
      where: { userId },
    });
  }

  async getUserProgressForBoss(userId: number, bossConfigId: number) {
    return this.prisma.userBossProgress.findUnique({
      where: { userId_bossConfigId: { userId, bossConfigId } },
    });
  }

  async upsertUserProgress(data: {
    userId: number;
    bossConfigId: number;
    isUnlocked?: boolean;
    isCompleted?: boolean;
    stars?: number;
    bestScore?: number;
    completedAt?: Date;
  }) {
    const { userId, bossConfigId, ...rest } = data;
    return this.prisma.userBossProgress.upsert({
      where: { userId_bossConfigId: { userId, bossConfigId } },
      create: { userId, bossConfigId, ...rest },
      update: rest,
    });
  }

  async getNextBossInMap(mapId: number, afterOrderIndex: number) {
    return this.prisma.bossConfig.findFirst({
      where: { mapId, orderIndex: { gt: afterOrderIndex }, isActive: true },
      orderBy: { orderIndex: "asc" },
    });
  }

  async getFirstBossOfNextMap(currentMapOrderIndex: number) {
    const nextMap = await this.prisma.bossMap.findFirst({
      where: { orderIndex: { gt: currentMapOrderIndex }, isActive: true },
      orderBy: { orderIndex: "asc" },
    });
    if (!nextMap) return null;
    return this.prisma.bossConfig.findFirst({
      where: { mapId: nextMap.id, isActive: true },
      orderBy: { orderIndex: "asc" },
    });
  }

  async ensureFirstBossUnlocked(userId: number) {
    // Unlock the first boss of the first map if no progress exists
    const firstBoss = await this.prisma.bossConfig.findFirst({
      where: { isActive: true, map: { isActive: true } },
      orderBy: [{ map: { orderIndex: "asc" } }, { orderIndex: "asc" }],
    });
    if (!firstBoss) return;
    await this.prisma.userBossProgress.upsert({
      where: { userId_bossConfigId: { userId, bossConfigId: firstBoss.id } },
      create: { userId, bossConfigId: firstBoss.id, isUnlocked: true },
      update: {},
    });
  }

  // ── Admin: Map CRUD ──────────────────────────────────────────────────

  async updateMap(id: number, data: Partial<{ name: string; jlptLevel: string; orderIndex: number; description: string; emoji: string; isActive: boolean }>) {
    return this.prisma.bossMap.update({ where: { id }, data });
  }

  async deleteMap(id: number) {
    return this.prisma.bossMap.delete({ where: { id } });
  }

  async assignBossToMap(bossConfigId: number, mapId: number | null, orderIndex: number) {
    return this.prisma.bossConfig.update({
      where: { id: bossConfigId },
      data: { mapId, orderIndex },
    });
  }
}
