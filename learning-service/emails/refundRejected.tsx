import * as React from "react";

interface RefundRejectedEmailProps {
  studentName: string;
  courseTitle: string;
  rejectionReason: string;
  rejectionEvidence?: string;
  progressPercent: number;
  refundId: number;
}

export default function RefundRejectedEmail({
  studentName,
  courseTitle,
  rejectionReason,
  rejectionEvidence,
  progressPercent,
  refundId,
}: RefundRejectedEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Yêu cầu hoàn tiền bị từ chối</title>
      </head>
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f4f4f4",
          margin: 0,
          padding: 0,
        }}
      >
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#f4f4f4", padding: "20px 0" }}
        >
          <tr>
            <td align="center">
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#ef4444",
                      padding: "32px 40px",
                      textAlign: "center",
                    }}
                  >
                    <h1
                      style={{ color: "#ffffff", margin: 0, fontSize: "24px" }}
                    >
                      Torii Nihongo Gakuin
                    </h1>
                    <p
                      style={{
                        color: "#fecaca",
                        margin: "8px 0 0",
                        fontSize: "14px",
                      }}
                    >
                      Thông báo yêu cầu hoàn tiền
                    </p>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: "32px 40px" }}>
                    <h2
                      style={{
                        color: "#1f2937",
                        fontSize: "20px",
                        marginTop: 0,
                      }}
                    >
                      Xin chào {studentName},
                    </h2>
                    <p style={{ color: "#4b5563", lineHeight: "1.6" }}>
                      Rất tiếc, yêu cầu hoàn tiền <strong>#{refundId}</strong>{" "}
                      cho khóa học <strong>"{courseTitle}"</strong> của bạn đã
                      bị từ chối.
                    </p>

                    {/* Status box */}
                    <table
                      width="100%"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        marginBottom: "24px",
                      }}
                    >
                      <tr>
                        <td style={{ padding: "20px 24px" }}>
                          <p
                            style={{
                              color: "#991b1b",
                              fontWeight: "bold",
                              margin: "0 0 8px",
                            }}
                          >
                            ❌ Lý do từ chối:
                          </p>
                          <p
                            style={{
                              color: "#7f1d1d",
                              margin: "0 0 16px",
                              lineHeight: "1.6",
                            }}
                          >
                            {rejectionReason}
                          </p>

                          {rejectionEvidence && (
                            <>
                              <p
                                style={{
                                  color: "#991b1b",
                                  fontWeight: "bold",
                                  margin: "0 0 8px",
                                }}
                              >
                                📋 Bằng chứng:
                              </p>
                              <p
                                style={{
                                  color: "#7f1d1d",
                                  margin: 0,
                                  lineHeight: "1.6",
                                }}
                              >
                                {rejectionEvidence}
                              </p>
                            </>
                          )}
                        </td>
                      </tr>
                    </table>

                    {/* Progress info */}
                    <table
                      width="100%"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{
                        backgroundColor: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        borderRadius: "8px",
                        marginBottom: "24px",
                      }}
                    >
                      <tr>
                        <td style={{ padding: "16px 24px" }}>
                          <p
                            style={{
                              color: "#0369a1",
                              margin: 0,
                              fontSize: "14px",
                            }}
                          >
                            📊 Tiến độ học của bạn tại thời điểm xem xét:{" "}
                            <strong>{progressPercent}%</strong>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style={{ color: "#4b5563", lineHeight: "1.6" }}>
                      Nếu bạn có thắc mắc, vui lòng liên hệ với bộ phận hỗ trợ
                      của chúng tôi.
                    </p>

                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: "14px",
                        marginTop: "32px",
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: "16px",
                      }}
                    >
                      Trân trọng,
                      <br />
                      <strong>Đội ngũ Torii Nihongo Gakuin</strong>
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#f9fafb",
                      padding: "16px 40px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}
                    >
                      © 2025 Torii Nihongo Gakuin. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
