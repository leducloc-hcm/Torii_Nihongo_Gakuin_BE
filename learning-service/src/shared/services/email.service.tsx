import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import * as React from "react";
import { OTPEmail } from "emails/otp";
import AccountCreatedEmail from "emails/accountCreated";
import CourseWelcomeEmail from "emails/courseWelcome";
import CalendarInviteEmail from "emails/calendarInvite";
import CourseCertificateEmail from "emails/courseCertificate";

@Injectable()
export class EmailService {
  private resend: Resend;
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }
  async sendOTP(payload: { email: string; code: string }) {
    const subject = "Mã OTP";
    try {
      const result = await this.resend.emails.send({
        from: process.env.RESEND_FROM_ADDRESS!,
        to: [payload.email],
        subject,
        react: <OTPEmail otpCode={payload.code} title={subject} />,
      });
      return result;
    } catch (error) {
      // Return error in Resend's expected format
      return { data: null, error };
    }
  }
  async sendAccountCreated(payload: {
    email: string;
    password: string;
    role: "Nhân viên" | "Giảng viên";
  }) {
    const subject = `Tài khoản ${payload.role} đã được tạo`;
    return await this.resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS!,
      to: [payload.email],
      subject,
      react: (
        <AccountCreatedEmail
          passworDefault={payload.password}
          title={subject}
          role={payload.role}
        />
      ),
    });
  }

  async sendCourseWelcome(payload: {
    email: string;
    studentName: string;
    courseTitle: string;
    courseThumbnail?: string;
    expiresAt: Date;
    courseId: number;
  }) {
    const subject = `Chào mừng bạn đến với khóa học: ${payload.courseTitle}`;
    return await this.resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS!,
      to: [payload.email],
      subject,
      react: (
        <CourseWelcomeEmail
          studentName={payload.studentName}
          courseTitle={payload.courseTitle}
          courseThumbnail={payload.courseThumbnail}
          expiresAt={payload.expiresAt}
          courseId={payload.courseId}
        />
      ),
    });
  }

  async sendCalendarInvite(payload: {
    email: string;
    studentName: string;
    classTitle: string;
    courseTitle?: string;
    lecturerName: string;
    sessionsCount: number;
    firstSessionDate: Date;
    lastSessionDate: Date;
    classId: number;
    calendarData: string;
    bulkGoogleCalendarUrl?: string | null;
    sessions?: Array<{
      id: number;
      title: string;
      scheduledAt: Date;
      lecturerName: string;
    }>;
  }) {
    const subject = `📅 Lịch học trực tuyến - ${payload.classTitle}`;
    return await this.resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS!,
      to: [payload.email],
      subject,
      react: (
        <CalendarInviteEmail
          studentName={payload.studentName}
          classTitle={payload.classTitle}
          courseTitle={payload.courseTitle}
          lecturerName={payload.lecturerName}
          sessionsCount={payload.sessionsCount}
          firstSessionDate={payload.firstSessionDate}
          lastSessionDate={payload.lastSessionDate}
          classId={payload.classId}
          bulkGoogleCalendarUrl={payload.bulkGoogleCalendarUrl}
          sessions={payload.sessions}
        />
      ),
      attachments: [
        {
          filename: `${payload.classTitle.replace(/[^a-zA-Z0-9]/g, "_")}_Schedule.ics`,
          content: Buffer.from(payload.calendarData),
          contentType: "text/calendar; method=REQUEST",
        },
      ],
    });
  }

  async sendCourseCertificate(payload: {
    email: string;
    studentName: string;
    courseTitle: string;
    issuedAt: Date;
    verifyUrl: string;
    pdfBuffer?: Buffer;
  }) {
    const subject = `🎓 Chứng chỉ hoàn thành khóa học: ${payload.courseTitle}`;

    const attachments = payload.pdfBuffer
      ? [
          {
            filename: `Certificate_${payload.courseTitle.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
            content: payload.pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

    return await this.resend.emails.send({
      from: process.env.RESEND_FROM_ADDRESS!,
      to: [payload.email],
      subject,
      react: (
        <CourseCertificateEmail
          studentName={payload.studentName}
          courseTitle={payload.courseTitle}
          issuedAt={payload.issuedAt}
          verifyUrl={payload.verifyUrl}
        />
      ),
      attachments,
    });
  }
}
