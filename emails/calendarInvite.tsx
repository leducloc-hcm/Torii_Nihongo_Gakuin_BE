import { Body, Container, Head, Heading, Html, Img, Section, Text, Button } from '@react-email/components'
import * as React from 'react'

interface EmailProps {
  studentName: string
  classTitle: string
  courseTitle?: string
  lecturerName: string
  sessionsCount: number
  firstSessionDate: Date
  lastSessionDate: Date
  classId: number
  bulkGoogleCalendarUrl?: string | null
  sessions?: Array<{
    id: number
    title: string
    scheduledAt: Date
    lecturerName: string
  }>
}

const logoUrl = 'https://torii-nihongo-gakuin-s3.s3.ap-southeast-1.amazonaws.com/Torii_Nihongo_Gakuin_Logo.png'
const appUrl = 'https://torii-nihongo-gakuin.io.vn'

export const CalendarInviteEmail = ({
  studentName,
  classTitle,
  courseTitle,
  lecturerName,
  sessionsCount,
  firstSessionDate,
  lastSessionDate,
  classId,
  bulkGoogleCalendarUrl = null,
  sessions = [],
}: EmailProps) => (
  <Html>
    <Head>
      <title>{`📅 Lịch học trực tuyến - ${classTitle}`}</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Img src={logoUrl} width="200" height="200" alt="Torii Nihongo Gakuin Logo" style={logo} />
        </Section>

        {/* Content */}
        <Section style={content}>
          <Text style={greeting}>Xin chào {studentName}!</Text>
          <Heading style={titleCss}>📅 Lịch học trực tuyến đã sẵn sàng! 🎯</Heading>

          <Text style={description}>
            Chúng tôi đã tạo sẵn lịch học cho lớp <strong>{classTitle}</strong>
            {courseTitle && ` thuộc khóa học ${courseTitle}`}. Hãy thêm vào lịch của bạn để không bỏ lỡ bất kỳ buổi học
            nào!
          </Text>

          {/* Class Info */}
          <Section style={classInfoBox}>
            <Text style={classInfoTitle}>📚 Thông tin lớp học</Text>
            <Text style={classInfoText}>
              <strong>Tên lớp:</strong> {classTitle}
              <br />
              {courseTitle && (
                <>
                  <strong>Khóa học:</strong> {courseTitle}
                  <br />
                </>
              )}
              <strong>Giảng viên:</strong> {lecturerName}
              <br />
              <strong>Số buổi học:</strong> {sessionsCount} buổi
              <br />
              <strong>Bắt đầu:</strong>{' '}
              {new Date(firstSessionDate).toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              <br />
              <strong>Kết thúc:</strong>{' '}
              {new Date(lastSessionDate).toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Section>

          {/* Google Calendar Quick Add */}
          {bulkGoogleCalendarUrl && (
            <Section style={quickAddBox}>
              <Text style={quickAddTitle}>📅 Thêm nhanh vào Google Calendar</Text>
              <Text style={quickAddDescription}>
                Chỉ cần click vào nút bên dưới để tự động thêm toàn bộ lịch học vào Google Calendar của bạn:
              </Text>

              {/* Sessions Summary */}
              <Section style={sessionsPreviewBox}>
                <Text style={sessionsPreviewTitle}>📚 Tổng quan lịch học ({sessionsCount} buổi)</Text>
                {sessions.slice(0, 3).map((session) => (
                  <Text key={session.id} style={sessionPreviewInfo}>
                    • <strong>{session.title}</strong> -{' '}
                    {new Date(session.scheduledAt).toLocaleDateString('vi-VN', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                ))}
                {sessions.length > 3 && (
                  <Text style={sessionPreviewInfo}>... và {sessions.length - 3} buổi học khác</Text>
                )}
              </Section>

              {/* Single Add All Button */}
              <Section style={bulkButtonContainer}>
                <Button style={bulkGoogleCalendarBtn} href={bulkGoogleCalendarUrl}>
                  📅 Thêm toàn bộ lịch học vào Google Calendar
                </Button>
              </Section>

              <Text style={quickAddNote}>
                💡 <strong>Mẹo:</strong> Sau khi click, bạn sẽ được chuyển đến Google Calendar với thông tin tổng hợp về
                toàn bộ khóa học. Chỉ cần nhấn "Save" để hoàn tất việc thêm sự kiện!
              </Text>
            </Section>
          )}

          {/* Calendar Instructions */}
          <Section style={instructionsBox}>
            <Text style={instructionsTitle}>📲 Cách thêm vào lịch</Text>
            <Text style={instructionsText}>
              1. <strong>Tải file đính kèm</strong> (.ics) từ email này
              <br />
              2. <strong>Mở file</strong> bằng ứng dụng lịch (Google Calendar, Outlook, Apple Calendar)
              <br />
              3. <strong>Xác nhận</strong> thêm tất cả sự kiện vào lịch
              <br />
              4. <strong>Bật thông báo</strong> để nhận nhắc nhở trước mỗi buổi học
              <br />
              5. <strong>Đồng bộ</strong> với các thiết bị khác nếu cần
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaWrap}>
            <Button style={ctaBtn} href={`${appUrl}/classes/${classId}`}>
              Xem chi tiết lớp học
            </Button>
            <Text style={ctaHelp}>
              Hoặc truy cập trực tiếp: <br />
              <a href={`${appUrl}/classes/${classId}`} style={link}>
                {appUrl}/classes/{classId}
              </a>
            </Text>
          </Section>

          {/* Tips */}
          <Section style={tipsBox}>
            <Text style={tipsTitle}>💡 Lời khuyên học tập hiệu quả</Text>
            <Text style={tipsText}>
              • <strong>Chuẩn bị trước 10-15 phút:</strong> Kiểm tra kết nối, micro, camera
              <br />• <strong>Tham gia đầy đủ:</strong> Không bỏ lỡ buổi học nào để có hiệu quả tốt nhất
              <br />• <strong>Tương tác tích cực:</strong> Đặt câu hỏi và tham gia thảo luận
              <br />• <strong>Ghi chú:</strong> Viết lại những điểm quan trọng trong buổi học
              <br />• <strong>Thực hành sau học:</strong> Ôn tập và làm bài tập về nhà
            </Text>
          </Section>

          {/* Support Section */}
          <Section style={supportSection}>
            <Text style={supportTitle}>🆘 Hỗ trợ kỹ thuật</Text>
            <Text style={supportText}>
              Nếu bạn gặp khó khăn trong việc thêm lịch hoặc tham gia lớp học trực tuyến, đừng ngần ngại liên hệ với
              team hỗ trợ của chúng tôi. Chúng tôi luôn sẵn sàng giúp đỡ bạn!
            </Text>
          </Section>

          {/* Important Note */}
          <Section style={noteSection}>
            <Text style={noteTitle}>⚠️ Lưu ý quan trọng</Text>
            <Text style={noteText}>
              • Vui lòng tham gia đúng giờ để không làm gián đoạn buổi học
              <br />
              • Đảm bảo môi trường học tập yên tĩnh và tập trung
              <br />
              • Kiểm tra lịch học thường xuyên để cập nhật những thay đổi
              <br />• Liên hệ giảng viên nếu không thể tham gia buổi học nào
            </Text>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>© 2025 Torii Nihongo Gakuin. Tất cả quyền được bảo lưu.</Text>
          <Text style={footerSubtext}>Chúc bạn học tập hiệu quả và thành công! がんばって！</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

CalendarInviteEmail.PreviewProps = {
  studentName: 'Nguyễn Văn A',
  classTitle: 'Lớp N5 - Thứ 2, 4, 6',
  courseTitle: 'Tiếng Nhật Cơ Bản N5',
  lecturerName: 'Sensei Tanaka',
  sessionsCount: 12,
  firstSessionDate: new Date('2025-11-01T19:00:00'),
  lastSessionDate: new Date('2025-12-20T20:30:00'),
  classId: 1,
  bulkGoogleCalendarUrl:
    'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Lớp%20N5%20-%20Toàn%20bộ%20lịch%20học%20(12%20buổi)&dates=20251101T120000Z/20251220T140000Z&details=🎌%20LỊCH%20HỌC%20TOÀN%20BỘ%20KHÓA%20-%20Lớp%20N5',
  sessions: [
    {
      id: 1,
      title: 'Buổi 1 - Giới thiệu hiragana',
      scheduledAt: new Date('2025-11-01T19:00:00'),
      lecturerName: 'Sensei Tanaka',
    },
    {
      id: 2,
      title: 'Buổi 2 - Hiragana cơ bản',
      scheduledAt: new Date('2025-11-03T19:00:00'),
      lecturerName: 'Sensei Tanaka',
    },
    {
      id: 3,
      title: 'Buổi 3 - Katakana',
      scheduledAt: new Date('2025-11-06T19:00:00'),
      lecturerName: 'Sensei Tanaka',
    },
    {
      id: 4,
      title: 'Buổi 4 - Từ vựng cơ bản',
      scheduledAt: new Date('2025-11-08T19:00:00'),
      lecturerName: 'Sensei Tanaka',
    },
    {
      id: 5,
      title: 'Buổi 5 - Ngữ pháp N5',
      scheduledAt: new Date('2025-11-10T19:00:00'),
      lecturerName: 'Sensei Tanaka',
    },
  ],
} as EmailProps

export default CalendarInviteEmail

// ===== Styles =====
const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '20px 0',
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  margin: '0 auto',
  maxWidth: '600px',
  overflow: 'hidden',
}

const header = {
  backgroundColor: '#3b82f6',
  padding: '10px 0',
  textAlign: 'center' as const,
}

const logo = {
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  margin: '0 auto',
}

const content = {
  padding: '48px 40px',
}

const greeting = {
  color: '#64748b',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0 0 8px 0',
  textAlign: 'left' as const,
}

const titleCss = {
  color: '#1e293b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 16px 0',
  textAlign: 'left' as const,
}

const description = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
  textAlign: 'left' as const,
}

const classInfoBox = {
  backgroundColor: '#eff6ff',
  border: '1px solid #3b82f6',
  borderRadius: '10px',
  padding: '20px',
  margin: '24px 0',
}

const classInfoTitle = {
  color: '#1e40af',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
}

const classInfoText = {
  color: '#1e3a8a',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const instructionsBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '10px',
  padding: '20px',
  margin: '24px 0',
}

const instructionsTitle = {
  color: '#0c4a6e',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 12px 0',
}

const instructionsText = {
  color: '#075985',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const ctaWrap = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const ctaBtn = {
  display: 'inline-block',
  padding: '16px 32px',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  borderRadius: '10px',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const ctaHelp = {
  marginTop: '16px',
  fontSize: '14px',
  color: '#475569',
  textAlign: 'center' as const,
}

const tipsBox = {
  backgroundColor: '#fefce8',
  border: '1px solid #eab308',
  borderRadius: '10px',
  padding: '20px',
  margin: '24px 0',
}

const tipsTitle = {
  color: '#a16207',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 12px 0',
}

const tipsText = {
  color: '#a16207',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const supportSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #22c55e',
  borderRadius: '10px',
  padding: '20px',
  margin: '24px 0',
}

const supportTitle = {
  color: '#15803d',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 12px 0',
}

const supportText = {
  color: '#15803d',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const noteSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #f87171',
  borderRadius: '10px',
  padding: '20px',
  margin: '24px 0',
}

const noteTitle = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 12px 0',
}

const noteText = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
}

const footer = {
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px 0',
}

const footerSubtext = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0',
}

// Google Calendar Quick Add Styles
const quickAddBox = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #0ea5e9',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
}

const quickAddTitle = {
  color: '#0c4a6e',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

const quickAddDescription = {
  color: '#075985',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
}

const sessionButtonContainer = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '16px',
  margin: '12px 0',
  textAlign: 'center' as const,
}

const sessionInfo = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
}

const googleCalendarBtn = {
  display: 'inline-block',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  borderRadius: '8px',
  backgroundColor: '#4285f4',
  color: '#ffffff',
  boxShadow: '0 2px 4px rgba(66, 133, 244, 0.3)',
  border: 'none',
}

const quickAddNote = {
  color: '#0369a1',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '20px 0 0 0',
  textAlign: 'center' as const,
  fontStyle: 'italic',
}

// New styles for bulk calendar feature
const sessionsPreviewBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const sessionsPreviewTitle = {
  color: '#475569',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textAlign: 'left' as const,
}

const sessionPreviewInfo = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.4',
  margin: '4px 0',
  textAlign: 'left' as const,
}

const bulkButtonContainer = {
  textAlign: 'center' as const,
  margin: '20px 0',
}

const bulkGoogleCalendarBtn = {
  display: 'inline-block',
  padding: '16px 32px',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  borderRadius: '10px',
  backgroundColor: '#4285f4',
  color: '#ffffff',
  boxShadow: '0 4px 8px rgba(66, 133, 244, 0.3)',
  border: 'none',
}
