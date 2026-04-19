import * as React from "react";

interface RefundApprovedEmailProps {
  studentName: string;
  courseTitle: string;
  approvalEvidence: string;
  progressPercent: number;
  refundId: number;
}

export default function RefundApprovedEmail({
  studentName,
  courseTitle,
  approvalEvidence,
  progressPercent,
  refundId,
}: RefundApprovedEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Refund Request Approved</title>
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
                      backgroundColor: "#16a34a",
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
                        color: "#bbf7d0",
                        margin: "8px 0 0",
                        fontSize: "14px",
                      }}
                    >
                      Refund Request Update
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
                      Hello {studentName},
                    </h2>
                    <p style={{ color: "#4b5563", lineHeight: "1.6" }}>
                      Great news! Your refund request{" "}
                      <strong>#{refundId}</strong> for course{" "}
                      <strong>"{courseTitle}"</strong> has been{" "}
                      <strong style={{ color: "#16a34a" }}>approved</strong>.
                      The refund has been transferred to your bank account.
                    </p>

                    {/* Status box */}
                    <table
                      width="100%"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{
                        backgroundColor: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: "6px",
                        margin: "24px 0",
                      }}
                    >
                      <tr>
                        <td style={{ padding: "20px 24px" }}>
                          <p
                            style={{
                              margin: "0 0 8px",
                              color: "#15803d",
                              fontWeight: "bold",
                              fontSize: "15px",
                            }}
                          >
                            ✅ Refund Approved
                          </p>
                          <p
                            style={{
                              margin: "0 0 4px",
                              color: "#166534",
                              fontSize: "14px",
                            }}
                          >
                            <strong>Request ID:</strong> #{refundId}
                          </p>
                          <p
                            style={{
                              margin: "0 0 4px",
                              color: "#166534",
                              fontSize: "14px",
                            }}
                          >
                            <strong>Course:</strong> {courseTitle}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              color: "#166534",
                              fontSize: "14px",
                            }}
                          >
                            <strong>Progress at review:</strong>{" "}
                            {progressPercent}%
                          </p>
                        </td>
                      </tr>
                    </table>

                    {/* Transfer evidence */}
                    <table
                      width="100%"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        margin: "0 0 24px",
                      }}
                    >
                      <tr>
                        <td style={{ padding: "20px 24px" }}>
                          <p
                            style={{
                              margin: "0 0 8px",
                              color: "#374151",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            Bank Transfer Evidence:
                          </p>
                          <p
                            style={{
                              margin: 0,
                              color: "#4b5563",
                              fontSize: "14px",
                              wordBreak: "break-all",
                            }}
                          >
                            {approvalEvidence.startsWith("http") ? (
                              <a
                                href={approvalEvidence}
                                style={{ color: "#2563eb" }}
                              >
                                View transfer receipt
                              </a>
                            ) : (
                              approvalEvidence
                            )}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style={{ color: "#4b5563", lineHeight: "1.6" }}>
                      Please allow 1–3 business days for the funds to appear in
                      your bank account depending on your bank's processing
                      time.
                    </p>
                    <p style={{ color: "#4b5563", lineHeight: "1.6" }}>
                      If you have any questions, please contact our support
                      team.
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: "#f9fafb",
                      borderTop: "1px solid #e5e7eb",
                      padding: "20px 40px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        color: "#9ca3af",
                        fontSize: "12px",
                        margin: 0,
                      }}
                    >
                      © {new Date().getFullYear()} Torii Nihongo Gakuin. All
                      rights reserved.
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
