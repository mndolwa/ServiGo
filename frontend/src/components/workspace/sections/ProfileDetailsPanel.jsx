export default function ProfileDetailsPanel({ t, user }) {
  return (
    <article className="panel full profile-panel">
      <h3>{t("Profile Details")}</h3>
      <p className="profile-subtitle">Your account information is shown below and available across your workspace modules.</p>
      <div className="profile-grid">
        <div className="profile-item"><span>Full name</span><strong>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Not provided"}</strong></div>
        <div className="profile-item"><span>Email</span><strong>{user.email || "Not provided"}</strong></div>
        <div className="profile-item"><span>Phone</span><strong>{user.phone || "Not provided"}</strong></div>
        <div className="profile-item"><span>Location</span><strong>{user.location || "Not provided"}</strong></div>
        <div className="profile-item"><span>Role</span><strong>{String(user.role || "").replace("_", " ")}</strong></div>
        <div className="profile-item"><span>User ID</span><strong>{user.id}</strong></div>
      </div>
    </article>
  );
}
