import { Body, Container, Head, Heading, Html, Img, Section, Text } from '@react-email/components'
import * as React from 'react'
interface OTPEmailProps {
  otpCode: string
  title: string
}

const logoUrl = 'https://mconnectv1.s3.ap-southeast-1.amazonaws.com/Torii_Nihongo_Gakuin_Logo.png'

export const OTPEmail = ({ otpCode, title }: OTPEmailProps) => (
  <Html>
    <Head>
      <title>{title}</title>
    </Head>
    <Body style={main}>
      <Container style={container}>
        {/* Header Section */}
        <Section style={header}>
          <Img src={logoUrl} width="200" height="200" alt="Torii Nihongo Gakuin Logo" style={logo} />
        </Section>

        {/* Main Content */}
        <Section style={content}>
          <Text style={greeting}>Xin chào!</Text>
          <Heading style={titleCss}>Mã xác thực OTP của bạn</Heading>
          <Text style={description}>
            Chúng tôi đã nhận được yêu cầu xác thực tài khoản của bạn. Vui lòng sử dụng mã OTP bên dưới để hoàn tất quá
            trình xác thực.
          </Text>

          {/* OTP Code Section */}
          <Section style={otpSection}>
            <Section style={codeContainer}>
              <Text style={code}>{otpCode}</Text>
            </Section>
            <Text style={codeNote}>Mã này sẽ hết hạn sau 10 phút</Text>
          </Section>

          {/* Security Notice */}
          <Section style={securitySection}>
            <Text style={securityTitle}>🔒 Lưu ý bảo mật</Text>
            <Text style={securityText}>
              Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Không chia sẻ mã OTP với bất kỳ ai để bảo
              vệ tài khoản của bạn.
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

OTPEmail.PreviewProps = {
  otpCode: '144833',
  title: 'Mã OTP - Torii Nihongo Gakuin',
} as OTPEmailProps

export default OTPEmail

// Styles
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
  margin: '0 0 24px 0',
  textAlign: 'left' as const,
}

const description = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 32px 0',
  textAlign: 'left' as const,
}

const otpSection = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const codeContainer = {
  backgroundColor: '#f1f5f9',
  border: '2px dashed #cbd5e1',
  borderRadius: '12px',
  margin: '0 auto 16px',
  padding: '24px',
  width: 'fit-content',
}

const code = {
  color: '#1e40af',
  fontFamily: 'Monaco, "Lucida Console", monospace',
  fontSize: '36px',
  fontWeight: '800',
  letterSpacing: '8px',
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

const securitySection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  margin: '32px 0',
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
