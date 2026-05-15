export default function BookingDetailsPanel({
  selectedService,
  money,
  user,
  createBooking,
  bookingForm,
  setBookingForm,
  submittedForms,
  t,
}) {
  return (
    <article className="panel full">
      <h3>{selectedService.title}</h3>
      <p>{selectedService.description}</p>
      <p>
        {selectedService.provider_name} | {selectedService.provider_location} | Rating {selectedService.provider_rating || 0}
      </p>
      <p>{money(selectedService.price)} • {selectedService.duration_minutes} min</p>
      {user.role === "seeker" && (
        <form className="grid-form" onSubmit={createBooking}>
          <input type="datetime-local" value={bookingForm.scheduled_at} onChange={(e) => setBookingForm({ ...bookingForm, service: String(selectedService.id), scheduled_at: e.target.value })} required />
          <input
            type="number"
            min="30"
            max="3600"
            value={bookingForm.response_timeout_seconds || 300}
            onChange={(e) => setBookingForm({ ...bookingForm, service: String(selectedService.id), response_timeout_seconds: Number(e.target.value || 300) })}
            placeholder="Provider response timeout (seconds, default 300)"
          />
          <textarea placeholder="Notes" value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, service: String(selectedService.id), notes: e.target.value })} />
          <button className={`btn btn-primary ${submittedForms.booking ? "btn-success" : ""}`} type="submit">{submittedForms.booking ? t("Submitted") : t("Book This Service")}</button>
        </form>
      )}
    </article>
  );
}
