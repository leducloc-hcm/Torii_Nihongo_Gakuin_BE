import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

interface CertificateEmailProps {
  studentName: string
  courseTitle: string
  issuedAt: Date
  verifyUrl: string
}

const logoUrl = "https://torii-nihongo-storage-v2.s3.ap-southeast-1.amazonaws.com/logoTori.png"

export const CourseCertificateEmail = ({
  studentName,
  courseTitle,
  issuedAt,
  verifyUrl,
}: CertificateEmailProps) => {
  const formattedDate = new Date(issuedAt).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <Html>
      <Head>
        <title>Certificate of Completion: {courseTitle}</title>
      </Head>
      <Body style={main}>
        <Container style={outerContainer}>
          {/* Header */}
          <Section style={header}>
            <Img src={logoUrl} width="96" height="96" alt="Torii Nihongo Gakuin" style={logo} />
            <Text style={institutionName}>TORII NIHONGO GAKUIN</Text>
            <Text style={institutionTagline}>Online Japanese Language Academy</Text>
          </Section>

          {/* Certificate frame */}
          <Section style={certificateFrame}>
            <Section style={certificateInner}>
              {/* Top ornament */}
              <Section style={ornamentWrap}>
                <Text style={ornamentLine}>
                  <span style={ornamentDash} />
                  <span style={ornamentDiamond}>◆</span>
                  <span style={ornamentDash} />
                </Text>
              </Section>

              {/* Title */}
              <Text style={eyebrow}>Official Certification</Text>
              <Heading as="h1" style={certTitle}>
                CERTIFICATE OF COMPLETION
              </Heading>
              <Text style={certSubtitle}>Awarded in recognition of academic achievement</Text>

              {/* Presented to */}
              <Text style={presentedTo}>This certificate is proudly presented to</Text>

              <Heading as="h2" style={studentNameStyle}>
                {studentName}
              </Heading>

              <Text style={presentedTo}>for successfully completing the course</Text>

              <Heading as="h3" style={courseTitleStyle}>
                {courseTitle}
              </Heading>

              {/* Bottom ornament */}
              <Section style={ornamentWrap}>
                <Text style={ornamentLine}>
                  <span style={ornamentDash} />
                  <span style={ornamentDiamond}>◆</span>
                  <span style={ornamentDash} />
                </Text>
              </Section>

              {/* Meta row: date + authority */}
              <Section style={metaRow}>
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  style={{ borderCollapse: "collapse" }}
                >
                  <tbody>
                    <tr>
                      <td style={metaCellLeft}>
                        <Text style={metaLabel}>Date Issued</Text>
                        <Text style={metaValue}>{formattedDate}</Text>
                        <Text style={metaUnderline}>&nbsp;</Text>
                      </td>
                      <td style={metaCellCenter}>
                        <Text style={sealCircle}>認</Text>
                        <Text style={sealCaption}>Verified</Text>
                      </td>
                      <td style={metaCellRight}>
                        <Text style={metaLabel}>Issued By</Text>
                        <Text style={metaValue}>Torii Nihongo Gakuin</Text>
                        <Text style={metaUnderline}>&nbsp;</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            </Section>
          </Section>

          {/* Verify CTA */}
          <Section style={ctaSection}>
            <Text style={verifyNote}>
              This certificate can be verified online. Click the button below to confirm its authenticity.
            </Text>
            <Button style={ctaButton} href={verifyUrl}>
              Verify Certificate
            </Button>
            <Text style={verifyLinkText}>
              Or visit:{" "}
              <a href={verifyUrl} style={verifyLink}>
                {verifyUrl}
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerBrand}>TORII NIHONGO GAKUIN</Text>
            <Text style={footerText}>© 2025 Torii Nihongo Gakuin. All rights reserved.</Text>
            <Text style={footerSubtext}>頑張ってください — Keep up the great work!</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

CourseCertificateEmail.PreviewProps = {
  studentName: "John Anderson",
  courseTitle: "Japanese for Beginners — JLPT N5",
  issuedAt: new Date(),
  verifyUrl: "https://torii-nihongo-gakuin.io.vn/verify/abc-123",
} as CertificateEmailProps

export default CourseCertificateEmail

// ===== Styles =====

const BRAND = "#0f2744" // deep navy
const BRAND_SOFT = "#1e3a5f"
const GOLD = "#b08d3c"
const GOLD_SOFT = "#d4b35a"
const INK = "#0f172a"
const MUTED = "#64748b"
const LINE = "#e5e7eb"
const IVORY = "#fbfaf6"

const main: React.CSSProperties = {
  backgroundColor: "#eef2f7",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "32px 0",
  margin: 0,
}

const outerContainer: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${LINE}`,
  borderRadius: "4px",
  boxShadow: "0 24px 48px -20px rgba(15, 39, 68, 0.25)",
  margin: "0 auto",
  maxWidth: "640px",
  overflow: "hidden",
}

// ---- Header ----
const header: React.CSSProperties = {
  backgroundColor: BRAND,
  borderBottom: `4px solid ${GOLD}`,
  padding: "36px 24px 28px",
  textAlign: "center",
}

const logo: React.CSSProperties = {
  margin: "0 auto 12px",
  display: "block",
}

const institutionName: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
  letterSpacing: "4px",
  margin: "0 0 4px",
  textTransform: "uppercase",
}

const institutionTagline: React.CSSProperties = {
  color: GOLD_SOFT,
  fontSize: "12px",
  letterSpacing: "2px",
  margin: 0,
  textTransform: "uppercase",
}

// ---- Certificate frame (double border, ivory) ----
const certificateFrame: React.CSSProperties = {
  backgroundColor: IVORY,
  padding: "24px",
}

const certificateInner: React.CSSProperties = {
  backgroundColor: IVORY,
  border: `2px solid ${GOLD}`,
  outline: `1px solid ${GOLD_SOFT}`,
  outlineOffset: "4px",
  padding: "44px 40px 36px",
  textAlign: "center",
}

// ---- Ornament (— ◆ —) ----
const ornamentWrap: React.CSSProperties = {
  textAlign: "center",
  padding: "4px 0",
}

const ornamentLine: React.CSSProperties = {
  color: GOLD,
  fontSize: "14px",
  letterSpacing: "0",
  margin: "12px 0",
  lineHeight: 1,
}

const ornamentDash: React.CSSProperties = {
  display: "inline-block",
  width: "80px",
  height: "1px",
  backgroundColor: GOLD,
  verticalAlign: "middle",
  margin: "0 12px",
}

const ornamentDiamond: React.CSSProperties = {
  color: GOLD,
  fontSize: "12px",
  verticalAlign: "middle",
}

// ---- Titles ----
const eyebrow: React.CSSProperties = {
  color: GOLD,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "4px",
  margin: "0 0 8px",
  textTransform: "uppercase",
}

const certTitle: React.CSSProperties = {
  color: INK,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "32px",
  fontWeight: 700,
  letterSpacing: "3px",
  margin: "0 0 6px",
  textTransform: "uppercase",
  lineHeight: 1.2,
}

const certSubtitle: React.CSSProperties = {
  color: MUTED,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "13px",
  fontStyle: "italic",
  letterSpacing: "2px",
  margin: "0 0 8px",
}

const presentedTo: React.CSSProperties = {
  color: MUTED,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "14px",
  fontStyle: "italic",
  margin: "14px 0 8px",
}

const studentNameStyle: React.CSSProperties = {
  color: INK,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "34px",
  fontWeight: 700,
  letterSpacing: "0.5px",
  margin: "0 0 6px",
  borderBottom: `1px solid ${GOLD_SOFT}`,
  paddingBottom: "14px",
  display: "inline-block",
}

const courseTitleStyle: React.CSSProperties = {
  color: BRAND,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "22px",
  fontWeight: 700,
  fontStyle: "italic",
  margin: "0 0 8px",
  lineHeight: 1.4,
}

// ---- Meta row (date / seal / authority) ----
const metaRow: React.CSSProperties = {
  paddingTop: "12px",
}

const metaCellLeft: React.CSSProperties = {
  width: "35%",
  textAlign: "center",
  verticalAlign: "bottom",
  padding: "0 8px",
}

const metaCellCenter: React.CSSProperties = {
  width: "30%",
  textAlign: "center",
  verticalAlign: "middle",
  padding: "0 8px",
}

const metaCellRight: React.CSSProperties = {
  width: "35%",
  textAlign: "center",
  verticalAlign: "bottom",
  padding: "0 8px",
}

const metaLabel: React.CSSProperties = {
  color: MUTED,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "2px",
  margin: "0 0 4px",
  textTransform: "uppercase",
}

const metaValue: React.CSSProperties = {
  color: INK,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "14px",
  fontWeight: 700,
  margin: 0,
  paddingBottom: "4px",
}

const metaUnderline: React.CSSProperties = {
  borderTop: `1px solid ${INK}`,
  fontSize: "1px",
  lineHeight: "1px",
  margin: "2px 0 0",
  height: "1px",
}

const sealCircle: React.CSSProperties = {
  display: "inline-block",
  width: "64px",
  height: "64px",
  lineHeight: "60px",
  borderRadius: "50%",
  border: `2px solid ${GOLD}`,
  color: GOLD,
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "26px",
  fontWeight: 700,
  textAlign: "center",
  margin: "0 auto 6px",
  backgroundColor: "#fff",
}

const sealCaption: React.CSSProperties = {
  color: GOLD,
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "2px",
  margin: 0,
  textTransform: "uppercase",
}

// ---- CTA ----
const ctaSection: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px 40px",
  textAlign: "center",
  borderTop: `1px solid ${LINE}`,
}

const verifyNote: React.CSSProperties = {
  color: MUTED,
  fontSize: "14px",
  lineHeight: 1.6,
  margin: "0 0 20px",
}

const ctaButton: React.CSSProperties = {
  backgroundColor: BRAND,
  borderRadius: "2px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "2px",
  padding: "14px 36px",
  textDecoration: "none",
  textTransform: "uppercase",
  border: `1px solid ${BRAND_SOFT}`,
}

const verifyLinkText: React.CSSProperties = {
  color: MUTED,
  fontSize: "12px",
  margin: "18px 0 0",
}

const verifyLink: React.CSSProperties = {
  color: BRAND,
  textDecoration: "underline",
  wordBreak: "break-all",
}

// ---- Footer ----
const footer: React.CSSProperties = {
  backgroundColor: BRAND,
  borderTop: `4px solid ${GOLD}`,
  padding: "24px 32px",
  textAlign: "center",
}

const footerBrand: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "3px",
  margin: "0 0 6px",
  textTransform: "uppercase",
}

const footerText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "11px",
  margin: "0 0 4px",
}

const footerSubtext: React.CSSProperties = {
  color: GOLD_SOFT,
  fontSize: "12px",
  fontStyle: "italic",
  margin: 0,
}
