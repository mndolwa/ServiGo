import React, { useState, useEffect } from "react";
import PaymentStatistics from "../components/workspace/PaymentStatistics";

export default function PaymentsList({ user, api, t }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await api.payments();
      setPayments(response.results || response || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Admin Payment Statistics */}
      {user?.role === "admin" && api && (
        <PaymentStatistics api={api} t={t || ((key) => key)} />
      )}

      {/* Regular Payments List */}
      <section className="panel full" style={{ marginTop: user?.role === "admin" ? 16 : 0 }}>
        <h3>{t ? t("Payments") : "Payments"}</h3>
        
        {loading && (
          <p style={{ color: "var(--muted)" }}>{t ? t("Loading...") : "Loading..."}</p>
        )}

        {!loading && payments.length === 0 && (
          <p style={{ color: "var(--muted)" }}>
            {t ? t("No payments available") : "No payments available"}
          </p>
        )}

        {!loading && payments.length > 0 && (
          <div className="payments-list">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--soft-bg)" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>
                    {t ? t("Booking") : "Booking"}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>
                    {t ? t("Amount") : "Amount"}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>
                    {t ? t("Method") : "Method"}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>
                    {t ? t("Status") : "Status"}
                  </th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>
                    {t ? t("Date") : "Date"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <td style={{ padding: 12 }}>
                      <strong>#{payment.booking}</strong>
                    </td>
                    <td style={{ padding: 12 }}>${payment.amount}</td>
                    <td style={{ padding: 12, textTransform: "capitalize" }}>
                      {payment.method}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          background:
                            payment.status === "released"
                              ? "#dcf4e8"
                              : payment.status === "paid"
                              ? "#e2f0ff"
                              : "#fff0dc",
                          color:
                            payment.status === "released"
                              ? "#125438"
                              : payment.status === "paid"
                              ? "#1d5688"
                              : "#8a5d12",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
