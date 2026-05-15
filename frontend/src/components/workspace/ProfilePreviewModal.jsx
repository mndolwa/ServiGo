import React from "react";

export default function ProfilePreviewModal({ user, currentUser, onClose, t }) {
  if (!user) return null;

  const isAdmin = currentUser && currentUser.role === "admin";
  const isSelf = currentUser && currentUser.id === user.id;

  // Determine what to show based on user role and permissions
  const showFullProfile = isAdmin || isSelf;
  const showLimitedProfile = !showFullProfile;

  const handleViewDocument = (docUrl) => {
    if (docUrl) {
      window.open(docUrl, "_blank");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card profile-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Profile Header */}
        <div className="profile-header">
          {user.profile_image_url && (
            <img src={user.profile_image_url} alt={user.first_name} className="profile-avatar" />
          )}
          <div className="profile-info">
            <h3>
              {user.first_name} {user.last_name}
            </h3>
            <p style={{ fontSize: 14, color: "var(--navy)", fontWeight: 700, textTransform: "capitalize" }}>
              {user.role.replace("_", " ")}
            </p>
            {user.role === "provider" && (
              <p>
                {t("Rating")}: {user.provider_profile?.rating_avg || 0} ⭐
              </p>
            )}
            <p>{user.location || t("Location not specified")}</p>
            <p>{user.phone || t("No phone number")}</p>
          </div>
        </div>

        {/* Limited Profile Info (visible to non-admin users) */}
        {showLimitedProfile && (
          <div className="preview-section">
            <p style={{ color: "var(--muted)", fontSize: 13 }}>
              {t("Only basic profile information is visible for privacy.")}
            </p>
          </div>
        )}

        {/* Provider Information */}
        {user.provider_profile && (showFullProfile || showLimitedProfile) && (
          <div className="preview-section">
            <h4 style={{ color: "var(--navy)", marginBottom: 10 }}>{t("Service Information")}</h4>
            <div style={{ background: "var(--surface-1)", padding: 12, borderRadius: 8 }}>
              <p style={{ margin: "6px 0" }}>
                <strong>{t("Service Type")}:</strong> {user.provider_profile.service_type || t("Not specified")}
              </p>
              <p style={{ margin: "6px 0" }}>
                <strong>{t("Bio")}:</strong> {user.provider_profile.bio || t("No bio provided")}
              </p>
              <p style={{ margin: "6px 0" }}>
                <strong>{t("Status")}:</strong>{" "}
                <span
                  style={{
                    background: user.provider_profile.is_online ? "#dcf4e8" : "#f0e8f0",
                    color: user.provider_profile.is_online ? "#125438" : "#5c3a91",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  {user.provider_profile.is_online ? t("Online") : t("Offline")}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Admin-Only Details */}
        {isAdmin && (
          <>
            <div className="admin-documents-section">
              <h4>{t("Personal Information")}</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "var(--muted)" }}>
                    {t("Email")}
                  </p>
                  <p style={{ margin: 0, color: "var(--navy)", fontWeight: 700 }}>{user.email}</p>
                </div>
                {user.national_id_number && (
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "var(--muted)" }}>
                      {t("NIN")}
                    </p>
                    <p style={{ margin: 0, color: "var(--navy)" }}>{user.national_id_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Documents */}
            {user.role === "provider" && user.provider_profile && (
              <div className="admin-documents-section">
                <h4>{t("Provider Documents")}</h4>
                <div className="document-list">
                  {user.provider_profile.service_certificate_url && (
                    <div className="document-item">
                      <span className="document-item-name">{t("Service Certificate")}</span>
                      <span></span>
                      <div className="document-item-action">
                        <button
                          onClick={() => handleViewDocument(user.provider_profile.service_certificate_url)}
                          className="btn btn-ghost"
                        >
                          {t("View")}
                        </button>
                      </div>
                    </div>
                  )}
                  {user.provider_profile.birth_certificate_url && (
                    <div className="document-item">
                      <span className="document-item-name">{t("Birth Certificate")}</span>
                      <span></span>
                      <div className="document-item-action">
                        <button
                          onClick={() => handleViewDocument(user.provider_profile.birth_certificate_url)}
                          className="btn btn-ghost"
                        >
                          {t("View")}
                        </button>
                      </div>
                    </div>
                  )}
                  {user.provider_profile.cv_document_url && (
                    <div className="document-item">
                      <span className="document-item-name">{t("CV")}</span>
                      <span></span>
                      <div className="document-item-action">
                        <button
                          onClick={() => handleViewDocument(user.provider_profile.cv_document_url)}
                          className="btn btn-ghost"
                        >
                          {t("View")}
                        </button>
                      </div>
                    </div>
                  )}
                  {!user.provider_profile.service_certificate_url &&
                    !user.provider_profile.birth_certificate_url &&
                    !user.provider_profile.cv_document_url && (
                      <p style={{ color: "var(--muted)", fontSize: 12 }}>{t("No documents uploaded yet")}</p>
                    )}
                </div>
              </div>
            )}

            {/* NIN Document */}
            {user.nin_document_url && (
              <div className="admin-documents-section">
                <h4>{t("NIN Document")}</h4>
                <button
                  onClick={() => handleViewDocument(user.nin_document_url)}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  {t("View NIN Document")}
                </button>
              </div>
            )}
          </>
        )}

        {/* Close Button */}
        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} className="btn btn-ghost">
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
