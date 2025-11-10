import { Body, Container, Head, Heading, Html, Img, Section, Text, Button } from '@react-email/components'
import * as React from 'react'

interface EmailProps {
  studentName: string
  courseTitle: string
  courseThumbnail?: string
  expiresAt: Date
  courseId: number
}

const logoUrl = 'https://torii-nihongo-gakuin-s3.s3.ap-southeast-1.amazonaws.com/Torii_Nihongo_Gakuin_Logo.png'
const appUrl = 'https://torii-nihongo-gakuin.io.vn'

export const CourseWelcomeEmail = ({ studentName, courseTitle, courseThumbnail, expiresAt, courseId }: EmailProps) => (
  <Html>
    <Head>
      <title>Chào mừng bạn đến với khóa học: {courseTitle}</title>
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
          <Heading style={titleCss}>Chào mừng bạn đến với khóa học mới! 🎉</Heading>

          <Text style={description}>
            Chúc mừng bạn đã đăng ký thành công khóa học <strong>{courseTitle}</strong>. Chúng tôi rất vui mừng được
            đồng hành cùng bạn trong hành trình học tiếng Nhật!
          </Text>

          {/* Course Thumbnail */}
          {courseThumbnail && (
            <Section style={courseImageSection}>
              <Img src={courseThumbnail} width="400" height="225" alt={courseTitle} style={courseImage} />
            </Section>
          )}

          {/* Course Info */}
          <Section style={courseInfoBox}>
            <Text style={courseInfoTitle}>📚 Thông tin khóa học</Text>
            <Text style={courseInfoText}>
              <strong>Tên khóa học:</strong> {courseTitle}
              <br />
              <strong>Ngày hết hạn:</strong> {new Date(expiresAt).toLocaleDateString('vi-VN')}
              <br />
              <strong>Thời gian truy cập:</strong> 1 năm từ ngày đăng ký
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaWrap}>
            <Button style={ctaBtn} href={`${appUrl}/customer/my-course`}>
              Bắt đầu học ngay
            </Button>
            <Text style={ctaHelp}>
              Hoặc truy cập vào trang khóa học tại: <br />
              <a href={`${appUrl}/customer/my-course`} style={link}>
                {appUrl}/customer/my-course
              </a>
            </Text>
          </Section>

          {/* Learning Tips */}
          <Section style={tipsBox}>
            <Text style={tipsTitle}>💡 Lời khuyên để học hiệu quả</Text>
            <Text style={tipsText}>
              • Học đều đặn mỗi ngày, dù chỉ 15-30 phút
              <br />
              • Làm bài tập và quiz để củng cố kiến thức
              <br />
              • Ghi chú những từ vựng và ngữ pháp mới
              <br />
              • Thực hành với các bài tập thực tế
              <br />• Tham gia cộng đồng học tập để trao đổi kinh nghiệm
            </Text>
          </Section>

          {/* Support Section */}
          <Section style={supportSection}>
            <Text style={supportTitle}>🤝 Hỗ trợ học tập</Text>
            <Text style={supportText}>
              Nếu bạn có bất kỳ câu hỏi nào trong quá trình học, đừng ngần ngại liên hệ với chúng tôi. Team hỗ trợ của
              Torii Nihongo Gakuin luôn sẵn sàng giúp đỡ bạn!
            </Text>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>© 2025 Torii Nihongo Gakuin. Tất cả quyền được bảo lưu.</Text>
          <Text style={footerSubtext}>Chúc bạn học tập hiệu quả và đạt được mục tiêu tiếng Nhật! がんばって！</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

CourseWelcomeEmail.PreviewProps = {
  studentName: 'Nguyễn Văn A',
  courseTitle: 'Tiếng Nhật Cơ Bản N5',
  courseThumbnail: 'https://example.com/course-thumbnail.jpg',
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  courseId: 1,
} as EmailProps

export default CourseWelcomeEmail

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
  backgroundColor: '#16a34a',
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

const courseImageSection = {
  margin: '24px 0',
  textAlign: 'center' as const,
}

const courseImage = {
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  maxWidth: '100%',
  height: 'auto',
}

const courseInfoBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '10px',
  padding: '20px',
  margin: '24px 0',
}

const courseInfoTitle = {
  color: '#0c4a6e',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
}

const courseInfoText = {
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
  backgroundColor: '#16a34a',
  color: '#ffffff',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
}

const link = {
  color: '#16a34a',
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
