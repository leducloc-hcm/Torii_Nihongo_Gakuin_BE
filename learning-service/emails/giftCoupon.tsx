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

interface GiftCouponEmailProps {
  recipientName: string;
  senderName: string;
  giftCode: string;
  courses: string[];
  giftMessage?: string;
}

const logoUrl =
  "https://torii-nihongo-storage-v3.s3.ap-southeast-1.amazonaws.com/logoTori.png";
const appUrl = "https://torii-nihongo-gakuin.io.vn";

const GiftCouponEmail = ({
  recipientName,
  senderName,
  giftCode,
  courses,
  giftMessage,
}: GiftCouponEmailProps) => {
  return (
    <Html>
      <Head>
        <title>You received a course gift!</title>
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
              <Text style={eyebrow}>Gift Coupon</Text>
              <Heading as="h1" style={title}>
                You received a course gift! 🎁
              </Heading>
              <Text style={ornament}>— ◆ —</Text>

              <Text style={greeting}>Dear {recipientName},</Text>
              <Text style={description}>
                <strong style={strong}>{senderName}</strong> has gifted you
                access to the following course(s) at Torii Nihongo Gakuin:
              </Text>

              {/* Course list */}
              <Section style={infoBox}>
                <Text style={infoLabel}>GIFTED COURSE(S)</Text>
                {courses.map((course, idx) => (
                  <Text key={idx} style={courseItem}>
                    • {course}
                  </Text>
                ))}
              </Section>

              {/* Personal message */}
              {giftMessage && (
                <Section style={messageBox}>
                  <Text style={infoLabel}>A MESSAGE FROM {senderName.toUpperCase()}</Text>
                  <Text style={messageText}>"{giftMessage}"</Text>
                </Section>
              )}

              {/* Gift code */}
              <Section style={codeBox}>
                <Text style={codeLabel}>YOUR GIFT CODE</Text>
                <Text style={codeText}>{giftCode}</Text>
                <Text style={codeHint}>
                  Use this code at checkout to unlock your gifted course(s).
                </Text>
              </Section>

              {/* CTA */}
              <Section style={ctaWrap}>
                <Button
                  style={ctaBtn}
                  href={`${appUrl}/customer/explore-course`}
                >
                  Redeem Your Gift
                </Button>
                <Text style={ctaHelp}>
                  Browse courses and enter your code at checkout:
                  <br />
                  <a href={`${appUrl}/customer/explore-course`} style={link}>
                    {appUrl}/customer/explore-course
                  </a>
                </Text>
              </Section>

              <Text style={divider}>— ◆ —</Text>

              <Section style={sectionBlockMuted}>
                <Text style={sectionBody}>
                  If you have any questions, our support team is happy to help.
                  We hope you enjoy your Japanese learning journey!
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

GiftCouponEmail.PreviewProps = {
  recipientName: "Jane Smith",
  senderName: "John Anderson",
  giftCode: "GIFT-ABCD-EFGH-IJKL",
  courses: ["Japanese for Beginners — JLPT N5"],
  giftMessage: "Happy Birthday! I hope you enjoy learning Japanese!",
} as GiftCouponEmailProps;

export default GiftCouponEmail;

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
};

const outerContainer: React.CSSProperties = {
  maxWidth: "640px",
  margin: "0 auto",
};

const header: React.CSSProperties = {
  backgroundColor: COLOR.navy,
  padding: "40px 48px 32px",
  textAlign: "center",
};

const logo: React.CSSProperties = {
  borderRadius: "50%",
  border: `3px solid ${COLOR.gold}`,
  display: "block",
  margin: "0 auto 16px",
};

const institutionName: React.CSSProperties = {
  fontFamily: FONT_SERIF,
  fontSize: "16px",
  fontWeight: "bold",
  letterSpacing: "4px",
  color: COLOR.goldSoft,
  margin: "0 0 4px",
  textTransform: "uppercase",
};

const institutionTagline: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "2px",
  color: `${COLOR.goldSoft}99`,
  margin: 0,
  textTransform: "uppercase",
};

const cardWrapper: React.CSSProperties = {
  padding: "0 0 32px",
};

const card: React.CSSProperties = {
  backgroundColor: COLOR.paper,
  padding: "48px",
  borderBottom: `4px solid ${COLOR.gold}`,
};

const eyebrow: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  color: COLOR.gold,
  margin: "0 0 12px",
  fontFamily: FONT_SANS,
};

const title: React.CSSProperties = {
  fontFamily: FONT_SERIF,
  fontSize: "26px",
  color: COLOR.navy,
  margin: "0 0 8px",
  lineHeight: 1.3,
};

const ornament: React.CSSProperties = {
  textAlign: "center",
  color: COLOR.gold,
  fontSize: "14px",
  margin: "16px 0",
};

const greeting: React.CSSProperties = {
  fontSize: "16px",
  color: COLOR.ink,
  margin: "24px 0 8px",
};

const description: React.CSSProperties = {
  fontSize: "15px",
  color: COLOR.slate,
  lineHeight: 1.7,
  margin: "0 0 24px",
};

const strong: React.CSSProperties = {
  color: COLOR.navy,
};

const infoBox: React.CSSProperties = {
  backgroundColor: COLOR.ivoryDeep,
  borderLeft: `3px solid ${COLOR.gold}`,
  borderRadius: "4px",
  padding: "20px 24px",
  margin: "24px 0",
};

const infoLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: COLOR.slateMuted,
  margin: "0 0 12px",
  fontFamily: FONT_SANS,
};

const courseItem: React.CSSProperties = {
  fontSize: "14px",
  color: COLOR.ink,
  margin: "4px 0",
};

const messageBox: React.CSSProperties = {
  backgroundColor: "#f0f7ff",
  borderLeft: "3px solid #3b82f6",
  borderRadius: "4px",
  padding: "20px 24px",
  margin: "24px 0",
};

const messageText: React.CSSProperties = {
  fontSize: "15px",
  color: COLOR.slate,
  fontStyle: "italic",
  lineHeight: 1.7,
  margin: "8px 0 0",
};

const codeBox: React.CSSProperties = {
  backgroundColor: COLOR.navy,
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center",
};

const codeLabel: React.CSSProperties = {
  fontSize: "10px",
  letterSpacing: "3px",
  textTransform: "uppercase",
  color: `${COLOR.goldSoft}cc`,
  margin: "0 0 12px",
};

const codeText: React.CSSProperties = {
  fontFamily: '"Courier New", Courier, monospace',
  fontSize: "28px",
  fontWeight: "bold",
  color: COLOR.goldSoft,
  letterSpacing: "4px",
  margin: "0 0 8px",
};

const codeHint: React.CSSProperties = {
  fontSize: "12px",
  color: `${COLOR.goldSoft}99`,
  margin: 0,
};

const ctaWrap: React.CSSProperties = {
  textAlign: "center",
  margin: "32px 0",
};

const ctaBtn: React.CSSProperties = {
  backgroundColor: COLOR.gold,
  color: "#fff",
  fontFamily: FONT_SANS,
  fontSize: "14px",
  fontWeight: "bold",
  letterSpacing: "1px",
  textDecoration: "none",
  padding: "14px 32px",
  borderRadius: "4px",
  display: "inline-block",
};

const ctaHelp: React.CSSProperties = {
  fontSize: "12px",
  color: COLOR.slateMuted,
  marginTop: "12px",
  lineHeight: 1.6,
};

const link: React.CSSProperties = {
  color: COLOR.gold,
};

const divider: React.CSSProperties = {
  textAlign: "center",
  color: COLOR.gold,
  fontSize: "14px",
  margin: "24px 0",
};

const sectionBlockMuted: React.CSSProperties = {
  backgroundColor: COLOR.ivory,
  borderRadius: "4px",
  padding: "20px 24px",
  margin: "16px 0",
};

const sectionBody: React.CSSProperties = {
  fontSize: "13px",
  color: COLOR.slateMuted,
  lineHeight: 1.7,
  margin: 0,
};

const signOff: React.CSSProperties = {
  fontSize: "14px",
  color: COLOR.slate,
  marginTop: "32px",
  lineHeight: 1.8,
};

const signOffInstitution: React.CSSProperties = {
  fontFamily: FONT_SERIF,
  fontStyle: "italic",
  color: COLOR.navy,
};

const footer: React.CSSProperties = {
  backgroundColor: COLOR.navyDeep,
  padding: "24px 48px",
  textAlign: "center",
};

const footerBrand: React.CSSProperties = {
  fontFamily: FONT_SERIF,
  fontSize: "13px",
  letterSpacing: "3px",
  color: COLOR.goldSoft,
  margin: "0 0 6px",
};

const footerText: React.CSSProperties = {
  fontSize: "11px",
  color: `${COLOR.goldSoft}80`,
  margin: "0 0 4px",
};

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  fontStyle: "italic",
  color: `${COLOR.goldSoft}60`,
  margin: 0,
};
