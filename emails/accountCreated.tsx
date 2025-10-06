import { Body, Container, Head, Heading, Html, Img, Section, Text, Button } from '@react-email/components'
import * as React from 'react'

interface EmailProps {
  passworDefault: string
  title: string
  role: 'Nhân viên' | 'Giảng viên'
}

const logoUrl = 'https://mconnectv1.s3.ap-southeast-1.amazonaws.com/Torii_Nihongo_Gakuin_Logo.png'

const resetPasswordUrl = 'https://app.toriinihongo.vn/account/change-password'

export const AccountCreatedEmail = ({ passworDefault, title, role }: EmailProps) => (
  <Html>
    <Head>
      <title>{title}</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Img src={logoUrl} width="200" height="200" alt="Torii Nihongo Gakuin Logo" style={logo} />
        </Section>

        {/* Content */}
        <Section style={content}>
          <Text style={greeting}>Xin chào!</Text>
          <Heading style={titleCss}>Tài khoản {role} đã được tạo</Heading>

          <Text style={description}>
            Tài khoản của bạn đã được khởi tạo thành công. Vì lý do bảo mật, vui lòng đăng nhập bằng mật khẩu mặc định
            bên dưới và <strong>đổi mật khẩu ngay</strong>.
          </Text>

          {/* Default Password */}
          <Section style={otpSection}>
            <Section style={codeContainer}>
              <Text style={code}>{passworDefault}</Text>
            </Section>
            <Text style={codeNote}>Đây là mật khẩu mặc định tạm thời</Text>
          </Section>

          {/* CTA */}
          <Section style={ctaWrap}>
            <Button style={ctaBtn} href={resetPasswordUrl}>
              Đổi mật khẩu ngay
            </Button>
            <Text style={ctaHelp}>
              Nếu nút không hoạt động, hãy truy cập: <br />
              <a href={resetPasswordUrl} style={link}>
                {resetPasswordUrl}
              </a>
            </Text>
          </Section>

          {/* Steps */}
          <Section style={stepsBox}>
            <Text style={stepsTitle}>Hướng dẫn nhanh</Text>
            <Text style={stepsText}>
              1) Đăng nhập bằng email công ty và mật khẩu mặc định ở trên. <br />
              2) Đi tới mục <em>Tài khoản &gt; Đổi mật khẩu</em>. <br />
              3) Tạo mật khẩu mới đủ mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số). <br />
              4) Không chia sẻ mật khẩu với người khác.
            </Text>
          </Section>

          {/* Security */}
          <Section style={securitySection}>
            <Text style={securityTitle}>🔒 Lưu ý bảo mật</Text>
            <Text style={securityText}>
              Nếu bạn không yêu cầu tạo tài khoản, hãy <strong>không sử dụng</strong> mật khẩu mặc định này và liên hệ
              quản trị hệ thống ngay để được hỗ trợ.
            </Text>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>© 2025 Torii Nihongo Gakuin. Tất cả quyền được bảo lưu.</Text>
          <Text style={footerSubtext}>Email này được gửi tự động, vui lòng không trả lời.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

AccountCreatedEmail.PreviewProps = {
  passworDefault: 'Nv@2025!Temp',
  title: 'Tài khoản nhân viên đã được tạo – Yêu cầu đổi mật khẩu',
  role: 'Nhân viên',
} as EmailProps

export default AccountCreatedEmail

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
  backgroundColor: '#1e40af',
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

const otpSection = {
  margin: '24px 0',
  textAlign: 'center' as const,
}

const codeContainer = {
  backgroundColor: '#f1f5f9',
  border: '2px dashed #cbd5e1',
  borderRadius: '12px',
  margin: '0 auto 12px',
  padding: '20px',
  width: 'fit-content',
}

const code = {
  color: '#1e40af',
  fontFamily: 'Monaco, "Lucida Console", monospace',
  fontSize: '32px',
  fontWeight: '800',
  letterSpacing: '4px',
  lineHeight: '1',
  margin: '0',
  textAlign: 'center' as const,
}

const codeNote = {
  color: '#64748b',
  fontSize: '14px',
  fontStyle: 'italic',
  margin: '0',
  textAlign: 'center' as const,
}

const ctaWrap = {
  textAlign: 'center' as const,
  marginTop: '16px',
}

const ctaBtn = {
  display: 'inline-block',
  padding: '12px 18px',
  fontSize: '16px',
  fontWeight: 700,
  textDecoration: 'none',
  borderRadius: '10px',
  backgroundColor: '#1e40af',
  color: '#ffffff',
}

const link = {
  color: '#1e40af',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const ctaHelp = {
  marginTop: '10px',
  fontSize: '14px',
  color: '#475569',
  textAlign: 'center' as const,
}

const stepsBox = {
  backgroundColor: '#eef2ff',
  border: '1px solid #c7d2fe',
  borderRadius: '10px',
  padding: '16px',
  marginTop: '24px',
}

const stepsTitle = {
  color: '#1e1b4b',
  fontSize: '16px',
  fontWeight: 700,
  margin: '0 0 8px 0',
}

const stepsText = {
  color: '#312e81',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: 0,
}

const securitySection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  margin: '24px 0 0',
  padding: '20px',
}

const securityTitle = {
  color: '#92400e',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
}

const securityText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.5',
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
