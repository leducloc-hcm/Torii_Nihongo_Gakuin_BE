import * as PDFDocument from "pdfkit";
import * as path from "path";

interface CertificateData {
  studentName: string;
  courseTitle: string;
  issuedAt: Date;
  verifyCode: string;
  verifyUrl: string;
}

// Font paths (Noto fonts with full Unicode support)
const FONTS_DIR = path.join(__dirname, "fonts");

// Color palette matching the email template
const BRAND = "#0f2744";
const GOLD = "#b08d3c";
const GOLD_SOFT = "#d4b35a";
const INK = "#0f172a";
const MUTED = "#64748b";
const IVORY = "#fbfaf6";

/**
 * Generate a landscape certificate PDF using PDFKit.
 * Returns a Buffer containing the PDF bytes.
 */
export async function generateCertificatePDF(
  data: CertificateData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Landscape A4
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Register custom fonts ──
    doc.registerFont("NotoSans", path.join(FONTS_DIR, "NotoSans-Regular.ttf"));
    doc.registerFont(
      "NotoSans-Bold",
      path.join(FONTS_DIR, "NotoSans-Bold.ttf"),
    );
    doc.registerFont(
      "NotoSans-Italic",
      path.join(FONTS_DIR, "NotoSans-Italic.ttf"),
    );
    doc.registerFont(
      "NotoSans-BoldItalic",
      path.join(FONTS_DIR, "NotoSans-BoldItalic.ttf"),
    );
    doc.registerFont(
      "NotoSerif",
      path.join(FONTS_DIR, "NotoSerif-Regular.ttf"),
    );
    doc.registerFont(
      "NotoSerif-Bold",
      path.join(FONTS_DIR, "NotoSerif-Bold.ttf"),
    );
    doc.registerFont(
      "NotoSerif-Italic",
      path.join(FONTS_DIR, "NotoSerif-Italic.ttf"),
    );
    doc.registerFont(
      "NotoSerif-BoldItalic",
      path.join(FONTS_DIR, "NotoSerif-BoldItalic.ttf"),
    );
    doc.registerFont("NotoSansJP", path.join(FONTS_DIR, "NotoSansJP-Bold.otf"));

    const W = 841.89; // A4 landscape width in points
    const H = 595.28; // A4 landscape height in points

    // ── Background ──
    doc.rect(0, 0, W, H).fill(IVORY);

    // ── Outer border (gold double-line) ──
    doc
      .lineWidth(3)
      .rect(20, 20, W - 40, H - 40)
      .stroke(GOLD);
    doc
      .lineWidth(1)
      .rect(28, 28, W - 56, H - 56)
      .stroke(GOLD_SOFT);

    // ── Top bar ──
    doc.rect(28, 28, W - 56, 60).fill(BRAND);

    // Institution name in header bar
    doc
      .font("NotoSans-Bold")
      .fontSize(14)
      .fillColor("#ffffff")
      .text("TORII NIHONGO GAKUIN", 0, 48, {
        width: W,
        align: "center",
      });

    doc
      .font("NotoSans")
      .fontSize(8)
      .fillColor(GOLD_SOFT)
      .text("Online Japanese Language Academy", 0, 66, {
        width: W,
        align: "center",
      });

    // ── Gold accent line below header ──
    doc.rect(28, 88, W - 56, 3).fill(GOLD);

    // ── Ornament line ──
    const ornY = 115;
    const lineLen = 120;
    const cx = W / 2;

    doc
      .moveTo(cx - lineLen - 10, ornY)
      .lineTo(cx - 10, ornY)
      .lineWidth(1)
      .stroke(GOLD);

    doc
      .moveTo(cx + 10, ornY)
      .lineTo(cx + lineLen + 10, ornY)
      .lineWidth(1)
      .stroke(GOLD);

    doc
      .font("NotoSans")
      .fontSize(10)
      .fillColor(GOLD)
      .text("◆", cx - 4, ornY - 5);

    // ── Eyebrow ──
    doc
      .font("NotoSans-Bold")
      .fontSize(9)
      .fillColor(GOLD)
      .text("OFFICIAL CERTIFICATION", 0, 135, {
        width: W,
        align: "center",
        characterSpacing: 3,
      });

    // ── Main title ──
    doc
      .font("NotoSerif-Bold")
      .fontSize(32)
      .fillColor(INK)
      .text("CERTIFICATE OF COMPLETION", 0, 155, {
        width: W,
        align: "center",
        characterSpacing: 2,
      });

    // ── Subtitle ──
    doc
      .font("NotoSerif-Italic")
      .fontSize(11)
      .fillColor(MUTED)
      .text("Awarded in recognition of academic achievement", 0, 195, {
        width: W,
        align: "center",
      });

    // ── "presented to" ──
    doc
      .font("NotoSerif-Italic")
      .fontSize(12)
      .fillColor(MUTED)
      .text("This certificate is proudly presented to", 0, 225, {
        width: W,
        align: "center",
      });

    // ── Student name ──
    doc
      .font("NotoSerif-Bold")
      .fontSize(36)
      .fillColor(INK)
      .text(data.studentName, 0, 250, {
        width: W,
        align: "center",
      });

    // Underline below name
    const nameWidth = doc.widthOfString(data.studentName);
    const nameX = (W - nameWidth) / 2;
    doc
      .moveTo(nameX, 292)
      .lineTo(nameX + nameWidth, 292)
      .lineWidth(1)
      .stroke(GOLD_SOFT);

    // ── "for completing" ──
    doc
      .font("NotoSerif-Italic")
      .fontSize(12)
      .fillColor(MUTED)
      .text("for successfully completing the course", 0, 310, {
        width: W,
        align: "center",
      });

    // ── Course title ──
    doc
      .font("NotoSerif-BoldItalic")
      .fontSize(22)
      .fillColor(BRAND)
      .text(data.courseTitle, 80, 335, {
        width: W - 160,
        align: "center",
      });

    // ── Bottom ornament ──
    const ornY2 = 385;
    doc
      .moveTo(cx - lineLen - 10, ornY2)
      .lineTo(cx - 10, ornY2)
      .lineWidth(1)
      .stroke(GOLD);

    doc
      .moveTo(cx + 10, ornY2)
      .lineTo(cx + lineLen + 10, ornY2)
      .lineWidth(1)
      .stroke(GOLD);

    doc
      .font("NotoSans")
      .fontSize(10)
      .fillColor(GOLD)
      .text("◆", cx - 4, ornY2 - 5);

    // ── Meta row: Date | Seal | Authority ──
    const metaY = 410;

    // Date column
    doc
      .font("NotoSans-Bold")
      .fontSize(8)
      .fillColor(MUTED)
      .text("DATE ISSUED", 80, metaY, {
        width: 200,
        align: "center",
        characterSpacing: 2,
      });

    const formattedDate = new Date(data.issuedAt).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc
      .font("NotoSerif-Bold")
      .fontSize(12)
      .fillColor(INK)
      .text(formattedDate, 80, metaY + 14, { width: 200, align: "center" });

    // Underline
    doc
      .moveTo(120, metaY + 30)
      .lineTo(240, metaY + 30)
      .lineWidth(0.5)
      .stroke(INK);

    // Seal (center)
    const sealX = cx;
    const sealY = metaY + 10;
    const sealR = 28;
    doc
      .circle(sealX, sealY + sealR, sealR)
      .lineWidth(2)
      .stroke(GOLD);

    doc
      .font("NotoSansJP")
      .fontSize(24)
      .fillColor(GOLD)
      .text("認", sealX - 12, sealY + sealR - 12);

    doc
      .font("NotoSans-Bold")
      .fontSize(7)
      .fillColor(GOLD)
      .text("VERIFIED", sealX - 18, sealY + sealR + 32, {
        width: 36,
        align: "center",
        characterSpacing: 1,
      });

    // Authority column
    doc
      .font("NotoSans-Bold")
      .fontSize(8)
      .fillColor(MUTED)
      .text("ISSUED BY", W - 280, metaY, {
        width: 200,
        align: "center",
        characterSpacing: 2,
      });

    doc
      .font("NotoSerif-Bold")
      .fontSize(12)
      .fillColor(INK)
      .text("Torii Nihongo Gakuin", W - 280, metaY + 14, {
        width: 200,
        align: "center",
      });

    doc
      .moveTo(W - 240, metaY + 30)
      .lineTo(W - 120, metaY + 30)
      .lineWidth(0.5)
      .stroke(INK);

    // ── Verify code at the bottom ──
    doc
      .font("NotoSans")
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Verify: ${data.verifyUrl}`, 0, H - 65, {
        width: W,
        align: "center",
      });

    doc
      .font("NotoSans")
      .fontSize(7)
      .fillColor(MUTED)
      .text(`Code: ${data.verifyCode}`, 0, H - 53, {
        width: W,
        align: "center",
      });

    // ── Bottom bar ──
    doc.rect(28, H - 40, W - 56, 12).fill(BRAND);
    doc.rect(28, H - 43, W - 56, 3).fill(GOLD);

    // ── Footer text in bottom bar ──
    doc
      .font("NotoSansJP")
      .fontSize(7)
      .fillColor("#ffffff")
      .text(
        "© 2025 Torii Nihongo Gakuin. All rights reserved.   |   頑張ってください — Keep up the great work!",
        0,
        H - 38,
        { width: W, align: "center" },
      );

    doc.end();
  });
}
