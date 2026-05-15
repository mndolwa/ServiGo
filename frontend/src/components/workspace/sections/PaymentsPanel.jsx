import { useState } from "react";
import ConfirmActionModal from "../../common/ConfirmActionModal";
import IconActionButton from "../../common/IconActionButton";
import PaymentStatistics from "../PaymentStatistics";

export default function PaymentsPanel({
  t,
  user,
  wallet,
  payments,
  money,
  initiatePayment,
  paymentForm,
  setPaymentForm,
  bookings,
  submittedForms,
  paymentsPageData,
  actionDone,
  actionLoading,
  runTrackedAction,
  api,
  fetchCore,
  generateReceipt,
  renderListPagination,
  onViewReceipts,
}) {
  const [pendingReleasePayment, setPendingReleasePayment] = useState(null);

  const payableBookings = bookings.filter((booking) => {
    const existing = payments.find((payment) => String(payment.booking) === String(booking.id));
    if (!existing) return true;
    return ["failed", "refunded"].includes(String(existing.status));
  });

  const totals = payments.reduce(
    (accumulator, payment) => {
      accumulator.amount += Number(payment.total_amount || payment.amount || 0);
      accumulator.commission += Number(payment.admin_commission || payment.platform_commission || 0);
      accumulator.payout += Number(payment.provider_earning || payment.provider_payout_amount || 0);
      return accumulator;
    },
    { amount: 0, commission: 0, payout: 0 }
  );

  return (
    <article className="panel">
      <h3>{t("Payments")}</h3>
      {user.role === "admin" && (
        <div className="finance-summary">
          <span className="status-chip status-chip--total">Admin Wallet: {money(wallet?.total_balance || 0)}</span>
          <span className="status-chip status-chip--paid">Commission: {money(totals.commission)}</span>
          <span className="status-chip status-chip--released">Payouts: {money(totals.payout)}</span>
        </div>
      )}
      
      {/* Payment Statistics for Admin */}
      {user.role === "admin" && api && (
        <div style={{ marginTop: 16 }}>
          <PaymentStatistics api={api} t={t} />
        </div>
      )}
      {user.role === "provider" && (
        <div className="finance-summary">
          <span className="status-chip status-chip--paid">Available Balance: {money(wallet?.balance || 0)}</span>
          <span className="status-chip status-chip--pending">Pending Balance: {money(wallet?.pending_balance || 0)}</span>
        </div>
      )}
      {user.role === "seeker" && (
        <form onSubmit={initiatePayment} className="grid-form">
          <select value={paymentForm.booking_id} onChange={(e) => setPaymentForm({ ...paymentForm, booking_id: e.target.value })} required>
            <option value="">Select booking</option>
            {payableBookings.map((b) => <option key={b.id} value={b.id}>#{b.id} - {b.service_title}</option>)}
          </select>
          <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
            <option value="mpesa">M-Pesa</option>
            <option value="airtel">Airtel Money</option>
            <option value="tigo">Tigo Pesa</option>
            <option value="card">Card</option>
          </select>
          <input placeholder="Payer phone" value={paymentForm.phone} onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })} required />
          <button className={`btn btn-primary ${submittedForms.payment ? "btn-success" : ""}`} type="submit" disabled={!payableBookings.length}>{submittedForms.payment ? t("Submitted") : t("Initiate Payment")}</button>
        </form>
      )}
      {user.role === "seeker" && !payableBookings.length && (
        <p className="empty-state">All your current bookings already have active/completed payments. Repayment is blocked.</p>
      )}
      <ul className="card-list">
        {paymentsPageData.items.map((payment) => (
          <li key={payment.id} className="card-item">
            <div>
              <strong>Booking #{payment.booking}</strong>
              <p className={`status-text status-text--${String(payment.status).replace(" ", "-")}`}>{payment.method} | {payment.status}</p>
              <small>
                Total: {money(payment.total_amount || payment.amount)} | Admin commission: {money(payment.admin_commission || payment.platform_commission || 0)} | Provider earning: {money(payment.provider_earning || payment.provider_payout_amount || 0)}
              </small>
            </div>
            <div className="inline-actions">
              <span>{money(payment.amount)}</span>
              {payment.status === "pending" && (
                <IconActionButton
                  icon={actionDone[`verify-${payment.id}`] ? "check_circle" : "verified"}
                  label={actionDone[`verify-${payment.id}`] ? t("Verified") : t("Verify payment")}
                  variant="warning"
                  disabled={actionLoading[`verify-${payment.id}`]}
                  onClick={() => runTrackedAction(`verify-${payment.id}`, async () => { await api.verifyPayment(payment.transaction_reference); fetchCore(); })}
                />
              )}
              {payment.status === "held" && (
                <IconActionButton
                  icon={actionDone[`release-${payment.id}`] ? "check_circle" : "account_balance_wallet"}
                  label={actionDone[`release-${payment.id}`] ? t("Released") : t("Release payment")}
                  variant="success"
                  disabled={actionLoading[`release-${payment.id}`]}
                  onClick={() => setPendingReleasePayment(payment)}
                />
              )}
              {payment.status === "released" && (
                <IconActionButton
                  icon={actionDone[`receipt-${payment.id}`] ? "check_circle" : "receipt_long"}
                  label={actionDone[`receipt-${payment.id}`] ? t("Generated") : t("Generate receipt")}
                  variant="primary"
                  disabled={actionLoading[`receipt-${payment.id}`]}
                  onClick={() => runTrackedAction(`receipt-${payment.id}`, () => generateReceipt(payment.id))}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      {renderListPagination("payments", paymentsPageData)}
      <div className="panel-section">
        <button className="btn btn-ghost" onClick={onViewReceipts}>{t("View Receipts")}</button>
      </div>

      <ConfirmActionModal
        open={Boolean(pendingReleasePayment)}
        title={t("Release Payment")}
        message={pendingReleasePayment ? `${t("Release held payment for booking")} #${pendingReleasePayment.booking}?` : ""}
        confirmLabel={t("Release")}
        cancelLabel={t("Cancel")}
        confirmClassName="action-btn action-btn--success"
        loading={pendingReleasePayment ? actionLoading[`release-${pendingReleasePayment.id}`] : false}
        onCancel={() => setPendingReleasePayment(null)}
        onConfirm={async () => {
          if (!pendingReleasePayment) return;
          const ok = await runTrackedAction(`release-${pendingReleasePayment.id}`, async () => {
            await api.releasePayment(pendingReleasePayment.id);
            fetchCore();
          });
          if (ok) {
            setPendingReleasePayment(null);
          }
        }}
      />
    </article>
  );
}
