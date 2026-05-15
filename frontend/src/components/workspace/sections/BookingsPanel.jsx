import { useState } from "react";
import ConfirmActionModal from "../../common/ConfirmActionModal";
import IconActionButton from "../../common/IconActionButton";

export default function BookingsPanel({
  t,
  user,
  section,
  createBooking,
  bookingForm,
  setBookingForm,
  filteredServices,
  submittedForms,
  bookingsPageData,
  money,
  actionDone,
  actionLoading,
  runTrackedAction,
  cancelBooking,
  updateBookingStatus,
  providerOptions,
  redirectTargets,
  setRedirectTargets,
  redirectBooking,
  renderListPagination,
}) {
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const sectionTitleByKey = {
    IncomingRequests: t("Incoming Requests"),
    AcceptedJobs: t("Accepted Jobs"),
    CompletedJobs: t("Completed Jobs"),
    UpdateBookingStatus: t("Update Booking Status"),
    BookingsList: t("Bookings"),
  };

  return (
    <article className="panel">
      <h3>{sectionTitleByKey[section] || t("Bookings")}</h3>
      {user.role === "seeker" && (
        <form className="grid-form" onSubmit={createBooking}>
          <select value={bookingForm.service} onChange={(e) => setBookingForm({ ...bookingForm, service: e.target.value })} required>
            <option value="">Select service</option>
            {filteredServices.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <input type="datetime-local" value={bookingForm.scheduled_at} onChange={(e) => setBookingForm({ ...bookingForm, scheduled_at: e.target.value })} required />
          <input
            type="number"
            min="30"
            max="3600"
            value={bookingForm.response_timeout_seconds || 300}
            onChange={(e) => setBookingForm({ ...bookingForm, response_timeout_seconds: Number(e.target.value || 300) })}
            placeholder="Provider response timeout (seconds, default 300)"
          />
          <textarea placeholder="Notes" value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })} />
          <button className={`btn btn-primary ${submittedForms.booking ? "btn-success" : ""}`} type="submit">{submittedForms.booking ? t("Submitted") : t("Create Booking")}</button>
        </form>
      )}
      <ul className="card-list">
        {bookingsPageData.items.map((booking) => (
          <li key={booking.id} className="card-item">
            <div>
              <strong>#{booking.id} - {booking.service_title}</strong>
              <p>{booking.status} | {booking.scheduled_at} | Assigned to {booking.assigned_provider_name || booking.provider_name}</p>
              <small>
                {booking.accepted_at ? `Accepted: ${new Date(booking.accepted_at).toLocaleString()} | ` : ""}
                {booking.arrived_at ? `Arrived: ${new Date(booking.arrived_at).toLocaleString()} | ` : ""}
                {booking.in_progress_at ? `In progress: ${new Date(booking.in_progress_at).toLocaleString()} | ` : ""}
                {booking.completed_at ? `Completed: ${new Date(booking.completed_at).toLocaleString()} | ` : ""}
                {booking.paid_at ? `Paid: ${new Date(booking.paid_at).toLocaleString()}` : ""}
              </small>
            </div>
            <div className="inline-actions">
              <span>{money(booking.total_amount)}</span>
              {user.role === "seeker" && (booking.status === "pending" || booking.status === "accepted" || booking.status === "arrived" || booking.status === "in_progress") && (
                <IconActionButton
                  icon={booking.status === "cancelled" || actionDone[`cancel-${booking.id}`] ? "check_circle" : "cancel"}
                  label={booking.status === "cancelled" || actionDone[`cancel-${booking.id}`] ? t("Cancelled") : (booking.status === "pending" ? t("Cancel booking") : t("Request cancel"))}
                  variant="danger"
                  disabled={booking.status === "cancelled" || actionLoading[`cancel-${booking.id}`]}
                  onClick={() => setPendingConfirm({
                    key: `cancel-${booking.id}`,
                    title: t("Cancel Booking"),
                    message: `${t("Cancel booking")} #${booking.id}? ${t("This action cannot be undone.")}`,
                    confirmLabel: t("Cancel Booking"),
                    confirmClassName: "action-btn action-btn--danger",
                    execute: () => cancelBooking(booking.id),
                  })}
                />
              )}
              {(user.role === "provider" || user.role === "admin") && (
                <>
                  {(() => {
                    const acceptedOrBeyond = ["accepted", "arrived", "in_progress", "completed", "paid"].includes(booking.status);
                    return (
                  <IconActionButton
                    icon={acceptedOrBeyond || actionDone[`accept-${booking.id}`] ? "check_circle" : "task_alt"}
                    label={acceptedOrBeyond || actionDone[`accept-${booking.id}`] ? t("Accepted") : t("Accept booking")}
                    variant="success"
                    disabled={booking.status !== "pending" || actionLoading[`accept-${booking.id}`]}
                    onClick={() => runTrackedAction(`accept-${booking.id}`, () => updateBookingStatus(booking.id, "accepted"))}
                  />
                    );
                  })()}
                  <IconActionButton
                    icon={booking.status === "arrived" || booking.status === "in_progress" || booking.status === "completed" || actionDone[`arrived-${booking.id}`] ? "check_circle" : "pin_drop"}
                    label={booking.status === "arrived" || booking.status === "in_progress" || booking.status === "completed" || actionDone[`arrived-${booking.id}`] ? t("Arrived") : t("Mark arrived")}
                    variant="warning"
                    disabled={booking.status !== "accepted" || actionLoading[`arrived-${booking.id}`]}
                    onClick={() => runTrackedAction(`arrived-${booking.id}`, () => updateBookingStatus(booking.id, "arrived"))}
                  />
                  <IconActionButton
                    icon={booking.status === "in_progress" || booking.status === "completed" || actionDone[`progress-${booking.id}`] ? "check_circle" : "build"}
                    label={booking.status === "in_progress" || booking.status === "completed" || actionDone[`progress-${booking.id}`] ? t("In progress") : t("Start job")}
                    variant="primary"
                    disabled={!(["accepted", "arrived"].includes(booking.status)) || actionLoading[`progress-${booking.id}`]}
                    onClick={() => runTrackedAction(`progress-${booking.id}`, () => updateBookingStatus(booking.id, "in_progress"))}
                  />
                  <IconActionButton
                    icon={booking.status === "completed" || actionDone[`complete-${booking.id}`] ? "check_circle" : "done_all"}
                    label={booking.status === "completed" || actionDone[`complete-${booking.id}`] ? t("Completed") : t("Mark completed")}
                    variant="primary"
                    disabled={!(["arrived", "in_progress"].includes(booking.status)) || actionLoading[`complete-${booking.id}`]}
                    onClick={() => setPendingConfirm({
                      key: `complete-${booking.id}`,
                      title: t("Complete Booking"),
                      message: `${t("Mark booking")} #${booking.id} ${t("as completed?")}`,
                      confirmLabel: t("Complete"),
                      confirmClassName: "action-btn action-btn--primary",
                      execute: () => updateBookingStatus(booking.id, "completed"),
                    })}
                  />
                </>
              )}
              {(user.role === "provider" || user.role === "admin") && providerOptions.length > 0 && (
                <div className="redirect-box">
                  <select value={redirectTargets[booking.id] || ""} onChange={(e) => setRedirectTargets((prev) => ({ ...prev, [booking.id]: e.target.value }))}>
                    <option value="">Redirect to provider</option>
                    {providerOptions.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.first_name || provider.email} {provider.location ? `• ${provider.location}` : ""}
                      </option>
                    ))}
                  </select>
                  <IconActionButton
                    icon={actionDone[`redirect-${booking.id}`] ? "check_circle" : "forward"}
                    label={actionDone[`redirect-${booking.id}`] ? t("Redirected") : t("Redirect booking")}
                    variant="warning"
                    disabled={actionLoading[`redirect-${booking.id}`] || !redirectTargets[booking.id]}
                    onClick={() => setPendingConfirm({
                      key: `redirect-${booking.id}`,
                      title: t("Redirect Booking"),
                      message: `${t("Redirect booking")} #${booking.id}? ${t("The seeker and providers will be notified.")}`,
                      confirmLabel: t("Redirect"),
                      confirmClassName: "action-btn action-btn--warning",
                      execute: () => redirectBooking(booking.id),
                    })}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {renderListPagination("bookings", bookingsPageData)}

      <ConfirmActionModal
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title || t("Confirm Action")}
        message={pendingConfirm?.message || ""}
        confirmLabel={pendingConfirm?.confirmLabel || t("Confirm")}
        cancelLabel={t("Cancel")}
        confirmClassName={pendingConfirm?.confirmClassName || "action-btn action-btn--primary"}
        loading={pendingConfirm ? actionLoading[pendingConfirm.key] : false}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={async () => {
          if (!pendingConfirm) return;
          const ok = await runTrackedAction(pendingConfirm.key, pendingConfirm.execute);
          if (ok) {
            setPendingConfirm(null);
          }
        }}
      />
    </article>
  );
}
