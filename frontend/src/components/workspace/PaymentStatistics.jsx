import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function PaymentStatistics({ api, t }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get("/api/payments/statistics/");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching payment statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>{t("Loading...")}</div>;
  }

  if (!stats) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>{t("No data available")}</div>;
  }

  const COLORS = ["#1f3f5f", "#78a8da", "#2e5378", "#a9d1ff", "#667788", "#dce8f4"];

  // Prepare data for status chart
  const statusData = Object.entries(stats.by_status).map(([key, value]) => ({
    name: value.label,
    count: value.count,
    amount: value.total_amount,
    commission: value.total_commission,
  }));

  // Prepare data for method chart
  const methodData = Object.entries(stats.by_method).map(([key, value]) => ({
    name: value.label,
    count: value.count,
    amount: value.total_amount,
    commission: value.total_commission,
  }));

  // Prepare pie data for status distribution
  const statusPieData = statusData.filter((d) => d.count > 0);

  return (
    <div className="payment-statistics-panel">
      <h3>{t("Payment Statistics & Breakdown")}</h3>

      {/* Overall Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">{t("Total Payments")}</p>
          <p className="metric-value">{stats.overall.total_payments}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{t("Total Amount")}</p>
          <p className="metric-value">${stats.overall.total_amount.toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{t("Total Commission")}</p>
          <p className="metric-value">${stats.overall.total_commission.toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{t("Provider Earnings")}</p>
          <p className="metric-value">${stats.overall.total_provider_earning.toFixed(2)}</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="stats-section">
        <h4>{t("Payment Status Distribution")}</h4>
        <div className="stats-row">
          {/* Status Bar Chart */}
          <div className="stats-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf3" />
                <XAxis dataKey="name" stroke="#667788" />
                <YAxis stroke="#667788" />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e5ecf3" }}
                  formatter={(value) => value.toLocaleString()}
                />
                <Legend />
                <Bar dataKey="count" fill="#1f3f5f" name={t("Count")} />
                <Bar dataKey="amount" fill="#78a8da" name={t("Amount ($)")} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status Pie Chart */}
          <div className="stats-chart">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Detailed Table */}
        <div className="stats-table">
          <table>
            <thead>
              <tr>
                <th>{t("Status")}</th>
                <th>{t("Count")}</th>
                <th>{t("Total Amount")}</th>
                <th>{t("Commission")}</th>
                <th>{t("Provider Earning")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.by_status).map(([key, value]) => (
                <tr key={key}>
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--navy)" }}>{value.label}</span>
                  </td>
                  <td>{value.count}</td>
                  <td>${value.total_amount.toFixed(2)}</td>
                  <td>${value.total_commission.toFixed(2)}</td>
                  <td>${value.total_provider_earning.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Method Distribution */}
      <div className="stats-section">
        <h4>{t("Payment Method Distribution")}</h4>
        <div className="stats-row">
          {/* Method Bar Chart */}
          <div className="stats-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf3" />
                <XAxis dataKey="name" stroke="#667788" />
                <YAxis stroke="#667788" />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e5ecf3" }}
                  formatter={(value) => value.toLocaleString()}
                />
                <Legend />
                <Bar dataKey="count" fill="#2e5378" name={t("Count")} />
                <Bar dataKey="amount" fill="#a9d1ff" name={t("Amount ($)")} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Method Pie Chart */}
          <div className="stats-chart">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count}`}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="count"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Method Detailed Table */}
        <div className="stats-table">
          <table>
            <thead>
              <tr>
                <th>{t("Payment Method")}</th>
                <th>{t("Count")}</th>
                <th>{t("Total Amount")}</th>
                <th>{t("Commission")}</th>
                <th>{t("Provider Earning")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.by_method).map(([key, value]) => (
                <tr key={key}>
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--navy)" }}>{value.label}</span>
                  </td>
                  <td>{value.count}</td>
                  <td>${value.total_amount.toFixed(2)}</td>
                  <td>${value.total_commission.toFixed(2)}</td>
                  <td>${value.total_provider_earning.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
