import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/shared/services/prisma.service";
import { TimePeriod } from "./dashboard.model";
import { Prisma } from "@prisma/client";

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Revenue related queries
  async getTotalRevenue(startDate?: Date, endDate?: Date) {
    const whereClause: Prisma.OrderWhereInput = {
      status: "COMPLETED",
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const result = await this.prisma.order.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalRevenue: result._sum.totalAmount || 0,
      totalOrders: result._count.id || 0,
    };
  }

  async getRevenueByPeriod(period: TimePeriod, startDate: Date, endDate: Date) {
    let dateFormat: string;
    let groupByFormat: string;

    switch (period) {
      case "day":
        dateFormat = "YYYY-MM-DD";
        groupByFormat = 'DATE("createdAt")';
        break;
      case "week":
        dateFormat = 'YYYY-"W"WW';
        groupByFormat = "DATE_TRUNC('week', \"createdAt\")";
        break;
      case "month":
        dateFormat = "YYYY-MM";
        groupByFormat = "DATE_TRUNC('month', \"createdAt\")";
        break;
      case "quarter":
        dateFormat = 'YYYY-"Q"Q';
        groupByFormat = "DATE_TRUNC('quarter', \"createdAt\")";
        break;
      case "year":
        dateFormat = "YYYY";
        groupByFormat = "DATE_TRUNC('year', \"createdAt\")";
        break;
      default:
        dateFormat = "YYYY-MM-DD";
        groupByFormat = 'DATE("createdAt")';
    }

    const result = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        revenue: bigint;
        order_count: bigint;
      }>
    >`
      SELECT 
        ${Prisma.raw(groupByFormat)} as period,
        COALESCE(SUM("totalAmount"), 0) as revenue,
        COUNT(*) as order_count
      FROM learning."Order"
      WHERE status = 'COMPLETED'
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY ${Prisma.raw(groupByFormat)}
      ORDER BY period ASC
    `;

    return result.map((row) => ({
      period: row.period,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count),
    }));
  }

  // User growth related queries
  async getTotalUsers() {
    return await this.prisma.user.count({
      where: {
        deletedAt: null,
      },
    });
  }

  async getNewUsersCount(startDate: Date, endDate: Date) {
    return await this.prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
    });
  }

  async getUserGrowthByPeriod(
    period: TimePeriod,
    startDate: Date,
    endDate: Date,
  ) {
    let groupByFormat: string;

    switch (period) {
      case "day":
        groupByFormat = 'DATE("createdAt")';
        break;
      case "week":
        groupByFormat = "DATE_TRUNC('week', \"createdAt\")";
        break;
      case "month":
        groupByFormat = "DATE_TRUNC('month', \"createdAt\")";
        break;
      case "quarter":
        groupByFormat = "DATE_TRUNC('quarter', \"createdAt\")";
        break;
      case "year":
        groupByFormat = "DATE_TRUNC('year', \"createdAt\")";
        break;
      default:
        groupByFormat = 'DATE("createdAt")';
    }

    const result = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        new_users: bigint;
      }>
    >`
      SELECT 
        ${Prisma.raw(groupByFormat)} as period,
        COUNT(*) as new_users
      FROM learning."User"
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY ${Prisma.raw(groupByFormat)}
      ORDER BY period ASC
    `;

    return result.map((row) => ({
      period: row.period,
      newUsers: Number(row.new_users),
    }));
  }

  async getTotalUsersByDate(date: Date) {
    return await this.prisma.user.count({
      where: {
        createdAt: {
          lte: date,
        },
        deletedAt: null,
      },
    });
  }

  // Course revenue related queries
  async getCourseRevenueBreakdown(limit: number = 10) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number;
        course_name: string;
        course_slug: string;
        thumbnail_url: string | null;
        level: string;
        total_revenue: bigint;
        total_enrollments: bigint;
        average_price: number;
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        c.level,
        COALESCE(SUM(oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT o.id) as total_enrollments,
        CASE 
          WHEN COUNT(DISTINCT o.id) > 0 
          THEN COALESCE(SUM(oi."unitPrice"), 0) / COUNT(DISTINCT o.id)
          ELSE 0 
        END as average_price
      FROM learning."Course" c
      LEFT JOIN learning."OrderItem" oi ON c.id = oi."courseId"
      LEFT JOIN learning."Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", c.level
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `;

    return result.map((row) => ({
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
      totalRevenue: Number(row.total_revenue),
      totalEnrollments: Number(row.total_enrollments),
      averagePrice: Number(row.average_price),
    }));
  }

  async getTopCoursesByRevenue(limit: number = 5) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number;
        course_name: string;
        course_slug: string;
        thumbnail_url: string | null;
        level: string;
        total_revenue: bigint;
        total_enrollments: bigint;
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        c.level,
        COALESCE(SUM(oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT e.id) as total_enrollments
      FROM learning."Course" c
      LEFT JOIN learning."OrderItem" oi ON c.id = oi."courseId"
      LEFT JOIN learning."Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      LEFT JOIN learning."Enrollment" e ON c.id = e."courseId"
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", c.level
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `;

    return result.map((row) => ({
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
      totalRevenue: Number(row.total_revenue),
      totalEnrollments: Number(row.total_enrollments),
    }));
  }

  async getTopCoursesByEnrollments(limit: number = 5) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number;
        course_name: string;
        course_slug: string;
        thumbnail_url: string | null;
        level: string;
        total_revenue: bigint;
        total_enrollments: bigint;
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        c.level,
        COALESCE(SUM(oi."unitPrice"), 0) as total_revenue,
        COUNT(DISTINCT e.id) as total_enrollments
      FROM learning."Course" c
      LEFT JOIN learning."OrderItem" oi ON c.id = oi."courseId"
      LEFT JOIN learning."Order" o ON oi."orderId" = o.id AND o.status = 'COMPLETED'
      LEFT JOIN learning."Enrollment" e ON c.id = e."courseId"
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", c.level
      ORDER BY total_enrollments DESC
      LIMIT ${limit}
    `;

    return result.map((row) => ({
      courseId: row.course_id,
      courseName: row.course_name,
      courseSlug: row.course_slug,
      thumbnailUrl: row.thumbnail_url,
      level: row.level,
      totalRevenue: Number(row.total_revenue),
      totalEnrollments: Number(row.total_enrollments),
    }));
  }

  async getTotalCourseStats() {
    const [totalCourses, totalEnrollments, courseRevenue] = await Promise.all([
      this.prisma.course.count({
        where: {
          status: "PUBLISHED",
        },
      }),
      this.prisma.enrollment.count(),
      this.prisma.$queryRaw<Array<{ total_revenue: bigint }>>`
        SELECT COALESCE(SUM(oi."unitPrice"), 0) as total_revenue
        FROM learning."OrderItem" oi
        JOIN learning."Order" o ON oi."orderId" = o.id
        WHERE o.status = 'COMPLETED' AND oi."courseId" IS NOT NULL
      `,
    ]);

    return {
      totalCourses,
      totalEnrollments,
      totalCourseRevenue: Number(courseRevenue[0]?.total_revenue || 0),
    };
  }

  // Quick stats queries
  async getQuickStats() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRevenue,
      totalUsers,
      totalCourses,
      totalEnrollments,
      newUsersToday,
      newUsersThisWeek,
      revenueThisMonth,
    ] = await Promise.all([
      this.getTotalRevenue(),
      this.getTotalUsers(),
      this.prisma.course.count({ where: { status: "PUBLISHED" } }),
      this.prisma.enrollment.count(),
      this.getNewUsersCount(todayStart, now),
      this.getNewUsersCount(weekStart, now),
      this.getTotalRevenue(monthStart, now),
    ]);

    return {
      totalRevenue: totalRevenue.totalRevenue,
      totalUsers,
      totalCourses,
      totalEnrollments,
      newUsersToday,
      newUsersThisWeek,
      revenueThisMonth: revenueThisMonth.totalRevenue,
    };
  }

  // === Customer Dashboard Queries ===

  // Course statistics for customer
  async getCustomerCourseStats(userId: number) {
    const result = await this.prisma.$queryRaw<
      Array<{
        total_courses: bigint;
        completed_courses: bigint;
        in_progress_courses: bigint;
      }>
    >`
      SELECT 
        COUNT(DISTINCT e."courseId") as total_courses,
        COUNT(DISTINCT CASE 
          WHEN (
            SELECT COUNT(*)
            FROM learning."Lesson" l
            JOIN learning."Module" m ON l."moduleId" = m.id
            WHERE m."courseId" = e."courseId"
          ) = (
            SELECT COUNT(*)
            FROM learning.lesson_progress lp
            JOIN learning."Lesson" l2 ON lp."lessonId" = l2.id
            JOIN learning."Module" m2 ON l2."moduleId" = m2.id
            WHERE m2."courseId" = e."courseId" 
              AND lp."userId" = ${userId} 
              AND lp.completed = true
          ) AND (
            SELECT COUNT(*)
            FROM learning."Lesson" l3
            JOIN learning."Module" m3 ON l3."moduleId" = m3.id
            WHERE m3."courseId" = e."courseId"
          ) > 0
          THEN e."courseId" 
        END) as completed_courses,
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1
            FROM learning.lesson_progress lp2
            JOIN learning."Lesson" l4 ON lp2."lessonId" = l4.id
            JOIN learning."Module" m4 ON l4."moduleId" = m4.id
            WHERE m4."courseId" = e."courseId" 
              AND lp2."userId" = ${userId}
          ) AND NOT (
            SELECT COUNT(*)
            FROM learning."Lesson" l5
            JOIN learning."Module" m5 ON l5."moduleId" = m5.id
            WHERE m5."courseId" = e."courseId"
          ) = (
            SELECT COUNT(*)
            FROM learning.lesson_progress lp3
            JOIN learning."Lesson" l6 ON lp3."lessonId" = l6.id
            JOIN learning."Module" m6 ON l6."moduleId" = m6.id
            WHERE m6."courseId" = e."courseId" 
              AND lp3."userId" = ${userId} 
              AND lp3.completed = true
          )
          THEN e."courseId"
        END) as in_progress_courses
      FROM learning."Enrollment" e
      WHERE e."userId" = ${userId}
    `;

    const stats = result[0] || {
      total_courses: 0n,
      completed_courses: 0n,
      in_progress_courses: 0n,
    };

    return {
      totalCourses: Number(stats.total_courses),
      completedCourses: Number(stats.completed_courses),
      inProgressCourses: Number(stats.in_progress_courses),
    };
  }

  // Study time statistics for customer
  async getCustomerStudyTime(userId: number) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get lesson study time
    const lessonTimeResult = await this.prisma.$queryRaw<
      Array<{
        total_study_minutes: bigint;
        today_study_minutes: bigint;
        week_study_minutes: bigint;
        month_study_minutes: bigint;
      }>
    >`
      SELECT 
        COALESCE(SUM(lp."watchedSec"), 0) / 60 as total_study_minutes,
        COALESCE(SUM(
          CASE 
            WHEN lp."updatedAt"::date = ${todayStart}::date 
            THEN lp."watchedSec" 
            ELSE 0 
          END
        ), 0) / 60 as today_study_minutes,
        COALESCE(SUM(
          CASE 
            WHEN lp."updatedAt" >= ${weekStart}
            THEN lp."watchedSec" 
            ELSE 0 
          END
        ), 0) / 60 as week_study_minutes,
        COALESCE(SUM(
          CASE 
            WHEN lp."updatedAt" >= ${monthStart}
            THEN lp."watchedSec" 
            ELSE 0 
          END
        ), 0) / 60 as month_study_minutes
      FROM learning.lesson_progress lp
      WHERE lp."userId" = ${userId}
    `;

    // Get assessment study time from assessment schema (attempts table)
    const assessmentTimeResult = await this.prisma.$queryRaw<
      Array<{
        total_assessment_minutes: bigint;
        today_assessment_minutes: bigint;
        week_assessment_minutes: bigint;
        month_assessment_minutes: bigint;
      }>
    >`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN att.submitted_at IS NOT NULL AND att.started_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (att.submitted_at - att.started_at)) / 60
            ELSE 0
          END
        ), 0) as total_assessment_minutes,
        
        COALESCE(SUM(
          CASE 
            WHEN att.submitted_at IS NOT NULL AND att.started_at IS NOT NULL 
            AND att.submitted_at::date = ${todayStart}::date
            THEN EXTRACT(EPOCH FROM (att.submitted_at - att.started_at)) / 60
            ELSE 0
          END
        ), 0) as today_assessment_minutes,
        
        COALESCE(SUM(
          CASE 
            WHEN att.submitted_at IS NOT NULL AND att.started_at IS NOT NULL 
            AND att.submitted_at >= ${weekStart}
            THEN EXTRACT(EPOCH FROM (att.submitted_at - att.started_at)) / 60
            ELSE 0
          END
        ), 0) as week_assessment_minutes,
        
        COALESCE(SUM(
          CASE 
            WHEN att.submitted_at IS NOT NULL AND att.started_at IS NOT NULL 
            AND att.submitted_at >= ${monthStart}
            THEN EXTRACT(EPOCH FROM (att.submitted_at - att.started_at)) / 60
            ELSE 0
          END
        ), 0) as month_assessment_minutes
      FROM assessment.attempts att
      WHERE att.user_id = ${userId}
    `;

    // Get daily breakdown for the last 30 days
    const dailyBreakdownResult = await this.prisma.$queryRaw<
      Array<{
        study_date: Date;
        lesson_minutes: bigint;
        assessment_minutes: bigint;
        total_minutes: bigint;
      }>
    >`
      WITH date_series AS (
        SELECT generate_series(
          ${thirtyDaysAgo}::date, 
          ${todayStart}::date, 
          '1 day'::interval
        )::date as study_date
      ),
      lesson_daily AS (
        SELECT 
          lp."updatedAt"::date as study_date,
          COALESCE(SUM(lp."watchedSec"), 0) / 60 as lesson_minutes
        FROM learning.lesson_progress lp
        WHERE lp."userId" = ${userId}
          AND lp."updatedAt" >= ${thirtyDaysAgo}
        GROUP BY lp."updatedAt"::date
      ),
      assessment_daily AS (
        SELECT 
          att.submitted_at::date as study_date,
          COALESCE(SUM(
            CASE 
              WHEN att.submitted_at IS NOT NULL AND att.started_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (att.submitted_at - att.started_at)) / 60
              ELSE 0
            END
          ), 0) as assessment_minutes
        FROM assessment.attempts att
        WHERE att.user_id = ${userId}
          AND att.submitted_at >= ${thirtyDaysAgo}
          AND att.submitted_at IS NOT NULL
        GROUP BY att.submitted_at::date
      )
      SELECT 
        ds.study_date,
        COALESCE(ld.lesson_minutes, 0) as lesson_minutes,
        COALESCE(ad.assessment_minutes, 0) as assessment_minutes,
        COALESCE(ld.lesson_minutes, 0) + COALESCE(ad.assessment_minutes, 0) as total_minutes
      FROM date_series ds
      LEFT JOIN lesson_daily ld ON ds.study_date = ld.study_date
      LEFT JOIN assessment_daily ad ON ds.study_date = ad.study_date
      ORDER BY ds.study_date ASC
    `;

    const lessonStats = lessonTimeResult[0] || {
      total_study_minutes: 0n,
      today_study_minutes: 0n,
      week_study_minutes: 0n,
      month_study_minutes: 0n,
    };

    const assessmentStats = assessmentTimeResult[0] || {
      total_assessment_minutes: 0n,
      today_assessment_minutes: 0n,
      week_assessment_minutes: 0n,
      month_assessment_minutes: 0n,
    };

    // Calculate study streak based on both lesson progress and assessment completion
    const streakResult = await this.prisma.$queryRaw<
      Array<{ streak_days: bigint }>
    >`
      WITH daily_study AS (
        SELECT DISTINCT study_date 
        FROM (
          SELECT lp."updatedAt"::date as study_date
          FROM learning.lesson_progress lp
          WHERE lp."userId" = ${userId} AND lp."watchedSec" > 0
          UNION
          SELECT att.submitted_at::date as study_date
          FROM assessment.attempts att
          WHERE att.user_id = ${userId} AND att.submitted_at IS NOT NULL
        ) combined_study
        ORDER BY study_date DESC
      ),
      streak_calc AS (
        SELECT 
          study_date,
          ROW_NUMBER() OVER (ORDER BY study_date DESC) as rn,
          study_date - (ROW_NUMBER() OVER (ORDER BY study_date DESC) || ' days')::interval as streak_group
        FROM daily_study
        WHERE study_date >= CURRENT_DATE - INTERVAL '365 days'
      )
      SELECT COUNT(*) as streak_days
      FROM streak_calc
      WHERE streak_group = (
        SELECT streak_group 
        FROM streak_calc 
        WHERE study_date = CURRENT_DATE OR study_date = CURRENT_DATE - 1
        ORDER BY study_date DESC 
        LIMIT 1
      )
    `;

    const streak = streakResult[0]?.streak_days || 0n;

    // Calculate total study time
    const totalLessonMinutes = Number(lessonStats.total_study_minutes);
    const totalAssessmentMinutes = Number(
      assessmentStats.total_assessment_minutes,
    );
    const totalMinutes = totalLessonMinutes + totalAssessmentMinutes;

    // Calculate active days
    const daysActive = await this.prisma.$queryRaw<
      Array<{ active_days: bigint }>
    >`
      SELECT COUNT(DISTINCT study_date) as active_days
      FROM (
        SELECT lp."updatedAt"::date as study_date
        FROM learning.lesson_progress lp
        WHERE lp."userId" = ${userId} AND lp."watchedSec" > 0
        UNION
        SELECT att.submitted_at::date as study_date
        FROM assessment.attempts att
        WHERE att.user_id = ${userId} AND att.submitted_at IS NOT NULL
      ) combined_study
    `;

    const activeDays = Number(daysActive[0]?.active_days || 1);
    const averageDailyMinutes = totalMinutes / Math.max(activeDays, 1);

    // Format daily breakdown
    const dailyBreakdown = dailyBreakdownResult.map((day) => ({
      date: day.study_date.toISOString().split("T")[0], // YYYY-MM-DD format
      lessonMinutes: Number(day.lesson_minutes),
      assessmentMinutes: Number(day.assessment_minutes),
      totalMinutes: Number(day.total_minutes),
    }));

    return {
      totalStudyMinutes: totalMinutes,
      todayStudyMinutes:
        Number(lessonStats.today_study_minutes) +
        Number(assessmentStats.today_assessment_minutes),
      thisWeekStudyMinutes:
        Number(lessonStats.week_study_minutes) +
        Number(assessmentStats.week_assessment_minutes),
      thisMonthStudyMinutes:
        Number(lessonStats.month_study_minutes) +
        Number(assessmentStats.month_assessment_minutes),
      averageDailyMinutes: Math.round(averageDailyMinutes * 100) / 100,
      studyStreak: Number(streak),
      dailyBreakdown,
      lessonTimeBreakdown: {
        totalMinutes: totalLessonMinutes,
        todayMinutes: Number(lessonStats.today_study_minutes),
        thisWeekMinutes: Number(lessonStats.week_study_minutes),
        thisMonthMinutes: Number(lessonStats.month_study_minutes),
      },
      assessmentTimeBreakdown: {
        totalMinutes: totalAssessmentMinutes,
        todayMinutes: Number(assessmentStats.today_assessment_minutes),
        thisWeekMinutes: Number(assessmentStats.week_assessment_minutes),
        thisMonthMinutes: Number(assessmentStats.month_assessment_minutes),
      },
    };
  }

  // Assessment statistics for customer (from assessment schema)
  async getCustomerAssessmentStats(userId: number) {
    const result = await this.prisma.$queryRaw<
      Array<{
        total_attempts: bigint;
        completed_assessments: bigint;
        average_score: number;
        highest_score: number;
        passed_assessments: bigint;
        failed_assessments: bigint;
      }>
    >`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN att.submitted_at IS NOT NULL THEN 1 END) as completed_assessments,
        COALESCE(AVG(CASE WHEN att.score IS NOT NULL THEN att.score END), 0) as average_score,
        COALESCE(MAX(att.score), 0) as highest_score,
        COUNT(CASE WHEN att.score >= 60 THEN 1 END) as passed_assessments,
        COUNT(CASE WHEN att.score IS NOT NULL AND att.score < 60 THEN 1 END) as failed_assessments
      FROM assessment.attempts att
      WHERE att.user_id = ${userId}
    `;

    const stats = result[0] || {
      total_attempts: 0n,
      completed_assessments: 0n,
      average_score: 0,
      highest_score: 0,
      passed_assessments: 0n,
      failed_assessments: 0n,
    };

    const totalCompleted = Number(stats.completed_assessments);
    const passRate =
      totalCompleted > 0
        ? (Number(stats.passed_assessments) / totalCompleted) * 100
        : 0;

    return {
      totalAttempts: Number(stats.total_attempts),
      completedAssessments: totalCompleted,
      averageScore: Math.round(stats.average_score * 100) / 100,
      highestScore: Math.round(stats.highest_score * 100) / 100,
      passedAssessments: Number(stats.passed_assessments),
      failedAssessments: Number(stats.failed_assessments),
      passRate: Math.round(passRate * 100) / 100,
    };
  }

  // Flashcard statistics for customer
  async getCustomerFlashcardStats(userId: number) {
    const result = await this.prisma.$queryRaw<
      Array<{
        total_flashcards: bigint;
        mastered_flashcards: bigint;
        reviewing_flashcards: bigint;
        new_flashcards: bigint;
        daily_reviews_completed: bigint;
      }>
    >`
      SELECT 
        COUNT(DISTINCT cp."cardId") as total_flashcards,
        COUNT(DISTINCT CASE WHEN cp.repetitions >= 3 AND cp.ef >= 2.5 THEN cp."cardId" END) as mastered_flashcards,
        COUNT(DISTINCT CASE WHEN cp.repetitions > 0 AND cp.repetitions < 3 THEN cp."cardId" END) as reviewing_flashcards,
        COUNT(DISTINCT CASE WHEN cp.repetitions = 0 THEN cp."cardId" END) as new_flashcards,
        COUNT(DISTINCT CASE 
          WHEN cp."dueAt"::date <= CURRENT_DATE AND cp."lastGrade" IS NOT NULL 
          THEN cp."cardId" 
        END) as daily_reviews_completed
      FROM learning."CardProgress" cp
      WHERE cp."userId" = ${userId}
    `;

    const stats = result[0] || {
      total_flashcards: 0n,
      mastered_flashcards: 0n,
      reviewing_flashcards: 0n,
      new_flashcards: 0n,
      daily_reviews_completed: 0n,
    };

    // Calculate accuracy rate from recent reviews
    const accuracyResult = await this.prisma.$queryRaw<
      Array<{ accuracy_rate: number }>
    >`
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 
          THEN AVG(CASE WHEN "lastGrade" >= 3 THEN 100.0 ELSE 0.0 END)
          ELSE 0 
        END as accuracy_rate
      FROM learning."CardProgress" 
      WHERE "userId" = ${userId} 
        AND "lastGrade" IS NOT NULL
        AND "dueAt" >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const accuracyRate = accuracyResult[0]?.accuracy_rate || 0;

    return {
      totalFlashcards: Number(stats.total_flashcards),
      masteredFlashcards: Number(stats.mastered_flashcards),
      reviewingFlashcards: Number(stats.reviewing_flashcards),
      newFlashcards: Number(stats.new_flashcards),
      dailyReviewsCompleted: Number(stats.daily_reviews_completed),
      accuracyRate: Math.round(accuracyRate * 100) / 100,
    };
  }

  // Payment summary for customer
  async getCustomerPaymentSummary(userId: number) {
    const result = await this.prisma.$queryRaw<
      Array<{
        total_spent: bigint;
        total_orders: bigint;
        successful_payments: bigint;
        pending_payments: bigint;
        failed_payments: bigint;
        last_payment_date: Date | null;
      }>
    >`
      SELECT 
        COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o."totalAmount" ELSE 0 END), 0) as total_spent,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN o.status = 'COMPLETED' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN o.status = 'PENDING' OR o.status = 'PROCESSING' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) as failed_payments,
        MAX(CASE WHEN o.status = 'COMPLETED' THEN o."createdAt" END) as last_payment_date
      FROM learning."Order" o
      WHERE o."userId" = ${userId}
    `;

    const stats = result[0] || {
      total_spent: 0n,
      total_orders: 0n,
      successful_payments: 0n,
      pending_payments: 0n,
      failed_payments: 0n,
      last_payment_date: null,
    };

    const totalOrders = Number(stats.total_orders);
    const averageOrderValue =
      totalOrders > 0
        ? Number(stats.total_spent) / Number(stats.successful_payments || 1)
        : 0;

    return {
      totalSpent: Number(stats.total_spent),
      totalOrders,
      successfulPayments: Number(stats.successful_payments),
      pendingPayments: Number(stats.pending_payments),
      failedPayments: Number(stats.failed_payments),
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      lastPaymentDate: stats.last_payment_date,
    };
  }

  // Customer progress items
  async getCustomerProgress(userId: number, limit: number = 10) {
    const result = await this.prisma.$queryRaw<
      Array<{
        course_id: number;
        course_name: string;
        course_slug: string;
        thumbnail_url: string | null;
        enrollment_date: Date;
        completed_lessons: bigint;
        total_lessons: bigint;
        last_studied_at: Date | null;
        level: string;
      }>
    >`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        c.slug as course_slug,
        c."thumbnailUrl" as thumbnail_url,
        e."createdAt" as enrollment_date,
        COUNT(DISTINCT lp."lessonId") as completed_lessons,
        COUNT(DISTINCT l.id) as total_lessons,
        MAX(lp."updatedAt") as last_studied_at,
        c.level
      FROM learning."Enrollment" e
      JOIN learning."Course" c ON e."courseId" = c.id
      JOIN learning."Module" m ON c.id = m."courseId"
      JOIN learning."Lesson" l ON m.id = l."moduleId"
      LEFT JOIN learning.lesson_progress lp ON l.id = lp."lessonId" AND lp."userId" = ${userId} AND lp.completed = true
      WHERE e."userId" = ${userId}
      GROUP BY c.id, c.title, c.slug, c."thumbnailUrl", e."createdAt", c.level
      ORDER BY last_studied_at DESC NULLS LAST, enrollment_date DESC
      LIMIT ${limit}
    `;

    return result.map((row) => {
      const completedLessons = Number(row.completed_lessons);
      const totalLessons = Number(row.total_lessons);
      const progressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      return {
        courseId: row.course_id,
        courseName: row.course_name,
        courseSlug: row.course_slug,
        thumbnailUrl: row.thumbnail_url,
        enrollmentDate: row.enrollment_date,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        completedLessons,
        totalLessons,
        lastStudiedAt: row.last_studied_at,
        level: row.level,
      };
    });
  }

  // Customer flashcard decks
  async getCustomerFlashcardDecks(userId: number, limit: number = 10) {
    const result = await this.prisma.$queryRaw<
      Array<{
        deck_id: number;
        deck_name: string;
        total_cards: bigint;
        new_cards: bigint;
        review_cards: bigint;
        mastered_cards: bigint;
        last_reviewed_at: Date | null;
        course_id: number | null;
        course_name: string | null;
      }>
    >`
      SELECT 
        fd.id as deck_id,
        fd.title as deck_name,
        COUNT(DISTINCT f.id) as total_cards,
        COUNT(DISTINCT CASE WHEN cp.repetitions = 0 THEN f.id END) as new_cards,
        COUNT(DISTINCT CASE WHEN cp.repetitions > 0 AND cp.repetitions < 3 THEN f.id END) as review_cards,
        COUNT(DISTINCT CASE WHEN cp.repetitions >= 3 AND cp.ef >= 2.5 THEN f.id END) as mastered_cards,
        MAX(cp."dueAt") as last_reviewed_at,
        NULL as course_id,
        NULL as course_name
      FROM learning."FlashcardDeck" fd
      LEFT JOIN learning."Flashcard" f ON fd.id = f."deckId"
      LEFT JOIN learning."CardProgress" cp ON f.id = cp."cardId" AND cp."userId" = ${userId}
      WHERE fd."ownerId" = ${userId}
      GROUP BY fd.id, fd.title
      ORDER BY last_reviewed_at DESC NULLS LAST
      LIMIT ${limit}
    `;

    return result.map((row) => {
      const totalCards = Number(row.total_cards);
      const masteredCards = Number(row.mastered_cards);
      const accuracyRate =
        totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;

      return {
        deckId: row.deck_id,
        deckName: row.deck_name,
        totalCards,
        newCards: Number(row.new_cards),
        reviewCards: Number(row.review_cards),
        masteredCards,
        lastReviewedAt: row.last_reviewed_at,
        accuracyRate: Math.round(accuracyRate * 100) / 100,
        courseId: row.course_id,
        courseName: row.course_name,
      };
    });
  }

  // Customer recent payments
  async getCustomerRecentPayments(userId: number, limit: number = 10) {
    const result = await this.prisma.$queryRaw<
      Array<{
        order_id: number;
        course_id: number | null;
        course_name: string | null;
        amount: number;
        status: string;
        payment_date: Date;
        payment_method: string | null;
      }>
    >`
      SELECT 
        o.id as order_id,
        oi."courseId" as course_id,
        c.title as course_name,
        o."totalAmount" as amount,
        o.status,
        o."createdAt" as payment_date,
        p.method as payment_method
      FROM learning."Order" o
      LEFT JOIN learning."OrderItem" oi ON o.id = oi."orderId"
      LEFT JOIN learning."Course" c ON oi."courseId" = c.id
      LEFT JOIN learning."Payment" p ON o.id = p."orderId" AND p.status = 'PAID'
      WHERE o."userId" = ${userId}
      ORDER BY o."createdAt" DESC
      LIMIT ${limit}
    `;

    return result.map((row) => ({
      orderId: row.order_id,
      courseId: row.course_id,
      courseName: row.course_name || "Unknown Course",
      amount: row.amount,
      status:
        row.status.toLowerCase() === "completed"
          ? "success"
          : row.status.toLowerCase() === "pending" ||
              row.status.toLowerCase() === "processing"
            ? "pending"
            : "failed",
      paymentDate: row.payment_date,
      paymentMethod: row.payment_method,
    }));
  }
}
