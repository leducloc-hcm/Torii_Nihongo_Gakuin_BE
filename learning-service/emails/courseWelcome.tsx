import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";

interface EmailProps {
  studentName: string;
  courseTitle: string;
  courseThumbnail?: string;
  expiresAt: Date;
  courseId: number;
}

const logoUrl =
  "https://torii-nihongo-storage-v3.s3.ap-southeast-1.amazonaws.com/logoTori.png";
const appUrl = "https://torii-nihongo-gakuin.io.vn";

export const CourseWelcomeEmail = ({
  studentName,
  courseTitle,
  courseThumbnail,
  expiresAt,
  courseId,
}: EmailProps) => {
  const formattedExpiry = new Date(expiresAt).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Html>
      <Head>
        <title>Welcome to your course: {courseTitle}</title>
      </Head>
      <Body style={main}>
        <Container style={outerContainer}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={logoUrl}
              width="88"
              height="88"
              alt="Torii Nihongo Gakuin"
              style={logo}
            />
            <Text style={institutionName}>TORII NIHONGO GAKUIN</Text>
            <Text style={institutionTagline}>
              Online Japanese Language Academy
            </Text>
          </Section>

          {/* Body card */}
          <Section style={cardWrapper}>
            <Section style={card}>
              <Text style={eyebrow}>Enrollment Confirmation</Text>
              <Heading as="h1" style={title}>
                Welcome to your new course
              </Heading>
              <Text style={ornament}>— ◆ —</Text>

              <Text style={greeting}>Dear {studentName},</Text>
              <Text style={description}>
                Thank you for enrolling in{" "}
                <strong style={strong}>{courseTitle}</strong>. We are delighted
                to welcome you to Torii Nihongo Gakuin and look forward to
                supporting you throughout your journey in mastering the Japanese
                language.
              </Text>

              {/* Course Thumbnail */}
              {courseThumbnail && (
                <Section style={courseImageSection}>
                  <Img
                    src={courseThumbnail}
                    width="520"
                    height="292"
                    alt={courseTitle}
                    style={courseImage}
                  />
                </Section>
              )}

              {/* Course Info */}
              <Section style={infoBox}>
                <Text style={infoLabel}>COURSE DETAILS</Text>
                <table
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={infoTable}
                >
                  <tbody>
                    <tr>
                      <td style={infoKey}>Course</td>
                      <td style={infoValue}>{courseTitle}</td>
                    </tr>
                    <tr>
                      <td style={infoKey}>Access Until</td>
                      <td style={infoValue}>{formattedExpiry}</td>
                    </tr>
                    <tr>
                      <td style={infoKey}>Duration</td>
                      <td style={infoValue}>1 year from date of enrollment</td>
                    </tr>
                  </tbody>
                </table>
              </Section>

              {/* CTA */}
              <Section style={ctaWrap}>
                <Button style={ctaBtn} href={`${appUrl}/customer/my-course`}>
                  Begin Learning
                </Button>
                <Text style={ctaHelp}>
                  Or access your course at:
                  <br />
                  <a href={`${appUrl}/customer/my-course`} style={link}>
                    {appUrl}/customer/my-course
                  </a>
                </Text>
              </Section>

              <Text style={divider}>— ◆ —</Text>

              {/* Learning Tips */}
              <Section style={sectionBlock}>
                <Text style={sectionTitle}>Recommendations for Success</Text>
                <Text style={sectionBody}>
                  • Study consistently each day, even in short sessions of 15–30
                  minutes.
                  <br />• Complete lesson exercises and quizzes to reinforce
                  what you learn.
                  <br />• Keep a dedicated notebook for new vocabulary and
                  grammar points.
                  <br />• Apply new knowledge through practical, real-world
                  exercises.
                  <br />• Engage with the learning community to share progress
                  and insights.
                </Text>
              </Section>

              {/* Support Section */}
              <Section style={sectionBlockMuted}>
                <Text style={sectionTitle}>Academic Support</Text>
                <Text style={sectionBody}>
                  Should you have any questions during your studies, our
                  academic support team is available to assist you. Please do
                  not hesitate to reach out — we are committed to ensuring your
                  success.
                </Text>
              </Section>

              <Text style={signOff}>
                Sincerely,
                <br />
                <span style={signOffInstitution}>
                  The Torii Nihongo Gakuin Faculty
                </span>
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerBrand}>TORII NIHONGO GAKUIN</Text>
            <Text style={footerText}>
              © 2025 Torii Nihongo Gakuin. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              頑張ってください — We wish you great success in your studies.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

CourseWelcomeEmail.PreviewProps = {
  studentName: "John Anderson",
  courseTitle: "Japanese for Beginners — JLPT N5",
  courseThumbnail: "https://example.com/course-thumbnail.jpg",
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  courseId: 1,
} as EmailProps;

export default CourseWelcomeEmail;

// ===== Design Tokens =====
const COLOR = {
  navy: "#0f2744",
  navyDeep: "#0a1c33",
  gold: "#b08d3c",
  goldSoft: "#d9bf7a",
  ivory: "#fbfaf6",
  ivoryDeep: "#f3efe4",
  ink: "#0f172a",
  slate: "#475569",
  slateMuted: "#64748b",
  line: "#e5e0d1",
  paper: "#ffffff",
  bg: "#eceae3",
};

const FONT_SERIF = 'Georgia, "Times New Roman", Times, serif';
const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ===== Styles =====
const main: React.CSSProperties = {
  backgroundColor: COLOR.bg,
  fontFamily: FONT_SANS,
  padding: "32px 0",
  margin: 0,
};

const outerContainer: React.CSSProperties = {
  backgroundColor: COLOR.paper,
  margin: "0 auto",
  maxWidth: "640px",
  border: `1px solid ${COLOR.line}`,
  borderTop: `4px solid ${COLOR.gold}`,
};

const header: React.CSSProperties = {
  backgroundColor: COLOR.navy,
  padding: "36px 24px 28px",
  textAlign: "center",
  borderBottom: `1px solid ${COLOR.goldSoft}`,
};

const logo: React.CSSProperties = {
  margin: "0 auto",
  display: "block",
};

const institutionName: React.CSSProperties = {
  color: COLOR.ivory,
  fontFamily: FONT_SERIF,
  fontSize: "20px",
  fontWeight: 700,
  letterSpacing: "4px",
  margin: "14px 0 4px",
  textAlign: "center",
};

const institutionTagline: React.CSSProperties = {
  color: COLOR.goldSoft,
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "3px",
  textTransform: "uppercase",
  margin: 0,
  textAlign: "center",
};

const cardWrapper: React.CSSProperties = {
  backgroundColor: COLOR.paper,
  padding: "36px 28px 12px",
};

const card: React.CSSProperties = {
  backgroundColor: COLOR.ivory,
  border: `1px solid ${COLOR.line}`,
  padding: "44px 40px",
};

const eyebrow: React.CSSProperties = {
  color: COLOR.gold,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "4px",
  textTransform: "uppercase",
  margin: "0 0 12px",
  textAlign: "center",
};

const title: React.CSSProperties = {
  color: COLOR.navy,
  fontFamily: FONT_SERIF,
  fontSize: "30px",
  fontWeight: 700,
  lineHeight: 1.25,
  margin: "0 0 8px",
  textAlign: "center",
};

const ornament: React.CSSProperties = {
  color: COLOR.gold,
  fontSize: "14px",
  letterSpacing: "6px",
  textAlign: "center",
  margin: "4px 0 28px",
};

const greeting: React.CSSProperties = {
  color: COLOR.ink,
  fontFamily: FONT_SERIF,
  fontSize: "17px",
  fontWeight: 600,
  margin: "0 0 12px",
};

const description: React.CSSProperties = {
  color: COLOR.slate,
  fontSize: "15px",
  lineHeight: 1.7,
  margin: "0 0 24px",
};

const strong: React.CSSProperties = {
  color: COLOR.navy,
  fontWeight: 700,
};

const courseImageSection: React.CSSProperties = {
  margin: "8px 0 28px",
  textAlign: "center",
};

const courseImage: React.CSSProperties = {
  border: `1px solid ${COLOR.line}`,
  maxWidth: "100%",
  height: "auto",
  display: "block",
  margin: "0 auto",
};

const infoBox: React.CSSProperties = {
  backgroundColor: COLOR.paper,
  border: `1px solid ${COLOR.line}`,
  borderLeft: `3px solid ${COLOR.gold}`,
  padding: "20px 22px",
  margin: "8px 0 28px",
};

const infoLabel: React.CSSProperties = {
  color: COLOR.gold,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "3px",
  textTransform: "uppercase",
  margin: "0 0 12px",
};

const infoTable: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const infoKey: React.CSSProperties = {
  color: COLOR.slateMuted,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "1px",
  textTransform: "uppercase",
  padding: "8px 16px 8px 0",
  verticalAlign: "top",
  width: "38%",
  borderBottom: `1px solid ${COLOR.ivoryDeep}`,
};

const infoValue: React.CSSProperties = {
  color: COLOR.ink,
  fontFamily: FONT_SERIF,
  fontSize: "15px",
  fontWeight: 500,
  padding: "8px 0",
  verticalAlign: "top",
  borderBottom: `1px solid ${COLOR.ivoryDeep}`,
};

const ctaWrap: React.CSSProperties = {
  textAlign: "center",
  margin: "8px 0 24px",
};

const ctaBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 36px",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "3px",
  textTransform: "uppercase",
  textDecoration: "none",
  backgroundColor: COLOR.navy,
  color: COLOR.ivory,
  border: `1px solid ${COLOR.navyDeep}`,
};

const ctaHelp: React.CSSProperties = {
  marginTop: "18px",
  fontSize: "12px",
  color: COLOR.slateMuted,
  textAlign: "center",
  lineHeight: 1.6,
};

const link: React.CSSProperties = {
  color: COLOR.navy,
  textDecoration: "underline",
  wordBreak: "break-all",
};

const divider: React.CSSProperties = {
  color: COLOR.gold,
  fontSize: "12px",
  letterSpacing: "6px",
  textAlign: "center",
  margin: "12px 0 20px",
};

const sectionBlock: React.CSSProperties = {
  borderTop: `1px solid ${COLOR.line}`,
  padding: "20px 0 4px",
  margin: 0,
};

const sectionBlockMuted: React.CSSProperties = {
  borderTop: `1px solid ${COLOR.line}`,
  padding: "20px 0 4px",
  margin: 0,
};

const sectionTitle: React.CSSProperties = {
  color: COLOR.navy,
  fontFamily: FONT_SERIF,
  fontSize: "17px",
  fontWeight: 700,
  margin: "0 0 10px",
};

const sectionBody: React.CSSProperties = {
  color: COLOR.slate,
  fontSize: "14px",
  lineHeight: 1.75,
  margin: 0,
};

const signOff: React.CSSProperties = {
  color: COLOR.ink,
  fontFamily: FONT_SERIF,
  fontSize: "15px",
  lineHeight: 1.6,
  margin: "28px 0 0",
  fontStyle: "italic",
};

const signOffInstitution: React.CSSProperties = {
  fontStyle: "normal",
  fontWeight: 700,
  color: COLOR.navy,
  letterSpacing: "1px",
};

const footer: React.CSSProperties = {
  backgroundColor: COLOR.navyDeep,
  padding: "28px 24px",
  textAlign: "center",
  borderTop: `4px solid ${COLOR.gold}`,
};

const footerBrand: React.CSSProperties = {
  color: COLOR.goldSoft,
  fontFamily: FONT_SERIF,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "4px",
  margin: "0 0 8px",
};

const footerText: React.CSSProperties = {
  color: COLOR.ivory,
  fontSize: "12px",
  margin: "0 0 6px",
};

const footerSubtext: React.CSSProperties = {
  color: "#8fa1bb",
  fontSize: "11px",
  margin: 0,
  fontStyle: "italic",
};
