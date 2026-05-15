import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function SystemAnalytics({ payments = [], bookings = [], users = [], t }) {
  const [paymentStats, setPaymentStats] = useState([]);
  const [bookingStats, setBookingStats] = useState([]);
  const [userStats, setUserStats] = useState([]);

  useEffect(() => {
    // Calculate payment status distribution
    const paymentStatusCount = {};
    payments.forEach((p) => {
      const status = p.status || "unknown";
      paymentStatusCount[status] = (paymentStatusCount[status] || 0) + 1;
    });

    const paymentData = Object.entries(paymentStatusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      status,
    }));
    setPaymentStats(paymentData);

    // Calculate booking status distribution
    const bookingStatusCount = {};
    bookings.forEach((b) => {
      const status = b.status || "unknown";
      bookingStatusCount[status] = (bookingStatusCount[status] || 0) + 1;
    });

    const bookingData = Object.entries(bookingStatusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      status,
    }));
    setBookingStats(bookingData);

    // Calculate user role distribution
    const userRoleCount = {};
    users.forEach((u) => {
      const role = u.role || "unknown";
      userRoleCount[role] = (userRoleCount[role] || 0) + 1;
    });

    const userData = Object.entries(userRoleCount).map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count,
      role,
    }));
    setUserStats(userData);
  }, [payments, bookings, users]);

  const COLORS = ["#1f3f5f", "#78a8da", "#2e5378", "#a9d1ff", "#667788", "#dce8f4"];

  return (
    <article className="panel full analytics-hub">
      <div className="analytics-hub__header">
        <div>
          <h3>{t("System Overview")}</h3>
          <p>{t("Platform summary with key metrics and distributions.")}</p>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Payment Status Distribution */}
        <div className="analytics-card">
          <h4>{t("Payment Status Distribution")}</h4>
          {paymentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#667788" }}>
              {t("No payment data available")}
            </div>
          )}
        </div>

        {/* Booking Status Distribution */}
        <div className="analytics-card">
          <h4>{t("Booking Status Distribution")}</h4>
          {bookingStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="value"
                >
                  {bookingStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#667788" }}>
              {t("No booking data available")}
            </div>
          )}
        </div>

        {/* User Distribution */}
        <div className="analytics-card">
          <h4>{t("User Distribution")}</h4>
          {userStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf3" />
                <XAxis dataKey="name" stroke="#667788" />
                <YAxis stroke="#667788" />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5ecf3" }} />
                <Bar dataKey="value" fill="#1f3f5f" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: "40px", color: "#667788" }}>
              {t("No user data available")}
            </div>
          )}
        </div>

        {/* Revenue Summary */}
        <div className="analytics-card">
          <h4>{t("Revenue Metrics")}</h4>
          <div className="metrics-summary">
            <div className="metric-item">
              <span>{t("Total Payments")}</span>
              <strong>{payments.length}</strong>
            </div>
            <div className="metric-item">
              <span>{t("Total Bookings")}</span>
              <strong>{bookings.length}</strong>
            </div>
            <div className="metric-item">
              <span>{t("Total Users")}</span>
              <strong>{users.length}</strong>
            </div>
            <div className="metric-item">
              <span>{t("Revenue Value")}</span>
              <strong>
                {payments
                  .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
