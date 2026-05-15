import { useEffect, useState } from "react";

export default function WalletPage({ user, wallet: initialWallet, api, money }) {
  const [wallet, setWallet] = useState(initialWallet);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (user.role === "admin") {
          const w = await api.wallet();
          if (mounted) setWallet(w);
        } else if (user.role === "provider") {
          const w = await api.providerWallet();
          if (mounted) setWallet(w);
        }
        const pay = await api.payments();
        if (mounted) setPayments(pay.results || pay);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [user]);

  const providerPayments = payments.filter((p) => {
    if (user.role === "provider") {
      return String(p.booking?.assigned_provider_id || p.booking?.service?.provider_id) === String(user.id) || p.booking?.service?.provider_id === user.id;
    }
    return true;
  });

  return (
    <div className="panel">
      <h3>Wallet</h3>
      {loading && <p>Loading...</p>}
      {!loading && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-1)" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Available</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{money(wallet?.balance || 0)}</div>
            </div>
            {user.role === "provider" && (
              <div style={{ padding: 12, borderRadius: 12, background: "var(--surface-1)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Pending</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{money(wallet?.pending_balance || 0)}</div>
              </div>
            )}
          </div>

          <h4>Recent Payments</h4>
          <div>
            {providerPayments.length === 0 && <p>No recent payments.</p>}
            {providerPayments.map((p) => (
              <div key={p.id} style={{ padding: 10, borderBottom: "1px solid var(--surface-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>Booking #{p.booking_id}</div>
                  <div>{p.status}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div>{p.method}</div>
                  <div style={{ fontWeight: 700 }}>{money(p.provider_earning || p.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
