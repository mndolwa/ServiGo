export default function ReviewsPanel({
  t,
  user,
  submitReview,
  reviewForm,
  setReviewForm,
  bookings,
  rateTargets,
  submittedForms,
  reviewsPageData,
  renderListPagination,
}) {
  const titleByRole = {
    seeker: t("Reviews"),
    provider: t("Ratings"),
    admin: t("Reviews & Ratings"),
  };

  return (
    <article className="panel">
      <h3>{titleByRole[user.role] || t("Reviews")}</h3>
      <form className="grid-form" onSubmit={submitReview}>
        {user.role === "seeker" ? (
          <select value={reviewForm.booking} onChange={(e) => setReviewForm({ ...reviewForm, booking: e.target.value })} required>
            <option value="">Completed booking</option>
            {bookings.filter((b) => b.status === "completed").map((b) => <option key={b.id} value={b.id}>#{b.id} - {b.service_title}</option>)}
          </select>
        ) : user.role === "provider" ? (
          <select value={reviewForm.to_user} onChange={(e) => setReviewForm({ ...reviewForm, to_user: e.target.value })} required>
            <option value="">Select seeker</option>
            {rateTargets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
          </select>
        ) : (
          <select value={reviewForm.to_user} onChange={(e) => setReviewForm({ ...reviewForm, to_user: e.target.value })} required>
            <option value="">Select user</option>
            {rateTargets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
          </select>
        )}
        <input type="number" min="1" max="5" value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} />
        <textarea placeholder={user.role === "seeker" ? "Comment" : "Review"} value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} />
        <button className={`btn btn-primary ${submittedForms.review ? "btn-success" : ""}`} type="submit">{submittedForms.review ? t("Submitted") : t("Submit Review")}</button>
      </form>
      <ul className="card-list">
        {reviewsPageData.items.map((r) => (
          <li key={r.id} className="card-item">
            <div>
              <strong>{r.__entry_type === "rating" ? `${r.rating}/5 rating` : `${r.rating}/5 review`}</strong>
              <p>{r.__entry_type === "rating" ? `${r.from_user_name || "User"} → ${r.to_user_name || "User"}: ${r.review || "No comment"}` : r.comment || r.review}</p>
            </div>
          </li>
        ))}
      </ul>
      {renderListPagination("reviews", reviewsPageData)}
    </article>
  );
}
